/**
 * Deterministic assumption-quality checks. These run without an AI call and
 * back the flags the AI `assumption-quality-review` operation can't reliably
 * judge on its own (exact/near duplication, missing structural fields).
 * See AI_BEHAVIOUR_SPEC.md §3.3 and DOMAIN_MODEL.md §2 (assumption_scores.quality_flags).
 */

export type QualityFlagType =
  | "vague_language"
  | "compound"
  | "non_testable"
  | "missing_actor"
  | "missing_behaviour"
  | "feature_as_assumption"
  | "unfounded_claim"
  | "category_mismatch"
  | "duplicate"
  | "dfv_gap";

export interface QualityFlag {
  type: QualityFlagType;
  detail: string;
  suggestedRewrite?: string;
  /** Present only for `duplicate` flags: the other assumption's id. */
  relatedAssumptionId?: string;
}

export interface AssumptionForQualityCheck {
  id: string;
  statement: string;
  actor: string | null;
  observableBehaviour: string | null;
}

function isBlank(value: string | null): boolean {
  return value === null || value.trim().length === 0;
}

export function detectMissingActor(assumption: AssumptionForQualityCheck): QualityFlag | null {
  if (isBlank(assumption.actor)) {
    return {
      type: "missing_actor",
      detail:
        "This assumption doesn't name who is expected to act or believe something. " +
        'Add a specific actor (e.g. "window-cleaning company owners", not "customers").',
    };
  }
  return null;
}

export function detectMissingBehaviour(assumption: AssumptionForQualityCheck): QualityFlag | null {
  if (isBlank(assumption.observableBehaviour)) {
    return {
      type: "missing_behaviour",
      detail:
        "This assumption doesn't state an observable behaviour or outcome. " +
        "Without one, no experiment can confirm or contradict it.",
    };
  }
  return null;
}

/** Lowercase, strip punctuation, collapse whitespace -- for comparison only, never persisted. */
function normalise(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s]/gu, "")
    .replace(/\s+/g, " ")
    .trim();
}

function wordSet(text: string): Set<string> {
  return new Set(normalise(text).split(" ").filter(Boolean));
}

function jaccardSimilarity(a: Set<string>, b: Set<string>): number {
  if (a.size === 0 && b.size === 0) return 1;
  let intersection = 0;
  for (const word of a) {
    if (b.has(word)) intersection += 1;
  }
  const union = a.size + b.size - intersection;
  return union === 0 ? 0 : intersection / union;
}

const DUPLICATE_SIMILARITY_THRESHOLD = 0.75;

/**
 * Pairwise near-duplicate detection across a set of assumptions. Returns a flag
 * for every assumption that has at least one sufficiently similar counterpart.
 * This is a low-precision aid (surfaced to the user as a suggestion, per
 * CLAUDE.md rule 1), not an automatic merge.
 */
export function detectDuplicates(
  assumptions: readonly AssumptionForQualityCheck[],
): Map<string, QualityFlag> {
  const flags = new Map<string, QualityFlag>();
  const sets = assumptions.map((a) => ({ id: a.id, words: wordSet(a.statement) }));

  for (let i = 0; i < sets.length; i += 1) {
    for (let j = i + 1; j < sets.length; j += 1) {
      const a = sets[i]!;
      const b = sets[j]!;
      const similarity = jaccardSimilarity(a.words, b.words);
      if (similarity >= DUPLICATE_SIMILARITY_THRESHOLD) {
        if (!flags.has(a.id)) {
          flags.set(a.id, {
            type: "duplicate",
            detail: "This assumption looks very similar to another one in this venture.",
            relatedAssumptionId: b.id,
          });
        }
        if (!flags.has(b.id)) {
          flags.set(b.id, {
            type: "duplicate",
            detail: "This assumption looks very similar to another one in this venture.",
            relatedAssumptionId: a.id,
          });
        }
      }
    }
  }

  return flags;
}

/** Runs every deterministic check against one assumption within its venture's full set. */
export function runDeterministicQualityChecks(
  assumption: AssumptionForQualityCheck,
  allAssumptionsInVenture: readonly AssumptionForQualityCheck[],
): QualityFlag[] {
  const flags: QualityFlag[] = [];

  const missingActor = detectMissingActor(assumption);
  if (missingActor) flags.push(missingActor);

  const missingBehaviour = detectMissingBehaviour(assumption);
  if (missingBehaviour) flags.push(missingBehaviour);

  const duplicateFlag = detectDuplicates(allAssumptionsInVenture).get(assumption.id);
  if (duplicateFlag) flags.push(duplicateFlag);

  return flags;
}
