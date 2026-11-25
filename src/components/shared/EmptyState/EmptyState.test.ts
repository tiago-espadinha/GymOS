import { createElement } from 'react'
import { renderToStaticMarkup as render } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import { EmptyState } from '.'
import { cssOf } from '../testCss'

const noop = () => {}
const props = { kicker: 'Stats', title: 'No stats yet', text: 'Log a session.', action: 'Go to Log', onAction: noop }

describe('EmptyState', () => {
  it('is a region named by its h2 title, with the action as a real button', () => {
    const html = render(createElement(EmptyState, props))
    expect(html).toMatch(/<section class="emptyState" aria-labelledby="([^"]+)">.*<h2 id="\1" class="emptyState__title">No stats yet<\/h2>/)
    expect(html).toContain('Log a session.')
    expect(html).toMatch(/<button type="button" class="primary-button primary-button--dark">Go to Log<\/button>/)
  })

  it('hides the kicker from screen readers, since the tab h1 names the screen', () => {
    expect(render(createElement(EmptyState, props))).toContain('<span class="emptyState__kicker" aria-hidden="true">Stats</span>')
  })

  it('offers the CSV import only when given a handler', () => {
    expect(render(createElement(EmptyState, props))).not.toContain('Have a CSV backup?')
    expect(render(createElement(EmptyState, { ...props, onImport: noop }))).toContain('Have a CSV backup? Import it')
  })

  it('is the accent block, with black on accent and the empty-title size', () => {
    const css = cssOf('EmptyState')
    expect(css).toMatch(/\.emptyState__block\s*{[^}]*background: var\(--color-accent\)/)
    expect(css).toMatch(/\.emptyState__block\s*{[^}]*color: var\(--color-on-accent\)/)
    expect(css).toMatch(/\.emptyState__title\s*{[^}]*font-size: var\(--text-empty-title\)/)
    // A global heading colour must not turn the title white on the accent.
    expect(css).toMatch(/\.emptyState__title\s*{[^}]*color: inherit/)
  })
})
