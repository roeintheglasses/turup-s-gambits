import { test, expect } from "@playwright/test";

test.describe("Homepage", () => {
  test("should load homepage successfully", async ({ page }) => {
    await page.goto("/");

    // Check page title
    await expect(page).toHaveTitle(/Turup/i);

    // Check main heading is visible
    await expect(
      page.getByRole("heading", { name: /turup/i }).first()
    ).toBeVisible();
  });

  test("should display navigation elements", async ({ page }) => {
    await page.goto("/");

    // Check for main CTA buttons
    await expect(page.getByRole("button", { name: /play/i }).first()).toBeVisible();
  });

  test("should have responsive layout on mobile", async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 });
    await page.goto("/");

    // Page should still be functional on mobile
    await expect(page.locator("body")).toBeVisible();
  });
});

test.describe("Navigation", () => {
  test("should navigate to login page", async ({ page }) => {
    await page.goto("/");

    // Look for sign in link/button
    const signInLink = page.getByRole("link", { name: /sign in/i }).first();
    if (await signInLink.isVisible()) {
      await signInLink.click();
      await expect(page).toHaveURL(/sign-in|login/);
    }
  });

  test("should navigate to terms of service", async ({ page }) => {
    await page.goto("/terms-of-service");
    await expect(page).toHaveURL(/terms-of-service/);
    await expect(page.getByText(/terms/i).first()).toBeVisible();
  });
});
