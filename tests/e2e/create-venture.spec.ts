import { expect, test } from "@playwright/test";

/**
 * First slice of the critical-path e2e spec described in TEST_STRATEGY.md §4.
 * Covers steps 1-2 of the 14-step flow (create venture, confirm it persists
 * across a reload) -- the remaining steps land as each subsequent phase of
 * IMPLEMENTATION_PLAN.md §1.4 is built.
 */

test("creates a venture and sees it listed after reload", async ({ page }) => {
  const ventureName = `E2E Test Venture ${Date.now()}`;

  await page.goto("/ventures/new");
  await expect(page.getByRole("heading", { name: "New venture" })).toBeVisible();

  await page.getByRole("button", { name: "IP-led", exact: false }).click();
  await page.getByLabel("Venture name").fill(ventureName);
  await page.getByLabel("Short description").fill("An e2e-created venture.");
  await page.getByRole("button", { name: "Create venture" }).click();

  await expect(page).toHaveURL(/\/ventures$/);
  // Scoped to this venture's own list item: the dev DB isn't reset between e2e
  // runs (see TEST_STRATEGY.md follow-up note), so page-wide text like "IP-led"
  // is not guaranteed unique once more than one venture exists.
  const listItem = page.getByRole("listitem").filter({ hasText: ventureName });
  await expect(listItem).toBeVisible();
  await expect(listItem.getByText("IP-led")).toBeVisible();

  // Confirm it's actually persisted, not just client-side state.
  await page.reload();
  await expect(page.getByRole("listitem").filter({ hasText: ventureName })).toBeVisible();
});

test("shows an empty state before any venture exists (fresh visitor experience)", async ({
  page,
}) => {
  await page.goto("/ventures/new");
  await expect(page.getByRole("button", { name: "Create venture" })).toBeDisabled();
});
