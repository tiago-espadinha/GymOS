import { createElement } from 'react'
import { renderToStaticMarkup as render } from 'react-dom/server'
import { describe, expect, it, vi } from 'vitest'
import { Select } from './Select'
import { Switch } from './Switch'
import { Toast } from './Toast'
import { cssOf } from './testCss'

const noop = () => {}

describe('Select', () => {
  const html = render(createElement(Select, { label: 'Muscle group', value: 'Legs', options: ['Chest', 'Legs'], onChange: noop }))

  it('is a button that announces a listbox and is named by its label and value', () => {
    expect(html).toContain('aria-haspopup="listbox"')
    expect(html).toContain('aria-expanded="false"')
    const [labelId, valueId] = /aria-labelledby="([^" ]+) ([^"]+)"/.exec(html)!.slice(1)
    expect(html).toContain(`id="${labelId}" class="select__label">Muscle group<`)
    expect(html).toContain(`id="${valueId}" class="select__value">Legs<`)
  })

  it('keeps its options closed until opened', () => {
    expect(html).not.toContain('role="listbox"')
  })

  it('is inset black with the nested radius, a 44px hit area and the lime focus border', () => {
    const css = cssOf('Select')
    expect(css).toMatch(/\.select__button\s*{[^}]*background: var\(--color-surface-inset\)/)
    expect(css).toMatch(/\.select__button\s*{[^}]*border-radius: var\(--radius-nested\)/)
    expect(css).toMatch(/\.select__button\s*{[^}]*min-height: var\(--size-control\)/)
    expect(css).toMatch(/\.select__button:focus-visible\s*{[^}]*border-color: var\(--color-accent\)/)
    expect(css).toMatch(/\.select__chevron\s*{[^}]*color: var\(--color-text-muted\)/)
  })
})

describe('Switch', () => {
  it('is a switch button whose state is aria-checked', () => {
    const on = render(createElement(Switch, { label: 'Track weight', description: 'Log kg with each set', checked: true, onChange: noop }))
    expect(on).toContain('role="switch"')
    expect(on).toContain('aria-checked="true"')
    expect(on).toContain('>Track weight<')
    expect(on).toContain('>Log kg with each set<')
    expect(render(createElement(Switch, { label: 'x', checked: false, onChange: noop }))).toContain('aria-checked="false"')
  })

  it('reports the opposite state when pressed', () => {
    const onChange = vi.fn()
    const el = Switch({ label: 'x', checked: true, onChange })
    el.props.onClick()
    expect(onChange).toHaveBeenCalledExactlyOnceWith(false)
  })

  it('turns lime when on and has a 44px+ row', () => {
    const css = cssOf('Switch')
    expect(css).toMatch(/\.switch\[aria-checked='true'\] \.switch__track\s*{[^}]*background: var\(--color-accent\)/)
    expect(css).toMatch(/\.switch\s*{[^}]*min-height: var\(--size-row-summary\)/)
  })
})

describe('Toast inline', () => {
  it('can sit in the flow of a sticky bar', () => {
    const html = render(createElement(Toast, { message: 'Exercise 2 removed', actionLabel: 'Undo', onAction: noop, onDismiss: noop, inline: true }))
    expect(html).toContain('class="toast toast--inline"')
    expect(cssOf('Toast')).toMatch(/\.toast--inline\s*{[^}]*position: static/)
  })
})
