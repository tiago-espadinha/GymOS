import { expect, type Page } from '@playwright/test'

// The rest block starts its timer in a mount effect, a task after "Set done"
// is handled. Wait until that start is saved before moving a paused clock or
// reloading; the save and the timer's tick interval run in the same effect pass.
export const restStarted = (page: Page) =>
  expect
    .poll(() =>
      page.evaluate(() =>
        Object.entries(localStorage).some(([key, value]) => key.endsWith('-rest') && JSON.parse(value).isRunning),
      ),
    )
    .toBe(true)
