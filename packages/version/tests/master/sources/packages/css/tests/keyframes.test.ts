/**
 * @jest-environment node
 */

import puppeteer, { Browser, ElementHandle, Page } from 'puppeteer-core'
import path from 'path'
import type { MasterCSS } from '../src'

let browser: Browser
let page: Page

beforeAll(async () => {
    browser = await puppeteer.launch({ headless: 'new', channel: 'chrome' })
    page = await browser.newPage()
    await page.evaluate(() => window['masterCSSConfig'] = { animations: { fade: {} } })
    await page.addScriptTag({ path: require.resolve(path.join(__dirname, '../dist/index.browser.bundle.js')) })
    await page.waitForNetworkIdle()
}, 30000)

it('make sure not to extend animations deeply', async () => {
    const fade = await page.evaluate(() => window.MasterCSS.root.config.animations?.fade)
    expect(fade).toEqual({})
}, 30000)

it('expects the animation output', async () => {
    const cssText = await page.evaluate(async () => {
        window.MasterCSS.root.refresh({})
        const p = document.createElement('p')
        p.id = 'mp'
        p.classList.add('@fade|1s')
        document.body.append(p)
        // eslint-disable-next-line @typescript-eslint/no-empty-function
        await new Promise(resolve => setTimeout(resolve, 0))
        return window.MasterCSS.root.text
    })
    expect(cssText).toContain('.\\@fade\\|1s{animation:fade 1s}')
}, 30000)

let p: ElementHandle<Element>

it('expects the keyframe output', async () => {
    p = await page.$('#mp') as any
    const cssText = await page.evaluate(async (p) => {
        p?.classList.add(
            '@flash|1s',
            '@float|1s',
            '@heart|1s',
            '@jump|1s',
            '@ping|1s',
            '@pulse|1s',
            '@rotate|1s',
            '@shake|1s',
            '@zoom|1s',
            '{@zoom|1s;f:16}'
        )
        // eslint-disable-next-line @typescript-eslint/no-empty-function
        await new Promise(resolve => setTimeout(resolve, 0))
        return window.MasterCSS.root.text
    }, p)
    expect(cssText).toContain('@keyframes fade{0%{opacity:0}to{opacity:1}}')
    expect(cssText).toContain('@keyframes flash{0%,50%,to{opacity:1}25%,75%{opacity:0}}')
    expect(cssText).toContain('@keyframes float{0%{transform:none}50%{transform:translateY(-1.25rem)}to{transform:none}}')
    expect(cssText).toContain('@keyframes heart{0%{transform:scale(1)}14%{transform:scale(1.3)}28%{transform:scale(1)}42%{transform:scale(1.3)}70%{transform:scale(1)}}')
    expect(cssText).toContain('@keyframes jump{0%,to{transform:translateY(-25%);animation-timing-function:cubic-bezier(.8,0,1,1)}50%{transform:translateY(0);animation-timing-function:cubic-bezier(0,0,.2,1)}}')
    expect(cssText).toContain('@keyframes ping{75%,to{transform:scale(2);opacity:0}}')
    expect(cssText).toContain('@keyframes pulse{0%{transform:none}50%{transform:scale(1.05)}to{transform:none}}')
    expect(cssText).toContain('@keyframes rotate{0%{transform:rotate(-360deg)}to{transform:none}}')
    expect(cssText).toContain('@keyframes shake{0%{transform:none}6.5%{transform:translateX(-6px) rotateY(-9deg)}18.5%{transform:translateX(5px) rotateY(7deg)}31.5%{transform:translateX(-3px) rotateY(-5deg)}43.5%{transform:translateX(2px) rotateY(3deg)}50%{transform:none}}')
    expect(cssText).toContain('@keyframes zoom{0%{transform:scale(0)}to{transform:none}}')
    expect(cssText).toContain('@keyframes zoom{0%{transform:scale(0)}to{transform:none}}')
}, 30000)

it('animations', async () => {
    await page.evaluate((p) => p.className = 'block font:bold', p)

    const countByKeyframeName = {}
    const configKeyframeNames = await page.evaluate(() => Object.keys(window.MasterCSS.root.animations || {}))
    const checkKeyframeCSSRule = async () => {
        const [ruleKeyframes, keyframeRuleNatives, hasKeyframeRule] = await page.evaluate(() => [
            window.MasterCSS.root.keyframesMap,
            window.MasterCSS.root.rules[0].natives,
            Object.keys(window.MasterCSS.root.rules[0]).length === 2
        ] as const)

        if (Object.keys(ruleKeyframes).length) {
            for (let i = 0; i < keyframeRuleNatives.length; i++) {
                const cssRule = await page.evaluate((i) => window.MasterCSS.root.style.sheet?.cssRules[i], i)
                expect(cssRule).toEqual(keyframeRuleNatives[i].cssRule)
            }

            expect(hasKeyframeRule).toBeTruthy()
        } else {
            expect(await page.evaluate(() => window.MasterCSS.root.style.sheet?.cssRules[0].constructor.name)).not.toEqual('CSSKeyframesRule')
            expect(hasKeyframeRule).toBeFalsy()
        }
    }
    const generateAnimation = async (className: string) => {
        await page.evaluate((className, p) =>
            p.classList.add(className),
            className,
            p
        )

        const animationClassNames = className.startsWith('{')
            ? className.slice(1, className.length - 1).split(';')
            : [className]
        const animationNames = animationClassNames
            .flatMap(eachAnimationClassName => (eachAnimationClassName.includes(':')
                ? eachAnimationClassName.split(':')[1]
                : eachAnimationClassName.slice(1)).split('|').filter(eachValue => configKeyframeNames.includes(eachValue)))
        const [ruleKeyframeNames, keyframesMap] = await page.evaluate((className) => [window.MasterCSS.root.ruleBy[className].animationNames, window.MasterCSS.root.keyframesMap] as const, className)

        expect(ruleKeyframeNames.length).toEqual(animationNames.length)
        expect(ruleKeyframeNames.every(eachKeyframeName => animationNames.includes(eachKeyframeName))).toBeTruthy()

        for (const eachKeyframeName of ruleKeyframeNames) {
            if (eachKeyframeName in countByKeyframeName) {
                countByKeyframeName[eachKeyframeName]++
            } else {
                countByKeyframeName[eachKeyframeName] = 1
            }

            expect(eachKeyframeName in keyframesMap).toBeTruthy()
            expect(keyframesMap[eachKeyframeName].count).toEqual(countByKeyframeName[eachKeyframeName])
        }

        await checkKeyframeCSSRule()
    }
    const deleteAnimation = async (className: string) => {
        const animationNames = await page.evaluate(
            (className, p) => {
                const animationNames = window.MasterCSS.root.ruleBy[className].animationNames
                p?.classList.remove(className)
                return animationNames
            },
            className,
            p
        )

        const keyframesMap = await page.evaluate(() => window.MasterCSS.root.keyframesMap)

        for (const eachKeyframeName of animationNames) {
            countByKeyframeName[eachKeyframeName]--

            const count = countByKeyframeName[eachKeyframeName]
            expect(eachKeyframeName in keyframesMap).toEqual(!!count)
            if (count) {
                expect(keyframesMap[eachKeyframeName].count).toEqual(count)
            }
        }

        await checkKeyframeCSSRule()
    }

    await generateAnimation('@fade|2s')
    await generateAnimation('{@name:flash;@name:fade}')

    await deleteAnimation('{@name:flash;@name:fade}')
    await deleteAnimation('@fade|2s')
}, 30000)

afterAll(async () => {
    await page.close()
    await browser.close()
}, 60000)