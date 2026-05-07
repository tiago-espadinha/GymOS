import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import { ListRow } from './ListRow'
import { SetTicks } from './SetTicks'
import { TabBar } from './TabBar'

const css = import.meta.glob<string>('./{ListRow,SetTicks,TabBar}/*.css', {
  query: '?raw',
  import: 'default',
  eager: true,
})
const cssOf = (name: string) =>
  Object.entries(css).find(([path]) => path.includes(`/${name}/`))?.[1] ?? ''

describe('SetTicks', () => {
  const html = renderToStaticMarkup(createElement(SetTicks, { total: 4, done: 3 }))

  it('draws one bar per set, filled for the ones done', () => {
    expect(html.match(/set-ticks__tick"/g)).toHaveLength(1)
    expect(html.match(/set-ticks__tick--done/g)).toHaveLength(3)
  })

  it('describes progress to assistive technology', () => {
    expect(html).toContain('aria-label="3 of 4 sets done"')
  })

  it('is 8 by 28 and distinguishes done from not done without colour alone', () => {
    const ticks = cssOf('SetTicks')
    expect(ticks).toContain('width: var(--size-tick-w)')
    expect(ticks).toContain('height: var(--size-tick-h)')
    expect(ticks).toMatch(/--done\s*{[^}]*background: currentColor/)
  })
})

describe('ListRow', () => {
  it('shows title, subtitle and trailing content', () => {
    const html = renderToStaticMarkup(
      createElement(ListRow, {
        title: 'Squat',
        subtitle: '4 sets',
        trailing: createElement('span', null, 'GO'),
      }),
    )
    expect(html).toContain('>Squat<')
    expect(html).toContain('>4 sets<')
    expect(html).toContain('>GO<')
  })

  it('marks the current row with aria-current as well as the inverted fill', () => {
    const current = renderToStaticMarkup(createElement(ListRow, { title: 'A', current: true }))
    expect(current).toContain('aria-current="true"')
    expect(current).toContain('list-row--current')
    const other = renderToStaticMarkup(createElement(ListRow, { title: 'A' }))
    expect(other).not.toContain('aria-current')
  })

  it('is taller when it has a subtitle', () => {
    expect(
      renderToStaticMarkup(createElement(ListRow, { title: 'A', subtitle: 'b' })),
    ).toContain('list-row--tall')
    expect(renderToStaticMarkup(createElement(ListRow, { title: 'A' }))).not.toContain(
      'list-row--tall',
    )
    expect(cssOf('ListRow')).toContain('min-height: var(--size-row-lg)')
  })
})

describe('TabBar', () => {
  const tabs = [
    { id: 'plans', label: 'Plans' },
    { id: 'log', label: 'Log' },
    { id: 'progress', label: 'Progress' },
  ]
  const html = renderToStaticMarkup(
    createElement(TabBar, { tabs, active: 'log', onChange: () => {} }),
  )

  it('renders the three tabs in a labelled nav', () => {
    expect(html).toContain('<nav aria-label="Main"')
    expect(html.match(/<button/g)).toHaveLength(3)
  })

  it('marks only the active tab as the current page', () => {
    expect(html.match(/aria-current="page"/g)).toHaveLength(1)
    expect(html).toMatch(/aria-current="page"[^>]*>Log</)
  })

  it('is 64px tall with a 4px lime top border on the active tab and a focus ring', () => {
    const bar = cssOf('TabBar')
    expect(bar).toContain('min-height: var(--size-tabbar)')
    expect(bar).toMatch(/aria-current='page'\]\s*{[^}]*border-top: var\(--border-tab-active\)/)
    expect(bar).toContain(':focus-visible')
  })
})
