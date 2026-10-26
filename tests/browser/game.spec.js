import { test, expect } from '@playwright/test';
async function boot(page) {
  await page.goto('/?test'); await page.waitForFunction(() => window.__cricket?.scene);
}
test('real Canvas game: start, keyboard batting, pause/resume, innings and restart', async ({ page }) => {
  const errors = [];
  page.on('pageerror', e => errors.push(e.message));
  page.on('console', m => { if (m.type() === 'error') errors.push(m.text()); });
  await boot(page);
  await expect(page.locator('canvas')).toBeVisible();
  await page.screenshot({ path: 'test-results/start-screen.png' });
  await page.getByRole('button', { name: /TAKE THE CREASE/ }).click();
  await expect(page.locator('#overlay')).toBeHidden();
  await page.keyboard.down('ArrowLeft'); await page.waitForTimeout(250); await page.keyboard.up('ArrowLeft');
  expect(await page.evaluate(() => window.__cricket.match.aim)).toBeLessThan(-5);
  await page.keyboard.press('ArrowUp'); await expect(page.locator('#loft')).toHaveAttribute('aria-pressed', 'true');
  await page.keyboard.press('KeyP'); await expect(page.locator('#overlay')).toBeVisible();
  const clock = await page.evaluate(() => window.__cricket.match.clock);
  await page.waitForTimeout(350);
  expect(await page.evaluate(() => window.__cricket.match.clock)).toBe(clock);
  await page.getByRole('button', { name: /RESUME INNINGS/ }).click();
  await expect(page.locator('#overlay')).toBeHidden();
  // Drive the clock to contact, then use the real keyboard input handler.
  await page.evaluate(() => {
    const { match: m } = window.__cricket;
    m.random = () => 0.5; m.setAim(0); m.loft = false;
    while (m.state !== 'delivery') m.step(1 / 120);
    m.flight = m.contactAt - 0.015;
  });
  await page.keyboard.press('Space');
  await expect.poll(() => page.evaluate(() => window.__cricket.match.state)).toBe('inplay');
  await page.screenshot({ path: 'test-results/playing.png' });
  await expect.poll(() => page.locator('#score').innerText(), { timeout: 8000 }).toBe('4/0');
  // Finish all twelve deliveries using the same simulation and collision path.
  await page.evaluate(() => {
    const { match: m } = window.__cricket;
    for (let n = 0; n < 20000 && m.state !== 'over'; n++) {
      if (m.state === 'delivery' && !m.swung && m.flight >= m.contactAt) m.swing();
      m.step(1 / 120);
    }
  });
  await expect(page.locator('#modal-kicker')).toHaveText('TARGET CONQUERED');
  await expect(page.locator('#overs')).toHaveText('2.0 / 2 OVERS');
  await page.screenshot({ path: 'test-results/game-over.png' });
  await page.getByRole('button', { name: /PLAY AGAIN/ }).click();
  await expect(page.locator('#score')).toHaveText('0/0');
  expect(errors).toEqual([]);
});
test('misses end in three wickets and button controls work at narrow width', async ({ page }) => {
  await page.setViewportSize({ width: 480, height: 900 }); await boot(page);
  await page.getByRole('button', { name: /TAKE THE CREASE/ }).click();
  await page.getByRole('button', { name: 'Aim right' }).click();
  await expect(page.locator('#aim-label')).toHaveText('OFF SIDE');
  await page.getByRole('button', { name: /LOFT/ }).click();
  await expect(page.locator('#loft')).toHaveAttribute('aria-pressed', 'true');
  await page.evaluate(() => { const m = window.__cricket.match; for (let i = 0; i < 5000 && m.state !== 'over'; i++) m.step(1 / 120); });
  await expect(page.locator('#modal-kicker')).toHaveText('INNINGS COMPLETE');
  await expect(page.locator('#score')).toHaveText('0/3');
  await page.screenshot({ path: 'test-results/narrow-screen.png' });
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
});
test('plays twelve live deliveries through keyboard input without fast-forwarding', async ({ page }) => {
  test.setTimeout(150000);
  const errors = [];
  page.on('pageerror', e => errors.push(e.message));
  await boot(page);
  await page.getByRole('button', { name: /TAKE THE CREASE/ }).click();
  for (let ball = 0; ball < 12; ball++) {
    await page.waitForFunction(() => {
      const m = window.__cricket.match;
      return m.state === 'delivery' && !m.swung && m.flight >= m.contactAt - 0.04;
    }, null, { polling: 'raf', timeout: 15000 });
    await page.keyboard.press('Space');
    await expect.poll(() => page.evaluate(() => window.__cricket.match.balls), { timeout: 10000 }).toBe(ball + 1);
  }
  await expect(page.locator('#modal-kicker')).toHaveText('TARGET CONQUERED', { timeout: 5000 });
  await expect(page.locator('#overs')).toHaveText('2.0 / 2 OVERS');
  expect(await page.evaluate(() => window.__cricket.match.wickets)).toBe(0);
  expect(await page.evaluate(() => window.__cricket.match.runs)).toBeGreaterThanOrEqual(24);
  expect(errors).toEqual([]);
});
