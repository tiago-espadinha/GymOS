import { createElement } from 'react'
import { renderToStaticMarkup as render } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import { SheetHead, SheetRow } from './Sheet/frame'
import { Toast } from './Toast'
import { cssOf } from './testCss'

const noop = () => {}

describe('Toast', () => {
  const html = render(createElement(Toast, { message: 'Legs archived', actionLabel: 'Undo', onAction: noop, onDismiss: noop }))

  it('is a status live region with its message and one real button', () => {
    expect(html).toContain('role="status"')
    expect(html).toContain('Legs archived')
    expect(html).toContain('<button type="button" class="toast__action">Undo</button>')
  })

  it('is the white pill above the tab bar, with a 44px action', () => {
    const css = cssOf('Toast')
    expect(css).toContain('bottom: calc(var(--size-tabbar) + var(--space-4))')
    expect(css).toMatch(/\.toast\s*{[^}]*background: var\(--color-inverse\)/)
    expect(css).toMatch(/\.toast__action\s*{[^}]*min-height: var\(--size-control\)/)
  })
})

describe('Sheet', () => {
  const css = cssOf('Sheet')

  it('sits on the surface colour with the 16 top radius and no scrim or shadow', () => {
    expect(css).toMatch(/\.sheet\s*{[^}]*background: var\(--color-surface\)/)
    expect(css).toContain('border-radius: var(--radius-surface) var(--radius-surface) 0 0')
    expect(css).not.toMatch(/box-shadow|rgba|opacity/)
  })

  it('keeps a swipe inside it from scrolling the page behind', () => {
    expect(css).toMatch(/\.sheet\s*{[^}]*overscroll-behavior: contain/)
    expect(css).toMatch(/:root\.sheetOpen\s*{[^}]*overflow: hidden/)
  })

  it('gives its Cancel a 44px hit area and a focus outline', () => {
    expect(css).toMatch(/\.sheet__cancel\s*{[^}]*min-height: var\(--size-control\)/)
    expect(css).toMatch(/\.sheet__cancel:focus-visible\s*{[^}]*outline: var\(--border-focus\)/)
  })
})

describe('Sheet frame', () => {
  const css = cssOf('Sheet')

  it('names the sheet by its title, under a kicker', () => {
    const html = render(createElement(SheetHead, { titleId: 't', kicker: 'Plan', title: 'Push day', meta: '3 exercises', tone: 'accent' }))
    expect(html).toContain('sheet__head--accent')
    expect(html).toMatch(/Plan<\/span><h2 id="t" class="sheet__title">Push day<\/h2>/)
    expect(html).toContain('3 exercises')
  })

  it('draws rows edge to edge in display type, danger in the danger colour', () => {
    const html = render(createElement(SheetRow, { title: 'Delete session', hint: 'for good', tone: 'danger' }))
    expect(html).toContain('type="button"')
    expect(html).toContain('sheet__row--danger')
    expect(css).toMatch(/\.sheet__rows\s*{[^}]*margin: 0 calc\(-1 \* var\(--gutter\)\)/)
    expect(css).toMatch(/\.sheet__row\s*{[^}]*border-bottom: var\(--border-hairline\)/)
    expect(css).toMatch(/\.sheet__row\s*{[^}]*font-family: var\(--font-display\)/)
    expect(css).toMatch(/\.sheet__row--danger\s*{[^}]*color: var\(--color-danger\)/)
    expect(css).toMatch(/\.sheet__row:focus-visible\s*{[^}]*outline: var\(--border-focus\)/)
  })
})

describe('browser dialogs', () => {
  const sources = import.meta.glob<string>(['/src/**/*.{ts,tsx}', '!/src/**/*.test.{ts,tsx}'], {
    query: '?raw',
    import: 'default',
    eager: true,
  })

  it('are never used: confirms are ConfirmSheet, not confirm(), alert() or prompt()', () => {
    expect(Object.keys(sources).length).toBeGreaterThan(20)
    const offenders = Object.entries(sources)
      .filter(([, text]) => /\b(?:confirm|alert|prompt)\s*\(/.test(text))
      .map(([file]) => file)
    expect(offenders).toEqual([])
  })
})
