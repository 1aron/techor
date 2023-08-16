import type { Color, ColorPresentation } from 'vscode-languageserver-types'
import { MasterCSS } from '@master/css'
import { hexToRgb } from '../utils/hex-to-rgb'
import { instancePattern } from '../utils/regex'
import { rgbToHsl } from '../utils/rgb-to-hsl'
import { hslToRgb } from '../utils/hsl-to-rgb'
import { toTwoDigitHex } from '../utils/to-two-digit-hex'

export async function getDocumentColors(text: string, css: MasterCSS = new MasterCSS()
): Promise<any[]> {
    const colors: any[] = []

    let instanceMatch: RegExpExecArray | null
    while ((instanceMatch = instancePattern.exec(text)) !== null) {
        const instanceStartIndex = instanceMatch.index
        const theme = css.themeNames.find(x => instanceMatch?.[0]?.endsWith(`@${x}`)) ?? ''

        const colorPattern = /(?<=[|:\s"'`]|^)(?:#?\w+(?:-[\d]{1,2})?(?:\/.?[\d]*)?(?:\([^\s)]+\))?(?![:]))/g
        let colorMatch: RegExpExecArray | null

        //check color
        while ((colorMatch = colorPattern.exec(instanceMatch[0])) !== null) {
            const colorValue = parseColorString(colorMatch[0], theme, css)
            if (colorValue) {
                const colorIndex: any = {
                    index: {
                        start: instanceStartIndex + colorMatch.index,
                        end: instanceStartIndex + colorMatch.index + colorMatch[0].length
                    },
                    color: colorValue
                }
                colors.push(colorIndex)
            }
        }
    }


    return colors
}

function parseColorString(colorString: string, theme: string, css: MasterCSS = new MasterCSS()) {
    const rgbaColorPattern = /rgb(?:a?)\(([\d.]+)[,|]([\d.]+)[,|]([\d.]+)(?:[,/]([\d.]+))?\)/g
    const hslaColorPattern = /hsla?\(([\d.]+)[,|]([\d.]+)%[,|]([\d.]+)%(?:[,/]([\d.]+))?\)/g
    const hexColorPattern = /#([0-9a-fA-F]{6,8})/g

    let colorMatch2: RegExpExecArray | null
    //#region  for rgb、hls
    if ((colorMatch2 = rgbaColorPattern.exec(colorString))) {
        return getColorValue({ red: Number(colorMatch2[1]), green: Number(colorMatch2[2]), blue: Number(colorMatch2[3]), alpha: colorMatch2[4] == undefined ? 1 : Number(colorMatch2[4]) })
    }
    else if ((colorMatch2 = hslaColorPattern.exec(colorString))) {
        return getColorValue(hslToRgb(Number(colorMatch2[1]), Number(colorMatch2[2]), Number(colorMatch2[3]), colorMatch2[4] == undefined ? 1 : Number(colorMatch2[4])))
    }
    else if ((colorMatch2 = hexColorPattern.exec(colorString))) {
        return getColorValue(hexToRgb(colorMatch2[1]))
    }
    //#endregion for rgb、hls

    //#region for mastercss color
    let colorAlpha = 1
    let colorName = colorString
    const allMasterCssColorKeys = Object.keys(css.colorThemesMap)
    if (colorString.split('/').length == 2) {
        colorAlpha = Number('0' + colorString.split('/')[1])
    }

    if (colorString.split('-').length == 1) { //:black  black/.5 
        colorName = colorString.split('/')[0]
        colorName = colorName.endsWith('_') ? colorName.replace('_', '') : colorName
    }

    if (allMasterCssColorKeys.find(x => x == colorName)) {
        return getColorsRGBA(colorName, colorAlpha, theme, css)
    }
    //#endregion  for mastercss color
}

function getColorsRGBA(colorName: string, colorAlpha = 1, theme = '', css: MasterCSS = new MasterCSS()): Color {
    try {
        const colorNumberMap = css.colorThemesMap[colorName]
        const levelRgb = hexToRgb(colorNumberMap[theme] ?? colorNumberMap[''] ?? Object.values(colorNumberMap)[0])

        return { red: levelRgb.red / 255, green: levelRgb.green / 255, blue: levelRgb.blue / 255, alpha: colorAlpha }
    } catch (ex) {
        return { red: 0, green: 0, blue: 0, alpha: 1 }
    }
}


export function getColorValue(color: Color): Color {
    return { red: color.red / 255.0, green: color.green / 255.0, blue: color.blue / 255.0, alpha: color.alpha }
}

export function getColorPresentation(params: any, isColorRender = false) {
    const result: ColorPresentation[] = []
    const color = params.color
    const range = params.range


    const red256 = Math.round(color.red * 255), green256 = Math.round(color.green * 255), blue256 = Math.round(color.blue * 255)

    let label

    if (isColorRender) {
        if (color.alpha === 1) {
            label = `'#${toTwoDigitHex(red256)}${toTwoDigitHex(green256)}${toTwoDigitHex(blue256)}`
        } else {
            label = `'#${toTwoDigitHex(red256)}${toTwoDigitHex(green256)}${toTwoDigitHex(blue256)}${toTwoDigitHex(Math.round(color.alpha * 255))}`
        }
        result.push({ label: label, textEdit: { range: range, newText: label } })
        return result
    }

    if (color.alpha === 1) {
        label = `rgb(${red256},${green256},${blue256})`
    } else {
        label = `rgba(${red256},${green256},${blue256},${color.alpha})`
    }
    result.push({ label: label, textEdit: { range: range, newText: label } })

    if (color.alpha === 1) {
        label = `#${toTwoDigitHex(red256)}${toTwoDigitHex(green256)}${toTwoDigitHex(blue256)}`
    } else {
        label = `#${toTwoDigitHex(red256)}${toTwoDigitHex(green256)}${toTwoDigitHex(blue256)}${toTwoDigitHex(Math.round(color.alpha * 255))}`
    }
    result.push({ label: label, textEdit: { range: range, newText: label } })

    const hsl = rgbToHsl(color)
    if (hsl.a === 1) {
        label = `hsl(${hsl.h},${Math.round(hsl.s * 100)}%,${Math.round(hsl.l * 100)}%)`
    } else {
        label = `hsla(${hsl.h},${Math.round(hsl.s * 100)}%,${Math.round(hsl.l * 100)}%,${hsl.a})`
    }
    result.push({ label: label, textEdit: { range: range, newText: label } })

    return result
}