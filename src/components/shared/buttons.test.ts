import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import { PillButton } from './PillButton'
import { PrimaryButton } from './PrimaryButton'

const css = import.meta.glob<string>('./{PrimaryButton,PillButton}/*.css', {
  query: '?raw',
  import: 'default',
  eager: true,
})

const render = (el: Parameters<typeof renderToStaticMarkup>[0]) => renderToStaticMarkup(el)

describe('PrimaryButton', () => {
  it('is a non-submitting button by default', () => {
    expect(render(createElement(PrimaryButton, null, 'Next'))).toContain('type="button"')
  })

  it('takes its colours from the tone', () => {
    expect(render(createElement(PrimaryButton, null, 'Next'))).toContain('primary-button--light')
    expect(render(createElement(PrimaryButton, { tone: 'dark' }, 'Skip'))).toContain(
      'primary-button--dark',
    )
  })

  it('uses the real disabled attribute', () => {
    expect(render(createElement(PrimaryButton, { disabled: true }, 'Next'))).toContain('disabled=""')
  })
})

describe('PillButton', () => {
  it.each(['lime', 'white', 'outline-white', 'outline-black'] as const)(
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
  const byName = (name: string) =>
    Object.entries(css).find(([path]) => path.includes(`/${name}/`))?.[1] ?? ''

  it('gives the pill the 44px control height', () => {
    expect(byName('PillButton')).toContain('min-height: var(--size-control)')
  })

  it('gives the primary button the 72px action height', () => {
    expect(byName('PrimaryButton')).toContain('min-height: var(--size-action-primary)')
  })

  it('shows a focus outline on both', () => {
    expect(byName('PillButton')).toContain(':focus-visible')
    expect(byName('PrimaryButton')).toContain(':focus-visible')
  })
})
