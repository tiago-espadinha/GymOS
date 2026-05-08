import { createElement } from 'react'
import type { ReactElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it, vi } from 'vitest'
import { ChipGroup } from './ChipGroup'
import { SegmentedControl } from './SegmentedControl'
import { cssOf } from './testCss'

const options = [
  { value: 'kg', label: 'KG' },
  { value: 'lb', label: 'LB' },
]
const noop = () => {}

type Clickable = ReactElement<{ onClick: () => void }>

describe('choosing an option', () => {
  it.each([
    ['ChipGroup', ChipGroup],
    ['SegmentedControl', SegmentedControl],
  ] as const)('%s reports the value of the option pressed', (_name, Component) => {
    const onChange = vi.fn()
    const group = Component({ label: 'Unit', options, value: 'kg', onChange })
    const buttons = group.props.children as Clickable[]
    buttons[1].props.onClick()
    expect(onChange).toHaveBeenCalledExactlyOnceWith('lb')
  })
})

describe('ChipGroup', () => {
  const html = renderToStaticMarkup(
    createElement(ChipGroup, { label: 'Unit', options, value: 'lb', onChange: noop }),
  )

  it('is a labelled group of toggle buttons', () => {
    expect(html).toContain('role="group"')
    expect(html).toContain('aria-label="Unit"')
    expect(html.match(/<button/g)).toHaveLength(2)
  })

  it('marks only the selected chip as pressed', () => {
    expect(html.match(/aria-pressed="true"/g)).toHaveLength(1)
    expect(html).toMatch(/aria-pressed="true"[^>]*>LB/)
  })

  it('shows selection as a fill, and is 48px tall with a focus ring', () => {
    const chips = cssOf('ChipGroup')
    expect(chips).toContain('min-height: var(--size-chip)')
    expect(chips).toContain("[aria-pressed='true']")
    expect(chips).toContain(':focus-visible')
  })
})

describe('ChipGroup with an unavailable option', () => {
  it('disables that chip and dims it', () => {
    const html = renderToStaticMarkup(
      createElement(ChipGroup, {
        label: 'Unit',
        options: [options[0], { ...options[1], disabled: true }],
        value: 'kg',
        onChange: noop,
      }),
    )
    expect(html.match(/disabled=""/g)).toHaveLength(1)
    expect(html).toMatch(/disabled=""[^>]*>LB/)
    expect(cssOf('ChipGroup')).toContain('.chip-group__chip:disabled')
  })
})

describe('SegmentedControl', () => {
  it('marks only the selected segment as pressed', () => {
    const html = renderToStaticMarkup(
      createElement(SegmentedControl, { label: 'Unit', options, value: 'kg', onChange: noop }),
    )
    expect(html.match(/aria-pressed="true"/g)).toHaveLength(1)
    expect(html).toMatch(/aria-pressed="true"[^>]*>KG/)
  })

  it('switches the selected colour to lime for the unit of measure', () => {
    const html = renderToStaticMarkup(
      createElement(SegmentedControl, {
        label: 'Unit',
        options,
        value: 'kg',
        onChange: noop,
        tone: 'lime',
      }),
    )
    expect(html).toContain('segmented--lime')
    expect(cssOf('SegmentedControl')).toContain('.segmented--lime')
  })

  it('has 44px segments with a focus ring', () => {
    const segments = cssOf('SegmentedControl')
    expect(segments).toContain('min-height: var(--size-control)')
    expect(segments).toContain('min-width: var(--size-control)')
    expect(segments).toContain(':focus-visible')
  })
})
