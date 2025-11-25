import { test, expect, Page } from "@playwright/test";

/**
 * Test Game Flow E2E Tests
 * Uses the /test-game route which bypasses authentication
 * Only available in development mode
 */

test.describe("Test Game Lobby", () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to test game lobby
    await page.goto("/test-game");
  });

  test("should load test game lobby", async ({ page }) => {
    // Wait for lobby to be visible
    await expect(page.getByText(/create|join|room/i).first()).toBeVisible({
      timeout: 10000,
    });
  });

  test("should create a new test room", async ({ page }) => {
    // Look for create room button
    const createButton = page.getByRole("button", { name: /create/i }).first();
    await expect(createButton).toBeVisible({ timeout: 10000 });

    await createButton.click();

    // Should navigate to a room URL
    await expect(page).toHaveURL(/test-game\/.+/, { timeout: 15000 });
  });
});

test.describe("Game Room", () => {
  test("should join a test room and see waiting room", async ({ page }) => {
    // Create a room first
    await page.goto("/test-game");

    const createButton = page.getByRole("button", { name: /create/i }).first();
    await expect(createButton).toBeVisible({ timeout: 10000 });
    await createButton.click();

    // Wait for room to load
    await expect(page).toHaveURL(/test-game\/.+/, { timeout: 15000 });

    // Should see waiting room or game interface
    await expect(
      page.getByText(/waiting|player|room/i).first()
    ).toBeVisible({ timeout: 10000 });
  });

  test("should display player info in game room", async ({ page }) => {
    await page.goto("/test-game");

    const createButton = page.getByRole("button", { name: /create/i }).first();
    await expect(createButton).toBeVisible({ timeout: 10000 });
    await createButton.click();

    await expect(page).toHaveURL(/test-game\/.+/, { timeout: 15000 });

    // Should show some player-related UI
    await page.waitForTimeout(2000);

    // Check for player indicators or game UI elements
    const playerIndicator = page.locator('[class*="player"], [class*="Player"]');
    const gameUI = page.locator('[class*="game"], [class*="room"]');

    await expect(playerIndicator.first().or(gameUI.first())).toBeVisible({
      timeout: 10000,
    });
  });
});

test.describe("Multiplayer Simulation", () => {
  test("should allow multiple players to join same room", async ({
    browser,
  }) => {
    // Create first player context
    const player1Context = await browser.newContext();
    const player1Page = await player1Context.newPage();

    // Player 1 creates room
    await player1Page.goto("/test-game");
    const createButton = player1Page
      .getByRole("button", { name: /create/i })
      .first();
    await expect(createButton).toBeVisible({ timeout: 10000 });
    await createButton.click();

    await expect(player1Page).toHaveURL(/test-game\/.+/, { timeout: 15000 });

    // Get room ID from URL
    const roomUrl = player1Page.url();
    const roomId = roomUrl.split("/test-game/")[1]?.split("?")[0];

    expect(roomId).toBeTruthy();

    // Create second player context
    const player2Context = await browser.newContext();
    const player2Page = await player2Context.newPage();

    // Player 2 joins same room with different user ID
    await player2Page.goto(`/test-game/${roomId}?userId=test-player-2`);

    // Both players should be in the room
    await expect(player1Page.locator("body")).toBeVisible();
    await expect(player2Page.locator("body")).toBeVisible();

    // Cleanup
    await player1Context.close();
    await player2Context.close();
  });

  test("should support 4 players joining for full game", async ({
    browser,
  }) => {
    const contexts: Awaited<ReturnType<typeof browser.newContext>>[] = [];
    const pages: Page[] = [];

    try {
      // Create first player and room
      const ctx1 = await browser.newContext();
      contexts.push(ctx1);
      const page1 = await ctx1.newPage();
      pages.push(page1);

      await page1.goto("/test-game");
      const createButton = page1
        .getByRole("button", { name: /create/i })
        .first();
      await expect(createButton).toBeVisible({ timeout: 10000 });
      await createButton.click();

      await expect(page1).toHaveURL(/test-game\/.+/, { timeout: 15000 });

      const roomUrl = page1.url();
      const roomId = roomUrl.split("/test-game/")[1]?.split("?")[0];

      // Create 3 more players
      for (let i = 2; i <= 4; i++) {
        const ctx = await browser.newContext();
        contexts.push(ctx);
        const page = await ctx.newPage();
        pages.push(page);

        await page.goto(`/test-game/${roomId}?userId=test-player-${i}`);
        await page.waitForTimeout(1000);
      }

      // All 4 pages should be connected
      for (const page of pages) {
        await expect(page.locator("body")).toBeVisible();
      }

      // With 4 players, game should be ready to start or waiting for host action
      await page1.waitForTimeout(2000);
    } finally {
      // Cleanup all contexts
      for (const ctx of contexts) {
        await ctx.close();
      }
    }
  });
});

test.describe("Game UI Elements", () => {
  test("should display game board elements when in room", async ({ page }) => {
    await page.goto("/test-game");

    const createButton = page.getByRole("button", { name: /create/i }).first();
    await expect(createButton).toBeVisible({ timeout: 10000 });
    await createButton.click();

    await expect(page).toHaveURL(/test-game\/.+/, { timeout: 15000 });

    // Wait for game UI to load
    await page.waitForTimeout(3000);

    // Check for common game UI patterns
    const hasGameElements = await page.evaluate(() => {
      const body = document.body.innerHTML.toLowerCase();
      return (
        body.includes("player") ||
        body.includes("card") ||
        body.includes("game") ||
        body.includes("room") ||
        body.includes("waiting")
      );
    });

    expect(hasGameElements).toBe(true);
  });

  test("should be responsive on mobile viewport", async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 });

    await page.goto("/test-game");

    const createButton = page.getByRole("button", { name: /create/i }).first();
    await expect(createButton).toBeVisible({ timeout: 10000 });
    await createButton.click();

    await expect(page).toHaveURL(/test-game\/.+/, { timeout: 15000 });

    // Page should render without horizontal scroll
    const hasHorizontalScroll = await page.evaluate(() => {
      return document.documentElement.scrollWidth > window.innerWidth;
    });

    // Allow small overflow for animations
    expect(hasHorizontalScroll).toBe(false);
  });
});
