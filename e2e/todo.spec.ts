import { expect, test } from '@playwright/test'

test('adds, toggles, and deletes a todo', async ({ page }) => {
  await page.goto('/')

  await expect(page.getByText('No todos yet.')).toBeVisible()
  await page.getByLabel('New todo').fill('Review the maker PR')
  await page.getByRole('button', { name: 'Add' }).click()

  await expect(page.getByText('Review the maker PR')).toBeVisible()
  await expect(page.getByText('1 active of 1 total')).toBeVisible()

  await page.getByRole('checkbox').check()
  await expect(page.getByText('0 active of 1 total')).toBeVisible()

  await page.getByRole('button', { name: 'Delete' }).click()
  await expect(page.getByText('No todos yet.')).toBeVisible()
})
