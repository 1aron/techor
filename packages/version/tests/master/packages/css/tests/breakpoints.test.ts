import { testCSS } from './css'
import config from './config'

test('viewports', () => {
    testCSS(
        'hide@tablet',
        '@media (min-width:768px){.hide\\@tablet{display:none}}',
        config
    )
    testCSS(
        'hide@laptop',
        '@media (min-width:1024px){.hide\\@laptop{display:none}}',
        config
    )
    testCSS(
        'hide@desktop',
        '@media (min-width:1280px){.hide\\@desktop{display:none}}',
        config
    )
    testCSS(
        'hide@custom-1',
        '@media (min-width:2500px){.hide\\@custom-1{display:none}}',
        config
    )
})
