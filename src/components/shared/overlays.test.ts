import { createElement } from 'react'
import { renderToStaticMarkup as render } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
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

  it('gives its Cancel a 44px hit area and a focus outline', () => {
    expect(css).toMatch(/\.sheet__cancel\s*{[^}]*min-height: var\(--size-control\)/)
    expect(css).toMatch(/\.sheet__cancel:focus-visible\s*{[^}]*outline: var\(--border-focus\)/)
  })
})
