import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import { ListRow } from './ListRow'
import { SetTicks } from './SetTicks'
import { SaveFailedAlert } from './SaveFailedAlert'
import { TabBar } from './TabBar'
import { cssOf } from './testCss'

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

  it('becomes a button when given an onClick', () => {
    const html = renderToStaticMarkup(createElement(ListRow, { title: 'A', onClick: () => {} }))
    expect(html).toMatch(/^<button type="button"/)
    const plain = renderToStaticMarkup(createElement(ListRow, { title: 'A' }))
    expect(plain).toMatch(/^<div/)
  })

  it('shows a number column that stays out of the accessible name', () => {
    const html = renderToStaticMarkup(createElement(ListRow, { number: 2, title: 'Row', onClick: () => {} }))
    expect(html).toContain('<span class="list-row__number" aria-hidden="true">2</span>')
    expect(renderToStaticMarkup(createElement(ListRow, { title: 'Row' }))).not.toContain('list-row__number')
  })

  it('is taller when it has a subtitle or is the current row', () => {
    const tall = (props: object) =>
      renderToStaticMarkup(createElement(ListRow, { title: 'A', ...props })).includes(
        'list-row--tall',
      )
    expect(tall({ subtitle: 'b' })).toBe(true)
    expect(tall({ current: true })).toBe(true)
    expect(tall({})).toBe(false)
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
    expect(bar).toMatch(/\.tab-bar\s*{[^}]*border-top: var\(--border-hairline\)/)
    expect(bar).toMatch(/aria-current='page'\]\s*{[^}]*border-top: var\(--border-tab-active\)/)
    expect(bar).toContain(':focus-visible')
  })
})

describe('SaveFailedAlert', () => {
  const html = renderToStaticMarkup(createElement(SaveFailedAlert, null, 'Your sets are still on this screen.'))

  it('is announced as an alert with a title and the explanation', () => {
    expect(html).toContain('role="alert"')
    expect(html).toContain('Not saved')
    expect(html).toContain('Your sets are still on this screen.')
  })

  it('marks the danger with an icon and an outline, never colour alone', () => {
    expect(html).toContain('<svg')
    expect(cssOf('SaveFailedAlert')).toMatch(/\.save-failed\s*{[^}]*border: 2px solid var\(--color-danger\)/)
  })
})
