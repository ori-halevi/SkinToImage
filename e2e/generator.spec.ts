import { expect, test, type Download, type Page } from '@playwright/test';
import { unzipSync } from 'fflate';
import { readFile } from 'node:fs/promises';

const PNG_SIGNATURE = [0x89, 0x50, 0x4e, 0x47];
const POSE_COUNT = 64;
const SCENE_COUNT = 33;

async function readDownload(download: Download): Promise<Uint8Array> {
  return new Uint8Array(await readFile((await download.path())!));
}

/** Width/height from a PNG's IHDR chunk. */
function pngSize(data: Uint8Array): [number, number] {
  const view = new DataView(data.buffer, data.byteOffset);
  return [view.getUint32(16), view.getUint32(20)];
}

async function loadSample(page: Page) {
  await page.getByRole('button', { name: 'Try a sample skin' }).click();
  await expect(page.locator('[data-testid^="shot-"]')).toHaveCount(POSE_COUNT);
}

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => localStorage.setItem('lang', 'en'));
  await page.goto('/');
});

test('sample skin → gallery → ZIP download', async ({ page }) => {
  await loadSample(page);
  await expect(page.locator('[data-testid="shot-wave"] img')).toBeVisible();

  await page.getByRole('checkbox', { name: 'Select Wave' }).check();
  await page.getByRole('checkbox', { name: 'Select Dab' }).check();
  await expect(page.getByText('2 selected')).toBeVisible();

  await page.getByRole('button', { name: 'Export', exact: true }).click();
  await page.getByRole('button', { name: '1024px', exact: true }).click();
  const [download] = await Promise.all([page.waitForEvent('download'), page.getByRole('button', { name: 'Download ZIP' }).click()]);
  expect(download.suggestedFilename()).toBe('explorer_images.zip');

  const files = unzipSync(await readDownload(download));
  expect(Object.keys(files).sort()).toEqual(['explorer_dab_left.png', 'explorer_wave_left.png']);
  for (const data of Object.values(files)) {
    expect(Array.from(data.slice(0, 4))).toEqual(PNG_SIGNATURE);
    // A real render: a trimmed character is several hundred pixels tall at 1024px, never a blank sliver.
    const [width, height] = pngSize(data);
    expect(height).toBeGreaterThan(400);
    expect(width).toBeGreaterThan(150);
  }
});

test('single image download from the dialog', async ({ page }) => {
  await loadSample(page);
  await page.getByRole('button', { name: 'Open Shocked' }).click();

  const dialog = page.getByRole('dialog', { name: 'Shocked' });
  await expect(dialog.getByRole('img', { name: 'Shocked' })).toBeVisible();
  await dialog.getByRole('button', { name: 'Front', exact: true }).click();

  const [download] = await Promise.all([page.waitForEvent('download'), dialog.getByRole('button', { name: 'Download PNG' }).click()]);
  expect(download.suggestedFilename()).toBe('explorer_shocked_front.png');

  await page.keyboard.press('Escape');
  await expect(dialog).toBeHidden();
});

test('16:9 background frame produces a 16:9 image', async ({ page }) => {
  await loadSample(page);
  await page.getByRole('button', { name: 'Background', exact: true }).click();
  await page.getByRole('button', { name: 'Sunburst' }).click();
  await page.getByRole('button', { name: '16:9' }).click();
  await page.getByRole('button', { name: 'Export', exact: true }).click();
  await page.getByRole('button', { name: '1024px', exact: true }).click();

  await page.getByRole('button', { name: 'Open Wave' }).click();
  const dialog = page.getByRole('dialog', { name: 'Wave' });
  const [download] = await Promise.all([page.waitForEvent('download'), dialog.getByRole('button', { name: 'Download PNG' }).click()]);
  expect(pngSize(await readDownload(download))).toEqual([1024, 576]);
});

test('scenes with two skins', async ({ page }) => {
  await loadSample(page);
  await page.getByRole('button', { name: 'Add skin' }).click();
  await page.getByRole('dialog', { name: 'Add a skin' }).getByRole('button', { name: 'Try a sample skin' }).click();
  await expect(page.getByRole('button', { name: /^Use explorer/ })).toHaveCount(2);

  await page.getByRole('tab', { name: 'Scenes' }).click();
  await expect(page.locator('[data-testid^="shot-"]')).toHaveCount(SCENE_COUNT);
  await expect(page.locator('[data-testid="shot-fight"] img')).toBeVisible();

  await page.getByRole('button', { name: 'Open Sword fight' }).click();
  const dialog = page.getByRole('dialog', { name: 'Sword fight' });
  await expect(dialog.getByText('Characters')).toBeVisible();
  const [download] = await Promise.all([page.waitForEvent('download'), dialog.getByRole('button', { name: 'Download PNG' }).click()]);
  expect(download.suggestedFilename()).toBe('explorer_fight_left.png');
  const [width, height] = pngSize(await readDownload(download));
  // A real 2048px render of two characters, not a blank or single-character image.
  expect(width).toBeGreaterThan(900);
  expect(height).toBeGreaterThan(900);
});

test('loads a skin by username (mocked services)', async ({ page }) => {
  const skinPng = await readFile('public/favicon.png'); // any valid 64×64 PNG works as a skin
  const textures = Buffer.from(JSON.stringify({ textures: { SKIN: { url: 'https://textures.test/skin', metadata: { model: 'slim' } } } })).toString('base64');
  await page.route('https://playerdb.co/**', (route) =>
    route.fulfill({
      json: { success: true, code: 'player.found', data: { player: { username: 'TestPlayer', properties: [{ name: 'textures', value: textures }] } } },
      headers: { 'Access-Control-Allow-Origin': '*' },
    }),
  );
  await page.route('https://textures.test/**', (route) =>
    route.fulfill({ body: skinPng, contentType: 'image/png', headers: { 'Access-Control-Allow-Origin': '*' } }),
  );

  await page.getByLabel('Java username').fill('testplayer');
  await page.getByRole('button', { name: 'Load', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Use TestPlayer' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Slim', exact: true })).toHaveAttribute('aria-pressed', 'true');
});

test('reset buttons appear only for changed settings and restore defaults', async ({ page }) => {
  await loadSample(page);
  const itemSelect = page.getByLabel('Item in hand', { exact: true });
  const resetItem = page.getByRole('button', { name: 'Reset Item in hand to default' });
  await expect(resetItem).toHaveCount(0);

  await itemSelect.selectOption('sword');
  await expect(resetItem).toBeVisible();
  await resetItem.click();
  await expect(itemSelect).toHaveValue('none');
  await expect(resetItem).toHaveCount(0);

  await itemSelect.selectOption('bow');
  await page.getByRole('button', { name: /^Reset Character$/ }).click();
  await expect(itemSelect).toHaveValue('none');
});

test('second layer can be toggled per body part', async ({ page }) => {
  await loadSample(page);
  const hat = page.getByRole('button', { name: 'Hat', exact: true });
  await expect(hat).toHaveAttribute('aria-pressed', 'true');
  await hat.click();
  await expect(hat).toHaveAttribute('aria-pressed', 'false');
  await expect(page.getByRole('button', { name: 'Jacket', exact: true })).toHaveAttribute('aria-pressed', 'true');

  await page.getByRole('button', { name: 'Reset Second layer to default' }).click();
  await expect(hat).toHaveAttribute('aria-pressed', 'true');
});

test('editor: add characters from the gallery, add text, undo, export', async ({ page }) => {
  await loadSample(page);
  await page.getByRole('checkbox', { name: 'Select Wave' }).check();
  await page.getByRole('checkbox', { name: 'Select Shocked' }).check();
  await page.getByRole('button', { name: 'Add to editor' }).click();

  await expect(page).toHaveURL(/#editor$/);
  const layers = page.locator('section', { has: page.getByRole('heading', { name: 'Layers' }) }).locator('li');
  await expect(layers).toHaveCount(2);

  await page.getByRole('button', { name: 'Add text' }).click();
  await expect(layers).toHaveCount(3);
  await page.getByLabel('Text', { exact: true }).fill('EPIC WIN!');
  await expect(layers.first()).toContainText('EPIC WIN!');

  await page.getByRole('button', { name: 'Undo' }).click(); // the text edit
  await page.getByRole('button', { name: 'Undo' }).click(); // adding the text layer
  await expect(layers).toHaveCount(2);
  await page.getByRole('button', { name: 'Redo' }).click();
  await expect(layers).toHaveCount(3);

  const [download] = await Promise.all([page.waitForEvent('download'), page.getByRole('button', { name: 'Download PNG' }).click()]);
  expect(pngSize(await readDownload(download))).toEqual([1280, 720]);

  // The project is saved and listed.
  await page.getByRole('button', { name: 'Projects' }).click();
  await expect(page.getByRole('dialog', { name: 'Projects' }).getByRole('button', { name: /^Open My thumbnail/ })).toBeVisible();
});

test('swap characters and black silhouettes', async ({ page }) => {
  await loadSample(page);
  await page.getByRole('button', { name: 'Add skin' }).click();
  await page.getByRole('dialog', { name: 'Add a skin' }).getByRole('button', { name: 'Try a sample skin' }).click();
  await page.getByRole('textbox', { name: 'Skin name' }).first().fill('second');
  await page.getByRole('textbox', { name: 'Skin name' }).first().press('Enter');

  await page.getByRole('tab', { name: 'Scenes' }).click();
  await page.getByRole('button', { name: 'Open Face-off' }).click();
  const dialog = page.getByRole('dialog', { name: 'Face-off' });
  const slots = dialog.getByRole('combobox');
  const before = [await slots.nth(0).inputValue(), await slots.nth(1).inputValue()];
  expect(before[0]).not.toBe(before[1]);
  await dialog.getByRole('button', { name: 'Swap', exact: true }).click();
  await expect(slots.nth(0)).toHaveValue(before[1]);
  await expect(slots.nth(1)).toHaveValue(before[0]);

  const silhouette = dialog.getByRole('button', { name: /^Black silhouette for / }).first();
  await silhouette.click();
  await expect(silhouette).toHaveAttribute('aria-pressed', 'true');
});

test('a skin added after swapping still appears in scenes', async ({ page }) => {
  await loadSample(page);
  await page.getByRole('button', { name: 'Add skin' }).click();
  await page.getByRole('dialog', { name: 'Add a skin' }).getByRole('button', { name: 'Try a sample skin' }).click();
  await page.getByRole('tab', { name: 'Scenes' }).click();
  await page.getByRole('button', { name: 'Swap characters' }).click();

  // Add a third skin while on the Scenes tab.
  await page.getByRole('button', { name: 'Add skin' }).click();
  await page.getByRole('dialog', { name: 'Add a skin' }).getByRole('button', { name: 'Try a sample skin' }).click();
  const newest = await page.getByRole('button', { name: /^Use explorer/ }).last();
  await expect(newest).toHaveAttribute('aria-pressed', 'true');

  await page.getByRole('button', { name: 'Open Squad of 3' }).click();
  const slots = page.getByRole('dialog', { name: 'Squad of 3' }).getByRole('combobox');
  const values = await Promise.all([0, 1, 2].map((i) => slots.nth(i).inputValue()));
  expect(new Set(values).size).toBe(3); // all three skins are cast
});

test('editor: character picker has skins and camera settings', async ({ page }) => {
  await loadSample(page);
  await page.getByRole('button', { name: 'Editor', exact: true }).click();
  await page.getByRole('button', { name: 'Add character' }).click();
  const picker = page.getByRole('dialog', { name: 'Add character' });
  await expect(picker.getByRole('button', { name: 'Add skin' })).toBeVisible();
  await picker.getByRole('button', { name: 'Hero', exact: true }).click();
  await expect(picker.getByRole('button', { name: 'Hero', exact: true })).toHaveAttribute('aria-pressed', 'true');
  await picker.getByRole('button', { name: 'Add Wave' }).click();
  await expect(picker).toBeHidden();

  const layers = page.locator('section', { has: page.getByRole('heading', { name: 'Layers' }) }).locator('li');
  await expect(layers).toHaveCount(1);
  // Characters are blacked out per character (the whole-image toggle is for uploaded images).
  const silhouette = page.getByRole('button', { name: /^Black silhouette for / });
  await silhouette.click();
  await expect(silhouette).toHaveAttribute('aria-pressed', 'true');
});

test('editor: paste an image from the clipboard', async ({ page }) => {
  await page.goto('/#editor');
  await expect(page.getByRole('button', { name: 'Add character' })).toBeVisible();
  const png = (await readFile('public/icon-512.png')).toString('base64');
  await page.evaluate(async (b64) => {
    const blob = await (await fetch(`data:image/png;base64,${b64}`)).blob();
    const data = new DataTransfer();
    data.items.add(new File([blob], 'bg.png', { type: 'image/png' }));
    window.dispatchEvent(new ClipboardEvent('paste', { clipboardData: data }));
  }, png);

  // Pasting adds an image layer...
  const layers = page.locator('section', { has: page.getByRole('heading', { name: 'Layers' }) }).locator('li');
  await expect(layers).toHaveCount(1);
  const silhouette = page.getByRole('checkbox', { name: 'Black silhouette', exact: true });
  await silhouette.check();
  await expect(silhouette).toBeChecked();

  // ...or becomes the background instead.
  await page.getByRole('button', { name: 'Use as the background instead' }).click();
  await expect(layers).toHaveCount(0);
  await expect(page.getByRole('button', { name: 'Image', exact: true })).toHaveAttribute('aria-pressed', 'true');
});

test('editor: glow on an uploaded image, and duplicating a project', async ({ page }) => {
  await page.goto('/#editor');
  await page.getByTestId('composer-image-input').setInputFiles('public/icon-512.png');
  const layers = page.locator('section', { has: page.getByRole('heading', { name: 'Layers' }) }).locator('li');
  await expect(layers).toHaveCount(1);

  const glow = page.getByRole('checkbox', { name: 'Glow', exact: true });
  await glow.check();
  await expect(page.getByRole('slider', { name: /^Glow size/ })).toBeVisible();
  await page.getByRole('slider', { name: /^Glow strength/ }).fill('60');
  const [download] = await Promise.all([page.waitForEvent('download'), page.getByRole('button', { name: 'Download PNG' }).click()]);
  expect(pngSize(await readDownload(download))).toEqual([1280, 720]);

  // Duplicating keeps the original and opens the copy.
  await page.getByRole('textbox', { name: 'Project name' }).fill('Original');
  await page.getByRole('textbox', { name: 'Project name' }).press('Enter');
  await page.getByRole('button', { name: 'Projects' }).click();
  const projects = page.getByRole('dialog', { name: 'Projects' });
  await projects.getByRole('button', { name: 'Duplicate' }).first().click();
  await expect(page.getByRole('textbox', { name: 'Project name' })).toHaveValue('Original (copy)');
  await expect(layers).toHaveCount(1);

  await page.getByRole('button', { name: 'Projects' }).click();
  await expect(projects.getByRole('button', { name: /^Open Original$/ })).toBeVisible();
  await expect(projects.getByRole('button', { name: /^Open Original \(copy\)$/ })).toBeVisible();
});

test('rejects invalid files with a clear error', async ({ page }) => {
  await page.getByTestId('skin-input').setInputFiles({ name: 'photo.jpg', mimeType: 'image/jpeg', buffer: Buffer.from([1, 2, 3]) });
  await expect(page.getByRole('alert')).toHaveText('Only PNG skin files are supported.');
});

test('remembers recent skins', async ({ page }) => {
  await loadSample(page);
  await page.getByRole('button', { name: 'SkinToImage' }).click();
  await expect(page.getByRole('heading', { name: 'Recent skins' })).toBeVisible();
  await page.getByRole('button', { name: 'explorer', exact: true }).click();
  await expect(page.locator('[data-testid^="shot-"]')).toHaveCount(POSE_COUNT);
});

test('switches to Hebrew with right-to-left layout', async ({ page }) => {
  await page.getByRole('combobox', { name: 'Language' }).selectOption('he');
  await expect(page.locator('html')).toHaveAttribute('dir', 'rtl');
  await expect(page.getByRole('button', { name: 'לנסות סקין לדוגמה' })).toBeVisible();
});
