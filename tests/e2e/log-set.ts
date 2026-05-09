import type { Page } from '@playwright/test'

// Types weight and reps into the open exercise's steppers and logs the set.
// Hidden exercise screens stay mounted, but getByRole skips hidden fields.
export const logSet = async (page: Page, weight: string, reps: string) => {
  await page.getByRole('textbox', { name: 'Weight', exact: true }).fill(weight)
  await page.getByRole('textbox', { name: 'Reps', exact: true }).fill(reps)
  await page.getByRole('button', { name: 'Set done' }).click()
}

// The header pill; once every exercise is done the bottom bar adds a second one.
export const finishButton = (page: Page) => page.getByRole('button', { name: 'Finish session' }).first()
