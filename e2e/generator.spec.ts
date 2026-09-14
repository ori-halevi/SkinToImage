import { expect, test } from '@playwright/test';
import { unzipSync } from 'fflate';
import { readFile } from 'node:fs/promises';

const PNG_SIGNATURE = [0x89, 0x50, 0x4e, 0x47];

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => localStorage.setItem('lang', 'en'));
  await page.goto('/');
});

test('sample skin → gallery → ZIP download', async ({ page }) => {
  await page.getByRole('button', { name: 'Try a sample skin' }).click();

  const cards = page.locator('[data-testid^="shot-"]');
  await expect(cards).toHaveCount(16);
  await expect(page.locator('[data-testid="shot-wave"] img')).toBeVisible();

  await page.getByRole('checkbox', { name: 'Select Wave' }).check();
  await page.getByRole('checkbox', { name: 'Select Dab' }).check();
  await expect(page.getByText('2 selected')).toBeVisible();

  await page.getByRole('button', { name: '1024px', exact: true }).click();
  const [download] = await Promise.all([page.waitForEvent('download'), page.getByRole('button', { name: 'Download ZIP' }).click()]);
  expect(download.suggestedFilename()).toBe('explorer_poses.zip');

  const files = unzipSync(new Uint8Array(await readFile((await download.path())!)));
  expect(Object.keys(files).sort()).toEqual(['explorer_dab_left.png', 'explorer_wave_left.png']);
  for (const data of Object.values(files)) expect(Array.from(data.slice(0, 4))).toEqual(PNG_SIGNATURE);
});

test('single image download from the dialog', async ({ page }) => {
  await page.getByRole('button', { name: 'Try a sample skin' }).click();
  await page.getByRole('button', { name: 'Open Shocked' }).click();

  const dialog = page.getByRole('dialog', { name: 'Shocked' });
  await expect(dialog.getByRole('img', { name: 'Shocked' })).toBeVisible();
  await dialog.getByRole('button', { name: 'Front', exact: true }).click();

  const [download] = await Promise.all([page.waitForEvent('download'), dialog.getByRole('button', { name: 'Download PNG' }).click()]);
  expect(download.suggestedFilename()).toBe('explorer_shocked_front.png');

  await page.keyboard.press('Escape');
  await expect(dialog).toBeHidden();
});

test('rejects invalid files with a clear error', async ({ page }) => {
  await page.getByTestId('skin-input').setInputFiles({ name: 'photo.jpg', mimeType: 'image/jpeg', buffer: Buffer.from([1, 2, 3]) });
  await expect(page.getByRole('alert')).toHaveText('Only PNG skin files are supported.');
});

test('remembers recent skins', async ({ page }) => {
  await page.getByRole('button', { name: 'Try a sample skin' }).click();
  await expect(page.locator('[data-testid^="shot-"]')).toHaveCount(16);
  await page.getByRole('button', { name: 'Change skin' }).click();
  await expect(page.getByRole('heading', { name: 'Recent skins' })).toBeVisible();
  await page.getByRole('button', { name: 'explorer', exact: true }).click();
  await expect(page.locator('[data-testid^="shot-"]')).toHaveCount(16);
});

test('switches to Hebrew with right-to-left layout', async ({ page }) => {
  await page.getByRole('combobox', { name: 'Language' }).selectOption('he');
  await expect(page.locator('html')).toHaveAttribute('dir', 'rtl');
  await expect(page.getByRole('button', { name: 'לנסות סקין לדוגמה' })).toBeVisible();
});
