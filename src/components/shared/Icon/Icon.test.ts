import { createElement } from 'react'
import { renderToStaticMarkup as render } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import { Icon } from '.'
import { ICON_NAMES } from './paths'
import { cssOf } from '../testCss'

// Every component source, to check that icons come from the one set.
const sources = import.meta.glob<string>('/src/components/**/*.tsx', { query: '?raw', import: 'default', eager: true })
// Not icons: the brand mark, the set itself, and the chart's legend marks (drawn on a 14 box).
const OWN_SVG = ['/shared/BrandMark/', '/shared/Icon/']
const LEGEND_MARK = /<svg [^>]*viewBox="0 0 14 14"/g

describe('Icon', () => {
  it.each(ICON_NAMES)('draws %s on the 24 grid, decorative, with no weight or colour of its own', (name) => {
    const html = render(createElement(Icon, { name }))
    for (const attr of ['class="icon icon--sm"', 'viewBox="0 0 24 24"', 'aria-hidden="true"', 'focusable="false"']) expect(html).toContain(attr)
    expect(html).not.toMatch(/stroke-width|stroke=|fill="(?!none)|width=|height=/)
  })

  it('takes a size from the scale and keeps a caller class', () => {
    expect(render(createElement(Icon, { name: 'check', size: 'xl', className: 'x' }))).toContain('class="icon icon--xl x"')
  })

  it('strokes with one token width, round caps and joins, in the current colour', () => {
    const css = cssOf('Icon')
    const base = css.match(/\.icon\s*{([^}]*)}/)?.[1] ?? ''
    for (const rule of ['fill: none', 'stroke: currentColor', 'stroke-width: var(--stroke-icon)', 'stroke-linecap: round', 'stroke-linejoin: round']) {
      expect(base).toContain(rule)
    }
    for (const size of ['sm', 'md', 'lg', 'xl']) expect(css).toContain(`var(--size-icon-${size})`)
  })

  it('is the only icon drawing in the components', () => {
    const drawn = Object.entries(sources)
      .filter(([path]) => !path.includes('.test.') && !OWN_SVG.some((own) => path.includes(own)))
      .filter(([, text]) => text.replace(LEGEND_MARK, '').includes('<svg'))
      .map(([path]) => path)
    expect(drawn).toEqual([])
  })
})
