import { test, expect } from '@playwright/test';

test('static Pages export loads and plays under /CRICKET-CHAMPION/ without npm assets or external requests', async ({ page }) => {
  const errors = [], requests = [], badResponses = [];
  page.on('pageerror', e => errors.push(e.message));
  page.on('console', m => { if (m.type() === 'error') errors.push(m.text()); });
  page.on('request', r => requests.push(r.url()));
  page.on('response', r => { if (r.status() >= 400) badResponses.push(`${r.status()} ${r.url()}`); });
  await page.route('**/*', route => {
    const url = new URL(route.request().url());
    return url.origin === 'http://127.0.0.1:8090' ? route.continue() : route.abort();
  });
  await page.goto('./?test');
  await page.waitForFunction(() => window.__cricket?.scene);
  expect(await page.evaluate(() => Phaser.VERSION)).toBe('3.90.0');
  expect(await page.evaluate(() => window.__cricket.scene.game.renderer.type === Phaser.CANVAS)).toBe(true);
  await expect(page.locator('canvas')).toBeVisible();
  await expect(page.locator('#load-error')).toBeHidden();
  await page.getByRole('button', { name: /TAKE THE CREASE/ }).click();
  await page.waitForFunction(() => {
    const m = window.__cricket.match;
    return m.state === 'delivery' && m.flight >= m.contactAt - 0.03;
  }, null, { polling: 'raf' });
  await page.keyboard.press('Space');
  await expect.poll(() => page.locator('#score').innerText(), { timeout: 8000 }).toBe('4/0');
  await page.keyboard.press('KeyP');
  await expect(page.locator('#modal-kicker')).toHaveText('DRINKS BREAK');
  await page.screenshot({ path: 'test-results/pages-subpath.png' });
  await page.getByRole('button', { name: /RESUME INNINGS/ }).click();
  await expect(page.locator('#overlay')).toBeHidden();
  // Relative home link must stay on the project site, not the account root.
  await page.locator('.brand').click();
  await expect(page).toHaveURL('http://127.0.0.1:8090/CRICKET-CHAMPION/');
  await expect(page.locator('#primary')).toHaveText(/TAKE THE CREASE/);
  expect(requests.some(u => u.endsWith('/CRICKET-CHAMPION/vendor/phaser-3.90.0.min.js'))).toBe(true);
  expect(requests.some(u => u.endsWith('/CRICKET-CHAMPION/src/engine.js'))).toBe(true);
  expect(requests.filter(u => u.startsWith('http')).every(u => u.startsWith('http://127.0.0.1:8090/CRICKET-CHAMPION/'))).toBe(true);
  expect(requests.some(u => u.includes('node_modules'))).toBe(false);
  expect(errors).toEqual([]); expect(badResponses).toEqual([]);
});
