import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import { ChipGroup } from './ChipGroup'
import { SegmentedControl } from './SegmentedControl'

const css = import.meta.glob<string>('./{ChipGroup,SegmentedControl}/*.css', {
  query: '?raw',
  import: 'default',
  eager: true,
})
const cssOf = (name: string) =>
  Object.entries(css).find(([path]) => path.includes(`/${name}/`))?.[1] ?? ''

const options = [
  { value: 'kg', label: 'KG' },
  { value: 'lb', label: 'LB' },
]
const noop = () => {}

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
