import { test, expect } from '@playwright/test';

async function dragBlock(page, id, zone = 'order', before = null) {
  const source = page.locator(`.proof-block[data-id="${id}"]`);
  await source.scrollIntoViewIfNeeded();
  const start = await source.boundingBox();
  const target = before ? page.locator(`#${zone} [data-id="${before}"]`) : page.locator('#' + zone);
  const end = await target.boundingBox();
  await page.mouse.move(start.x + 30, start.y + start.height / 2);
  await page.mouse.down();
  await page.mouse.move(start.x + 40, start.y + start.height / 2 + 8, { steps: 3 });
  await page.mouse.move(end.x + end.width / 2, before ? end.y + 4 : end.y + end.height - 8, { steps: 12 });
  await page.mouse.up();
  await expect(page.locator(`#${zone} [data-id="${id}"]`)).toBeVisible();
}

test('collection renders on desktop and mobile without overflow', async ({ page }, testInfo) => {
  const errors = []; page.on('pageerror', e => errors.push(e.message));
  await page.goto('/');
  await expect(page.getByRole('heading', { name: /Great proofs start/ })).toBeVisible();
  await expect(page.locator('.proof-card')).toHaveCount(2);
  await expect(page.locator('a[href="/admin"]')).toHaveCount(0);
  await page.screenshot({ path: testInfo.outputPath('home-desktop.png'), fullPage: true });
  await page.setViewportSize({ width: 390, height: 844 });
  await expect.poll(() => page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.screenshot({ path: testInfo.outputPath('home-mobile.png'), fullPage: true });
  await page.getByRole('link', { name: /Find your first proof/ }).click();
  await expect(page).toHaveURL('/');
  expect(errors).toEqual([]);
});

test('dragging, reordering, feedback, persistence, completion, and reset', async ({ page }, testInfo) => {
  const errors = []; page.on('pageerror', e => errors.push(e.message));
  await page.goto('/play/proof-by-cases');
  await expect(page.locator('.katex').first()).toBeVisible();
  await dragBlock(page, 'b2');
  await page.getByRole('button', { name: 'Check my proof' }).click();
  await expect(page.locator('#feedback')).toContainText('line 1');
  await dragBlock(page, 'b1', 'order', 'b2');
  await dragBlock(page, 'b3');
  await page.reload();
  await expect(page.locator('#order .proof-block')).toHaveCount(3);
  await dragBlock(page, 'b3', 'bank');
  await expect(page.locator('#order .proof-block')).toHaveCount(2);
  for (const id of ['b3', 'b4', 'b5', 'b6']) await dragBlock(page, id);
  await page.getByRole('button', { name: 'Check my proof' }).click();
  await expect(page.locator('#feedback')).toContainText('Proof complete');
  await page.screenshot({ path: testInfo.outputPath('game-complete.png'), fullPage: true });
  await page.getByRole('button', { name: 'Start over' }).click();
  await expect(page.locator('#order .proof-block')).toHaveCount(0);
  await expect(page.locator('#bank .proof-block')).toHaveCount(6);
  expect(errors).toEqual([]);
});

test('touch drag scrolls to the argument on a narrow screen', async ({ browser }, testInfo) => {
  const context = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });
  const page = await context.newPage();
  await page.goto('http://127.0.0.1:3107/play/proof-by-cases');
  const source = page.locator('#bank [data-id="b1"]');
  await source.scrollIntoViewIfNeeded();
  const box = await source.boundingBox();
  const cdp = await context.newCDPSession(page);
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x: box.x + 35, y: box.y + box.height / 2 }] });
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x: 190, y: 815 }] });
  await expect.poll(async () => (await page.locator('#order').boundingBox()).y, { timeout: 5000 }).toBeLessThan(650);
  const target = await page.locator('#order').boundingBox();
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x: 190, y: Math.max(110, target.y + 40) }] });
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
  await expect(page.locator('#order [data-id="b1"]')).toBeVisible();
  await expect.poll(() => page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.screenshot({ path: testInfo.outputPath('game-mobile.png'), fullPage: true });
  await context.close();
});

test('admin creates a private draft, tests, publishes, edits, and rejects it', async ({ page, browser }, testInfo) => {
  await page.goto('/admin');
  await page.getByLabel('Admin password').fill('browser-test-password');
  await page.getByRole('button', { name: 'Enter the studio' }).click();
  await expect(page.getByRole('heading', { name: 'Proof studio.' })).toBeVisible();
  await page.getByLabel('Proof name', { exact: true }).fill('A reviewed proof');
  await page.getByLabel('The mathematics').fill('Prove the supplied logical implication by cases.');
  await page.getByRole('button', { name: 'Generate draft' }).click();
  await expect(page.getByRole('heading', { name: 'A reviewed proof' })).toBeVisible();
  const id = page.url().split('/').at(-1);
  const anonymous = await browser.newContext();
  const visitor = await anonymous.newPage();
  await visitor.goto('/');
  await expect(visitor.getByRole('heading', { name: 'A reviewed proof' })).toHaveCount(0);
  await page.getByRole('button', { name: 'Playtest saved proof' }).click();
  await expect(page.getByRole('button', { name: 'Approve & publish' })).toBeDisabled();
  for (const id of ['b1','b4','b5','b2','b3','b6']) await dragBlock(page, id);
  await page.getByRole('button', { name: 'Check my proof' }).click();
  await expect(page.locator('#feedback')).toContainText('Proof complete');
  await page.getByLabel('I have reviewed the mathematical correctness.').check();
  await page.getByRole('button', { name: 'Approve & publish' }).click();
  await expect(page).toHaveURL('/admin');
  await visitor.reload();
  await expect(visitor.getByRole('heading', { name: 'A reviewed proof' })).toBeVisible();
  await page.screenshot({ path: testInfo.outputPath('admin-studio.png'), fullPage: true });
  await page.goto('/admin/proofs/' + id);
  await page.getByLabel('Proof name', { exact: true }).fill('A revised proof');
  await expect(page.getByRole('button', { name: 'Save before playtesting' })).toBeDisabled();
  await page.getByRole('button', { name: 'Save revision' }).click();
  await expect(page.locator('#editor-notice')).toContainText('Saved as a draft');
  await visitor.reload();
  await expect(visitor.getByRole('heading', { name: /A reviewed proof|A revised proof/ })).toHaveCount(0);
  await page.getByRole('button', { name: 'Reject draft' }).click();
  await expect(page.locator('.admin-proof-row').filter({ hasText: 'A revised proof' })).toContainText('rejected');
  await page.getByRole('button', { name: 'Sign out' }).click();
  await expect(page.getByLabel('Admin password')).toBeVisible();
  await anonymous.close();
});
