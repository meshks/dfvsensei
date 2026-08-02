import { expect, test } from "@playwright/test";

/**
 * Regression coverage for the risk map's three placement modes (PRODUCT_REQUIREMENTS.md
 * Stage 4): drag, numeric input, and reload persistence. Also locks in the declumping
 * fix -- freshly extracted assumptions all default to importance/evidence 5 and would
 * otherwise render as fully overlapping, unclickable chips (found via manual Playwright
 * investigation during development, see git history on app/ventures/[id]/map/page.tsx).
 */

async function createVentureWithAssumptions(page: import("@playwright/test").Page) {
  // Unique per test run: the dev DB isn't reset between e2e runs (see
  // TEST_STRATEGY.md's tracked gap), so a shared substring like "Map E2E" would
  // match every venture ever created by this spec, not just this run's.
  const ventureName = `Map E2E ${Date.now()}-${Math.random().toString(36).slice(2)}`;

  await page.goto("/ventures/new");
  await page.getByLabel("Venture name").fill(ventureName);
  await page.getByRole("button", { name: "Create venture" }).click();
  await page.waitForURL(/\/ventures$/);

  await page.getByRole("link", { name: ventureName }).click();
  await page.waitForURL(/\/ventures\/[^/]+$/);
  const ventureId = page.url().split("/ventures/")[1]!;

  await page.goto(`/ventures/${ventureId}/assumptions`);
  await page.getByRole("button", { name: "Extract assumptions" }).click();
  await expect(page.getByRole("listitem").or(page.locator("li")).first()).toBeVisible();

  return ventureId;
}

test("newly extracted assumptions render as distinct, non-overlapping chips", async ({ page }) => {
  const ventureId = await createVentureWithAssumptions(page);
  await page.goto(`/ventures/${ventureId}/map`);
  await page.waitForTimeout(300);

  const chips = page.locator('button[aria-label*="importance"]');
  await expect(chips).toHaveCount(3);

  const boxes = await Promise.all((await chips.all()).map((chip) => chip.boundingBox()));

  for (let i = 0; i < boxes.length; i += 1) {
    for (let j = i + 1; j < boxes.length; j += 1) {
      const a = boxes[i]!;
      const b = boxes[j]!;
      const distance = Math.hypot(a.x - b.x, a.y - b.y);
      expect(distance).toBeGreaterThan(4); // not exactly overlapping
    }
  }
});

test("dragging a chip updates its scores, and the change survives a reload", async ({ page }) => {
  const ventureId = await createVentureWithAssumptions(page);
  await page.goto(`/ventures/${ventureId}/map`);
  await page.waitForTimeout(300);

  const chip = page.locator('button[aria-label*="importance"]').first();
  const box = (await chip.boundingBox())!;
  const startX = box.x + box.width / 2;
  const startY = box.y + box.height / 2;

  await page.mouse.move(startX, startY);
  await page.mouse.down();
  for (let i = 1; i <= 6; i += 1) {
    await page.mouse.move(startX + i * 12, startY - i * 10, { steps: 2 });
    await page.waitForTimeout(20);
  }
  await page.mouse.up();

  const importanceInput = page.locator("table input").first();
  const evidenceInput = page.locator("table input").nth(1);
  await expect(importanceInput).not.toHaveValue("5");
  await expect(evidenceInput).not.toHaveValue("5");

  const importanceAfterDrag = await importanceInput.inputValue();

  await page.getByRole("button", { name: "Save map" }).click();
  await page.waitForTimeout(300);

  await page.reload();
  await page.waitForTimeout(300);
  await expect(page.locator("table input").first()).toHaveValue(importanceAfterDrag);
});

test("numeric inputs are always available as a non-drag placement method", async ({ page }) => {
  const ventureId = await createVentureWithAssumptions(page);
  await page.goto(`/ventures/${ventureId}/map`);
  await page.waitForTimeout(300);

  const importanceInput = page.locator("table input").first();
  await importanceInput.fill("9");
  await expect(importanceInput).toHaveValue("9");

  await page.getByRole("button", { name: "Save map" }).click();
  await page.waitForTimeout(300);
  await page.reload();
  await page.waitForTimeout(300);
  await expect(page.locator("table input").first()).toHaveValue("9");
});
