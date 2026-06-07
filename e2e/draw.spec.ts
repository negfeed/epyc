import { test, expect } from '@playwright/test';

/**
 * End-to-end happy path for a single host, against the Firebase emulators:
 * sign in -> create game -> start -> reach the Draw page -> draw a stroke and
 * confirm the canvas registered it (the "Next" button becomes enabled).
 */
test('host signs in, starts a game, and can draw on the canvas', async ({ page }) => {
  // Load with emulator wiring; the auth guard redirects to /login while signed out.
  await page.goto('/?emu=1');
  await expect(page).toHaveURL(/\/login/);

  // Authenticate the app's Firebase instance via the emulator-only helper.
  await page.waitForFunction(() => '__epycSignIn' in window);
  await page.evaluate(() => (window as unknown as { __epycSignIn: () => Promise<unknown> }).__epycSignIn());

  // Go to home (the session persists; the guard restores it).
  await page.goto('/home?emu=1');
  const newGame = page.locator('page-home ion-button', { hasText: 'New Game' });
  await expect(newGame).toBeVisible();

  // Create a game -> the host lands in the waiting room with a Start button.
  await newGame.click();
  const startGame = page.locator('page-waiting-room ion-button', { hasText: 'Start Game' });
  await expect(startGame).toBeVisible();

  // Start the game -> navigates to the Draw page with a live canvas.
  await startGame.click();
  await expect(page).toHaveURL(/\/draw$/);
  const canvas = page.locator('page-draw canvas');
  await expect(canvas).toBeVisible();

  // The canvas should be sized to (nearly) the full content width, not collapsed.
  const box = await canvas.boundingBox();
  expect(box!.width).toBeGreaterThan(200);

  // Allow the canvas paper setup + drawing binding to settle.
  await page.waitForTimeout(800);

  // Draw a stroke with the mouse (pointer events).
  await page.mouse.move(box!.x + 40, box!.y + 40);
  await page.mouse.down();
  await page.mouse.move(box!.x + 120, box!.y + 120, { steps: 12 });
  await page.mouse.move(box!.x + 180, box!.y + 70, { steps: 12 });
  await page.mouse.up();

  // Having drawn something, the Next button is enabled (color flips off 'light').
  const next = page.locator('page-draw ion-button', { hasText: 'Next' });
  await expect(next).toHaveAttribute('color', 'primary');
});
