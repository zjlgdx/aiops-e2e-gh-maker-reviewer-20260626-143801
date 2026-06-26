import { expect, test } from '@playwright/test'

test('adds, toggles, and deletes a todo', async ({ page }) => {
  await page.goto('/')

  await expect(page.getByText('No todos yet.')).toBeVisible()
  await page.getByLabel('New todo').fill('Review the maker PR')
  await page.getByRole('button', { name: 'Add' }).click()

  await expect(page.getByText('Review the maker PR')).toBeVisible()
  await expect(page.getByText('1 active of 1 total')).toBeVisible()

  await page.getByRole('checkbox', { name: 'Review the maker PR' }).check()
  await expect(page.getByText('0 active of 1 total')).toBeVisible()

  await page.getByRole('button', { name: 'Delete' }).click()
  await expect(page.getByText('No todos yet.')).toBeVisible()
})

test('filters todos and restores the selected filter after reload', async ({
  page,
}) => {
  await page.goto('/')

  await page.getByLabel('New todo').fill('Keep active')
  await page.getByRole('button', { name: 'Add' }).click()
  await page.getByLabel('New todo').fill('Ship completed')
  await page.getByRole('button', { name: 'Add' }).click()
  await page.getByRole('checkbox', { name: 'Ship completed' }).check()

  await expect(page.getByText('1 active of 2 total')).toBeVisible()

  await page.getByRole('button', { name: 'Active' }).click()
  await expect(page.getByRole('button', { name: 'Active' })).toHaveAttribute(
    'aria-pressed',
    'true',
  )
  await expect(page.getByText('Keep active')).toBeVisible()
  await expect(page.getByText('Ship completed')).toBeHidden()
  await expect(page.getByText('1 active of 2 total')).toBeVisible()

  await page.getByRole('button', { name: 'Completed' }).click()
  await expect(
    page.getByRole('button', { name: 'Completed' }),
  ).toHaveAttribute('aria-pressed', 'true')
  await expect(page.getByText('Keep active')).toBeHidden()
  await expect(page.getByText('Ship completed')).toBeVisible()
  await expect(page.getByText('1 active of 2 total')).toBeVisible()

  await page.reload()

  await expect(
    page.getByRole('button', { name: 'Completed' }),
  ).toHaveAttribute('aria-pressed', 'true')
  await expect(page.getByText('Keep active')).toBeHidden()
  await expect(page.getByText('Ship completed')).toBeVisible()

  await page.getByRole('button', { name: 'All' }).click()
  await expect(page.getByText('Keep active')).toBeVisible()
  await expect(page.getByText('Ship completed')).toBeVisible()
})

test('queues an offline add and drains it after returning online', async ({
  page,
}) => {
  await page.goto('/')

  await expect(page.getByText('Pending sync: 0')).toBeVisible()
  await page.getByLabel('Online mode').uncheck()
  await expect(page.getByText('Offline')).toBeVisible()

  await page.getByLabel('New todo').fill('Draft offline sync')
  await page.getByRole('button', { name: 'Add' }).click()

  await expect(page.getByText('Draft offline sync')).toBeVisible()
  await expect(page.getByText('Pending sync: 1')).toBeVisible()

  await page.getByLabel('Online mode').check()
  await expect(page.getByText('Online')).toBeVisible()
  await expect(page.getByText('Pending sync: 0')).toBeVisible()
})

test('undoes an offline delete before draining the sync queue', async ({
  page,
}) => {
  await page.goto('/')

  await page.getByLabel('New todo').fill('Undo queued delete')
  await page.getByRole('button', { name: 'Add' }).click()
  await expect(page.getByText('Undo queued delete')).toBeVisible()

  await page.getByLabel('Online mode').uncheck()
  await expect(page.getByText('Offline')).toBeVisible()

  await page.getByRole('button', { name: 'Delete' }).click()
  await expect(page.getByText('No todos yet.')).toBeVisible()
  await expect(page.getByText('Pending sync: 1')).toBeVisible()

  await page.getByRole('button', { name: 'Undo' }).click()
  await expect(page.getByText('Undo queued delete')).toBeVisible()
  await expect(page.getByText('Pending sync: 0')).toBeVisible()

  await page.getByLabel('Online mode').check()
  await expect(page.getByText('Online')).toBeVisible()
  await expect(page.getByText('Pending sync: 0')).toBeVisible()
  await expect(page.getByText('Undo queued delete')).toBeVisible()
})
