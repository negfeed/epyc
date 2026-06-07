import { test, expect, Page } from '@playwright/test';

/**
 * Two-player game flow against the Firebase emulators. EPYC alternates
 * draw -> guess -> draw across rounds; a player draws more than once, so this
 * guards against an earlier round's page/canvas/word being reused on a later
 * round (the bug where round 3's draw showed round 1's word and drawing).
 */
test.setTimeout(150_000);

async function signIn(page: Page, email: string) {
  await page.goto('/?emu=1');
  await page.waitForFunction(() => '__epycSignIn' in window);
  await page.evaluate((e) => (window as unknown as { __epycSignIn: (x: string) => Promise<unknown> }).__epycSignIn(e), email);
}

async function drawStroke(page: Page) {
  const canvas = page.locator('page-draw canvas').last();
  await expect(canvas).toBeVisible();
  await page.waitForTimeout(700); // let paper setup + drawingKey binding settle
  const box = await canvas.boundingBox();
  await page.mouse.move(box!.x + 30, box!.y + 30);
  await page.mouse.down();
  await page.mouse.move(box!.x + 120, box!.y + 110, { steps: 8 });
  await page.mouse.move(box!.x + 160, box!.y + 50, { steps: 8 });
  await page.mouse.up();
  await page.waitForTimeout(300);
}

async function submitDrawAndAdvance(page: Page) {
  const fromUrl = page.url();
  await page.locator('page-draw ion-button', { hasText: 'Next' }).click();
  // ~5s countdown then the atom completes and navigation advances.
  await page.waitForURL((u) => u.toString() !== fromUrl, { timeout: 25_000 });
}

async function submitGuessAndAdvance(page: Page, text: string) {
  await expect(page.locator('page-guess')).toBeVisible();
  await page.locator('page-guess input').first().fill(text);
  // Submit enables only once the previous drawing has finished replaying.
  const submit = page.locator('page-guess ion-button', { hasText: 'Submit' });
  await expect(submit).toHaveAttribute('color', 'primary', { timeout: 25_000 });
  const fromUrl = page.url();
  await submit.click();
  await page.waitForURL((u) => u.toString() !== fromUrl, { timeout: 25_000 });
}

function drawWord(page: Page): Promise<string> {
  return page
    .locator('page-draw ion-title')
    .last()
    .innerText()
    .then((t) => t.replace(/^Draw\s+/, '').trim());
}

test('round 3 draw is a fresh page showing the previous guess, not round 1', async ({ browser }) => {
  const ctx0 = await browser.newContext();
  const ctx1 = await browser.newContext();
  const p0 = await ctx0.newPage();
  const p1 = await ctx1.newPage();

  await signIn(p0, 'p0@example.com');
  await signIn(p1, 'p1@example.com');

  // P0 creates the game.
  await p0.goto('/home?emu=1');
  await p0.locator('page-home ion-button', { hasText: 'New Game' }).click();
  await p0.waitForURL(/\/waiting-room$/, { timeout: 20_000 });
  const gameKey = p0.url().match(/\/game\/([^/]+)\//)![1];

  // P1 joins the same game.
  await p1.goto(`/game/${gameKey}/waiting-room?emu=1`);
  await p1.locator('page-waiting-room ion-button', { hasText: 'Join Game' }).click();
  await expect(p0.locator('page-waiting-room')).toContainText('Joined (2)', { timeout: 20_000 });

  // P0 starts -> both players land on a round-1 draw page.
  await p0.locator('page-waiting-room ion-button', { hasText: 'Start Game' }).click();
  await p0.waitForURL(/\/draw\/\d+\/0$/, { timeout: 25_000 });
  await p1.waitForURL(/\/draw\/\d+\/0$/, { timeout: 25_000 });

  const p0Round1Word = await drawWord(p0);

  // Round 1: both draw and submit.
  await drawStroke(p0);
  await drawStroke(p1);
  await submitDrawAndAdvance(p0);
  await submitDrawAndAdvance(p1);

  // Round 2: both guess. P1's guess feeds P0's round-3 draw word.
  await p0.waitForURL(/\/guess\//, { timeout: 30_000 });
  await p1.waitForURL(/\/guess\//, { timeout: 30_000 });
  await submitGuessAndAdvance(p0, 'kite');
  await submitGuessAndAdvance(p1, 'teapot');

  // Round 3: P0 draws again -> distinct atom URL, fresh page, word = P1's guess.
  await p0.waitForURL(/\/draw\/\d+\/2$/, { timeout: 30_000 });
  const p0Round3Word = await drawWord(p0);

  expect(p0Round3Word).toBe('teapot'); // previous guess, not the original word
  expect(p0Round3Word).not.toBe(p0Round1Word);
  expect(p0.url()).toMatch(/\/draw\/\d+\/2$/); // unique round-3 atom URL

  await ctx0.close();
  await ctx1.close();
});
