import { expect, test } from "@playwright/test";
import pg from "pg";

const { Pool } = pg;

/**
 * The experiment library is venture-independent and there's no listing API
 * (only per-assumption candidate matching, since browsing it is an admin-only
 * concern deferred to Phase 4 per PRODUCT_REQUIREMENTS.md §6). Querying
 * Postgres directly here is test setup, not application behaviour under
 * test -- same DATABASE_URL default as tests/integration/setup.ts.
 */
async function getFirstLibraryId(): Promise<string> {
  const pool = new Pool({
    connectionString:
      process.env.DATABASE_URL ?? "postgres://postgres:postgres@127.0.0.1:5432/dfv_sensei_dev",
  });
  try {
    const { rows } = await pool.query<{ id: string }>(
      "select id from experiment_library order by name asc limit 1",
    );
    if (!rows[0]) throw new Error("No experiment_library entries found -- run pnpm db:seed");
    return rows[0].id;
  } finally {
    await pool.end();
  }
}

/**
 * The window-cleaning regression case (IMPLEMENTATION_PLAN.md §1.5), walked
 * through the real UI end to end: create venture -> idea -> extract
 * assumptions -> place on map -> AI map feedback -> select an assumption ->
 * get recommendations -> create Test Card -> fill thresholds -> mark ready
 * -> record evidence -> Learning Card -> decision -> export. Matches the
 * acceptance criteria in PRODUCT_REQUIREMENTS.md §8.
 *
 * The three experiment-recommendation guardrail assertions (willingness-to-
 * pay requires commitment-grade evidence, technical-performance rejects
 * clickable-prototype and letter-of-intent) are deliberately NOT re-asserted
 * here: AI_PROVIDER=mock returns static fixture data that doesn't vary by
 * assumption content, so this UI test can't meaningfully exercise them. That
 * behaviour is proven end-to-end against realistic (deliberately wrong) AI
 * output in application/experiments/recommend-experiments.test.ts, and in
 * isolation in domain/experiments/guardrails.test.ts -- the right layer for
 * it, not a browser click-through against a provider that ignores its input.
 */

test("window-cleaning venture: idea through decision and export, via the real UI", async ({
  page,
}) => {
  const ventureName = `Glass Cleanliness Inspector ${Date.now()}`;

  // 1. Create venture (Market-Led, per the fixture's origin: a customer problem).
  await page.goto("/ventures/new");
  await page.getByLabel("Venture name").fill(ventureName);
  await page
    .getByLabel("Short description")
    .fill(
      "AI-powered tool that analyses real-time images, measures glass cleanliness, and generates professional inspection reports.",
    );
  await page.getByRole("button", { name: "Create venture" }).click();
  await page.waitForURL(/\/ventures$/);

  await page.getByRole("link", { name: ventureName }).click();
  await page.waitForURL(/\/ventures\/[^/]+$/);
  const ventureId = page.url().split("/ventures/")[1]!;

  // 2. Enter the idea via the guided template.
  await page.goto(`/ventures/${ventureId}/idea`);
  await page.getByLabel("Target customer").fill("window-cleaning companies");
  await page.getByLabel("Problem").fill("they lack objective evidence of glass cleanliness");
  await page.getByLabel("Proposed solution or existing IP").fill("an AI image-analysis tool");
  await page.getByLabel("Desired outcome").fill("clients trust the inspection report");
  await page.getByRole("button", { name: "Generate summary" }).click();
  await expect(page.getByText("AI suggested — edit before saving")).toBeVisible();

  const summaryBox = page.locator("textarea").last();
  await summaryBox.fill(
    "We help window-cleaning companies who lack objective cleanliness evidence by providing AI image analysis, so clients trust the inspection report.",
  );
  await page.getByRole("button", { name: "Save summary" }).click();
  await page.waitForURL(new RegExp(`/ventures/${ventureId}$`));
  await expect(page.getByText(/window-cleaning companies who lack objective/)).toBeVisible();

  // 3. Extract assumptions.
  await page.goto(`/ventures/${ventureId}/assumptions`);
  await page.getByRole("button", { name: "Extract assumptions" }).click();
  await expect(page.getByText("Desirability")).toBeVisible();
  await expect(page.getByText("Feasibility")).toBeVisible();
  await expect(page.getByText("Viability")).toBeVisible();

  // 4. Edit one assumption's score directly (also exercised via numeric inputs on the map).
  const firstImportanceInput = page.locator('input[type="number"]').first();
  await firstImportanceInput.fill("9");
  await firstImportanceInput.blur();

  // 5-6. Place assumptions on the map and request AI feedback.
  await page.goto(`/ventures/${ventureId}/map`);
  await expect(page.locator('button[aria-label*="importance"]')).toHaveCount(3);
  // "Save map" is disabled until a placement actually changes -- nudge one via the
  // numeric fallback (the non-drag placement path) before saving.
  const mapImportanceInput = page.locator("table input").first();
  await mapImportanceInput.fill("7");
  await mapImportanceInput.blur();
  await page.getByRole("button", { name: "Save map" }).click();
  await page.waitForTimeout(200);

  await page.getByRole("button", { name: "Get AI feedback" }).click();
  await expect(page.getByText("AI map feedback")).toBeVisible();

  // Reload to confirm the saved map persists.
  await page.reload();
  await expect(page.locator('button[aria-label*="importance"]')).toHaveCount(3);

  // 7. Select an assumption and get experiment recommendations.
  await page.goto(`/ventures/${ventureId}/assumptions`);
  await page
    .getByRole("link", { name: /Select & get experiment recommendations/ })
    .first()
    .click();
  await page.waitForURL(/\/assumptions\/[^/]+$/);
  const assumptionId = page.url().split("/assumptions/")[1]!;

  await page
    .getByLabel(/What decision will this experiment help you make/)
    .fill("Whether to invest in a paid pilot this quarter.");
  await page.getByRole("button", { name: "Get recommendations" }).click();
  await page.waitForTimeout(300);

  // AI_PROVIDER=mock returns no scored recommendations for a generic assumption (the
  // mock ignores input entirely), so this test creates the Test Card via the same
  // "Create Test Card" link path but against a real seeded library entry fetched
  // directly -- the recommendation *ranking* behaviour itself (including the three
  // guardrail rules) is proven end-to-end in recommend-experiments.test.ts against
  // realistic AI output, which this static mock can't provide.
  const libraryId = await getFirstLibraryId();

  // 8. Create a Test Card for the selected assumption against the seeded library.
  await page.goto(
    `/ventures/${ventureId}/test-cards/new?assumptionId=${assumptionId}&libraryId=${libraryId}&decisionQuestion=${encodeURIComponent("Whether to invest in a paid pilot this quarter.")}`,
  );
  // Must require a UUID, not just "no slash": the "/test-cards/new?..." URL itself
  // matches a bare `[^/]+$` pattern too (the query string has no slashes), which
  // resolves this wait before the client-side redirect to the real id ever happens.
  const uuidPattern = "[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}";
  await page.waitForURL(new RegExp(`/test-cards/${uuidPattern}$`));
  const testCardId = page.url().split("/test-cards/")[1]!;

  // 9. Fill in thresholds and mark ready.
  const successInput = page.getByLabel("Success threshold");
  await successInput.fill("At least 3 signed paid pilots within 30 days");
  await successInput.blur();
  await page.waitForTimeout(200);
  await page.getByRole("button", { name: /Mark as ready/ }).click();
  await expect(page.getByRole("button", { name: /Mark as running/ })).toBeVisible();

  // 10. Record evidence.
  await page.goto(`/ventures/${ventureId}/test-cards/${testCardId}/evidence`);
  await page.locator("#evidence-type").selectOption("commitment");
  await page
    .locator("#evidence-description")
    .fill("Signed a paid pilot agreement with a commercial window-cleaning company.");
  await page.getByRole("button", { name: "Add evidence" }).click();
  await expect(page.getByText("Signed a paid pilot agreement")).toBeVisible();

  // 11. Complete the Learning Card.
  await page.goto(`/ventures/${ventureId}/test-cards/${testCardId}/learning-card`);
  await expect(page.getByLabel("What we believed")).not.toHaveValue("");
  await page
    .getByLabel(/What happened/)
    .first()
    .fill("One paid pilot signed within two weeks.");
  await page
    .getByLabel("Insight")
    .fill("Early, real commitment -- a strong signal despite the small sample.");
  await page.getByRole("button", { name: "Save Learning Card" }).click();
  await page.waitForURL(/\/decision$/);

  // 12. Record the decision. "proceed" is the default-selected type (aria-pressed),
  // and its button text is lowercase in the DOM -- only CSS `capitalize`s it visually.
  await expect(page.getByRole("button", { name: "proceed", exact: true })).toHaveAttribute(
    "aria-pressed",
    "true",
  );
  await page.getByLabel("What changes in the venture").fill("Expand the paid pilot offer.");
  await page.getByRole("button", { name: "Record decision" }).click();
  await page.waitForURL(new RegExp(`/ventures/${ventureId}$`));
  await expect(page.getByText("Proceed")).toBeVisible();
  await expect(page.getByText("Expand the paid pilot offer.")).toBeVisible();

  // 13. Export and confirm the full graph is present.
  await page.goto(`/ventures/${ventureId}/export`);
  await expect(page.getByText(/Test Cards: 1/)).toBeVisible();
  await expect(page.getByText(/Evidence items: 1/)).toBeVisible();
  await expect(page.getByText(/Learning Cards: 1/)).toBeVisible();
  await expect(page.getByText(/Decisions: 1/)).toBeVisible();

  const exportRes = await page.request.get(`/api/ventures/${ventureId}/export`);
  expect(exportRes.ok()).toBe(true);
  const exported = await exportRes.json();
  expect(exported.venture.name).toBe(ventureName);
  expect(exported.testCards).toHaveLength(1);
  expect(exported.testCards[0].evidenceItems).toHaveLength(1);
  expect(exported.testCards[0].learningCard).not.toBeNull();
  expect(exported.decisions).toHaveLength(1);
  expect(exported.decisions[0].decisionType).toBe("proceed");
});
