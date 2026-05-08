import { createElement } from 'react'
import { renderToStaticMarkup as render } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import { PillButton } from './PillButton'
import { PrimaryButton } from './PrimaryButton'
import { cssOf } from './testCss'

describe('PrimaryButton', () => {
  it('is a non-submitting button by default', () => {
    expect(render(createElement(PrimaryButton, null, 'Next'))).toContain('type="button"')
  })

  it('is light by default', () => {
    expect(render(createElement(PrimaryButton, null, 'Next'))).toContain('primary-button--light')
  })

  it.each(['dark', 'lime'] as const)('takes its colours from the %s tone', (tone) => {
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
  it.each(['lime', 'white', 'outline-white', 'outline-black', 'outline-danger'] as const)(
    'renders the %s variant',
    (variant) => {
      expect(render(createElement(PillButton, { variant }, 'Go'))).toContain(
        `pill-button--${variant}`,
      )
    },
  )

  it('can be a submit button when asked', () => {
    expect(render(createElement(PillButton, { type: 'submit' }, 'Save'))).toContain(
      'type="submit"',
    )
  })

  it('uses the real disabled attribute', () => {
    expect(render(createElement(PillButton, { disabled: true }, 'Go'))).toContain('disabled=""')
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
