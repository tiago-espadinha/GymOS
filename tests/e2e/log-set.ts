import type { Page } from '@playwright/test'

// Types weight and reps into the open exercise's steppers and logs the set.
// Hidden exercise screens stay mounted, but getByRole skips hidden fields.
export const logSet = async (page: Page, weight: string, reps: string) => {
  await page.getByRole('textbox', { name: 'Weight', exact: true }).fill(weight)
  await page.getByRole('textbox', { name: 'Reps', exact: true }).fill(reps)
  await page.getByRole('button', { name: 'Set done' }).click()
}

// The session list's header pill.
export const finishButton = (page: Page) => page.getByRole('button', { name: 'Finish session' })

// The ⋯ beside Finish, which opens the session sheet.
export const sessionActions = (page: Page) => page.getByRole('button', { name: 'Session actions' })

// From the session list: ⋯, then Discard session. With sets logged a confirm opens next.
export const discardSession = async (page: Page) => {
  await sessionActions(page).click()
  await page.getByRole('dialog').getByRole('button', { name: 'Discard session' }).click()
}
