import { createElement } from 'react'
import { renderToStaticMarkup as render } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import { IconButton } from './IconButton'
import { PillButton } from './PillButton'
import { PrimaryButton } from './PrimaryButton'
import { SecondaryButton } from './SecondaryButton'
import { cssOf } from './testCss'

describe('PrimaryButton', () => {
  it('is a non-submitting button by default', () => {
    expect(render(createElement(PrimaryButton, null, 'Next'))).toContain('type="button"')
  })

  it('is light by default', () => {
    expect(render(createElement(PrimaryButton, null, 'Next'))).toContain('primary-button--light')
  })

  it.each(['dark', 'accent'] as const)('takes its colours from the %s tone', (tone) => {
    expect(render(createElement(PrimaryButton, { tone }, 'Go'))).toContain(
      `primary-button--${tone}`,
    )
    expect(cssOf('PrimaryButton')).toContain(`.primary-button--${tone}`)
  })

  it('uses the real disabled attribute', () => {
    expect(render(createElement(PrimaryButton, { disabled: true }, 'Next'))).toContain('disabled=""')
  })
})

describe('PillButton', () => {
  it.each(['accent', 'white', 'outline-white', 'outline-black', 'outline-danger'] as const)(
    'renders the %s variant',
    (variant) => {
      expect(render(createElement(PillButton, { variant }, 'Go'))).toContain(
        `pill-button--${variant}`,
      )
    },
  )

  it('is the compact role: display type at 24 on a 44px pill', () => {
    expect(cssOf('PillButton')).toMatch(/\.pill-button\s*{[^}]*font-family: var\(--font-display\)/)
    expect(cssOf('PillButton')).toMatch(/\.pill-button\s*{[^}]*font-size: var\(--text-button-compact\)/)
    expect(cssOf('PillButton')).not.toContain('--font-body')
  })

  it('can be a submit button when asked', () => {
    expect(render(createElement(PillButton, { type: 'submit' }, 'Save'))).toContain(
      'type="submit"',
    )
  })

  it('uses the real disabled attribute', () => {
    expect(render(createElement(PillButton, { disabled: true }, 'Go'))).toContain('disabled=""')
  })
})

describe('SecondaryButton', () => {
  it('is a non-submitting button in the default tone unless told otherwise', () => {
    const html = render(createElement(SecondaryButton, null, 'Add set'))
    expect(html).toContain('type="button"')
    expect(html).toContain('secondary-button--default')
  })

  it('has a danger tone that is outlined, never filled', () => {
    expect(render(createElement(SecondaryButton, { tone: 'danger' }, 'Delete'))).toContain('secondary-button--danger')
    expect(cssOf('SecondaryButton')).toMatch(/\.secondary-button--danger\s*{[^}]*color: var\(--color-danger\)/)
    expect(cssOf('SecondaryButton')).not.toMatch(/\.secondary-button--danger\s*{[^}]*background/)
  })

  it('is 64px tall in display type, with a focus outline and a disabled style', () => {
    const css = cssOf('SecondaryButton')
    expect(css).toContain('min-height: var(--size-action)')
    expect(css).toContain('font-family: var(--font-display)')
    expect(css).toMatch(/:focus-visible\s*{[^}]*outline: var\(--border-focus\)/)
    expect(css).toMatch(/:disabled\s*{[^}]*opacity: 0\.4/)
    expect(render(createElement(SecondaryButton, { disabled: true }, 'Go'))).toContain('disabled=""')
  })
})

describe('IconButton', () => {
  it('is a named, non-submitting button around a hidden icon', () => {
    const html = render(createElement(IconButton, { icon: 'more', 'aria-label': 'Session actions' }))
    expect(html).toContain('type="button"')
    expect(html).toContain('aria-label="Session actions"')
    expect(html).toContain('aria-hidden="true"')
    expect(html).toContain('icon-button--default')
  })

  it('is a 44 circle, or 72 beside a primary, with a grey outline and a focus ring', () => {
    const css = cssOf('IconButton')
    expect(css).toMatch(/\.icon-button\s*{[^}]*width: var\(--size-control\)/)
    expect(css).toMatch(/\.icon-button--large\s*{[^}]*width: var\(--size-action-primary\)/)
    expect(css).toMatch(/\.icon-button\s*{[^}]*border: var\(--border-chip\)/)
    expect(css).toMatch(/:focus-visible\s*{[^}]*outline: var\(--border-focus\)/)
    expect(css).toMatch(/:disabled\s*{[^}]*opacity: 0\.4/)
  })
})

describe('button sizing', () => {
  it('gives the pill the 44px control height', () => {
    expect(cssOf('PillButton')).toContain('min-height: var(--size-control)')
  })

  it('gives the primary button the 72px action height', () => {
    expect(cssOf('PrimaryButton')).toContain('min-height: var(--size-action-primary)')
  })

  it('shows a focus outline on both', () => {
    expect(cssOf('PillButton')).toMatch(/:focus-visible\s*{[^}]*outline: var\(--border-focus\)/)
    expect(cssOf('PrimaryButton')).toMatch(/:focus-visible\s*{[^}]*outline: var\(--border-focus\)/)
  })
})
