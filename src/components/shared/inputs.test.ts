import { createElement } from 'react'
import type { ReactElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it, vi } from 'vitest'
import { Field } from './Field'
import { StepperBlock } from './StepperBlock'
import { stepValue } from './StepperBlock/stepValue'
import { cssOf } from './testCss'

const noop = () => {}

type Clickable = ReactElement<{ onClick: () => void }>

describe('stepValue', () => {
  it('adds and subtracts the step', () => {
    expect(stepValue(60, 2.5, 0)).toBe(62.5)
    expect(stepValue(60, -2.5, 0)).toBe(57.5)
  })

  it('does not drift on decimal steps', () => {
    expect(stepValue(0.1, 0.2, 0)).toBe(0.3)
  })

  it('never goes below the minimum', () => {
    expect(stepValue(1, -5, 0)).toBe(0)
    expect(stepValue(3, -5, 1)).toBe(1)
  })
})

describe('StepperBlock', () => {
  const render = (value: number) =>
    renderToStaticMarkup(
      createElement(StepperBlock, { label: 'Weight', value, unit: 'kg', onChange: noop }),
    )

  it('shows the number and unit between labelled minus and plus buttons', () => {
    const html = render(40)
    expect(html).toContain('aria-label="Decrease Weight"')
    expect(html).toContain('aria-label="Increase Weight"')
    expect(html).toContain('>40<')
    expect(html).toContain('>kg<')
  })

  it('disables minus at the minimum only', () => {
    const atMin = render(0).match(/<button[^>]*>/g) ?? []
    expect(atMin).toHaveLength(2)
    expect(atMin[0]).toContain('disabled=""')
    expect(atMin[1]).not.toContain('disabled')
    expect(render(5)).not.toContain('disabled')
  })

  it('steps the value down and up by the step', () => {
    const onChange = vi.fn()
    const block = StepperBlock({ label: 'Weight', value: 60, unit: 'kg', step: 2.5, onChange })
    const [minus, , plus] = block.props.children as Clickable[]
    minus.props.onClick()
    plus.props.onClick()
    expect(onChange.mock.calls).toEqual([[57.5], [62.5]])
  })

  it('announces a changed value politely', () => {
    expect(render(40)).toContain('aria-live="polite"')
  })

  it('gives the buttons a 44 by 88 hit area and a 96px block', () => {
    const stepper = cssOf('StepperBlock')
    expect(stepper).toContain('min-width: var(--size-control)')
    expect(stepper).toContain('min-height: calc(var(--size-control) * 2)')
    expect(stepper).toContain('min-height: var(--size-stepper)')
    expect(stepper).toContain(':focus-visible')
  })
})

describe('Field', () => {
  it('ties the label to the input', () => {
    const html = renderToStaticMarkup(createElement(Field, { label: 'Plan name' }))
    const id = /<label for="([^"]+)"/.exec(html)?.[1]
    expect(id).toBeTruthy()
    expect(html).toContain(`id="${id}"`)
    expect(html).toContain('>Plan name<')
  })

  it('is valid by default and describes its error when there is one', () => {
    const clean = renderToStaticMarkup(createElement(Field, { label: 'Name' }))
    expect(clean).not.toContain('aria-invalid')

    const bad = renderToStaticMarkup(createElement(Field, { label: 'Name', error: 'Required' }))
    expect(bad).toContain('aria-invalid="true"')
    expect(bad).toContain('>Required<')
    const describedBy = /aria-describedby="([^"]+)"/.exec(bad)?.[1]
    expect(bad).toContain(`id="${describedBy}"`)
  })

  it('keeps a caller description alongside the error', () => {
    const hint = renderToStaticMarkup(
      createElement(Field, { label: 'Name', 'aria-describedby': 'hint' }),
    )
    expect(hint).toContain('aria-describedby="hint"')

    const both = renderToStaticMarkup(
      createElement(Field, { label: 'Name', 'aria-describedby': 'hint', error: 'Required' }),
    )
    expect(both).toMatch(/aria-describedby="hint [^"]+"/)
  })

  it('passes disabled through to the input', () => {
    expect(renderToStaticMarkup(createElement(Field, { label: 'Name', disabled: true }))).toContain(
      'disabled=""',
    )
  })

  it('keeps the focus border on top of the error border', () => {
    const field = cssOf('Field')
    expect(field.indexOf(':focus-visible')).toBeGreaterThan(field.indexOf("[aria-invalid='true']"))
  })

  it('is 52px tall and takes the lime border on focus', () => {
    const field = cssOf('Field')
    expect(field).toContain('min-height: var(--size-field)')
    expect(field).toMatch(/:focus-visible\s*{[^}]*border-color: var\(--color-accent\)/)
  })
})
