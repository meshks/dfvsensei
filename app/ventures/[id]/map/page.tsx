"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import {
  DndContext,
  KeyboardSensor,
  PointerSensor,
  useDraggable,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import { cn } from "@/lib/cn";

type DfvCategory = "desirability" | "feasibility" | "viability";

interface MapItem {
  id: string;
  statement: string;
  dfvPrimary: DfvCategory;
  importance: number;
  evidenceStrength: number;
}

interface MapFeedback {
  highestRiskAssumptionIds: string[];
  inconsistentPlacements: { assumptionId: string; reason: string }[];
  categoryErrors: { assumptionId: string; reason: string }[];
  underrepresentedDfv: DfvCategory[];
  weakWording: { assumptionId: string; reason: string }[];
  summary: string;
}

const CONTAINER_SIZE = 560;

const DFV_DOT: Record<DfvCategory, string> = {
  desirability: "bg-orange-500",
  feasibility: "bg-blue-500",
  viability: "bg-green-500",
};

const DFV_LABEL: Record<DfvCategory, string> = {
  desirability: "Desirability",
  feasibility: "Feasibility",
  viability: "Viability",
};

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function scoreToPixels(importance: number, evidenceStrength: number) {
  return {
    left: ((10 - evidenceStrength) / 10) * CONTAINER_SIZE,
    top: ((10 - importance) / 10) * CONTAINER_SIZE,
  };
}

function pixelDeltaToScoreDelta(deltaPixels: number): number {
  return (deltaPixels / CONTAINER_SIZE) * 10;
}

interface Offset {
  dx: number;
  dy: number;
}

/**
 * Purely visual per-item nudge so assumptions that share the same score --
 * most commonly every freshly-extracted assumption, which all default to
 * importance/evidence 5 -- don't render as fully overlapping chips that are
 * impossible to individually click or drag. Items sharing a (rounded) score
 * are spread evenly around a small circle, guaranteeing separation regardless
 * of group size. Never affects the stored score: drag deltas are relative
 * pointer movement, independent of this offset.
 */
function computeDeclumpOffsets(items: MapItem[]): Map<string, Offset> {
  const groups = new Map<string, MapItem[]>();
  for (const item of items) {
    const key = `${item.importance.toFixed(1)}:${item.evidenceStrength.toFixed(1)}`;
    const group = groups.get(key);
    if (group) group.push(item);
    else groups.set(key, [item]);
  }

  const offsets = new Map<string, Offset>();
  const radius = 10;
  for (const group of groups.values()) {
    group.forEach((item, i) => {
      if (group.length === 1) {
        offsets.set(item.id, { dx: 0, dy: 0 });
        return;
      }
      const angle = (i / group.length) * 2 * Math.PI;
      offsets.set(item.id, { dx: Math.cos(angle) * radius, dy: Math.sin(angle) * radius });
    });
  }
  return offsets;
}

function Chip({ item, offset }: { item: MapItem; offset: Offset }) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: item.id,
  });
  const { left, top } = scoreToPixels(item.importance, item.evidenceStrength);
  // Centering (-50%) has to live in this same transform, not a Tailwind class --
  // an inline `transform` style overrides any class-based transform entirely, which
  // would otherwise make the chip jump on drag start (losing its centering offset).
  const dragTransform = transform ? `translate3d(${transform.x}px, ${transform.y}px, 0)` : "";
  const style: React.CSSProperties = {
    position: "absolute",
    left: left + offset.dx,
    top: top + offset.dy,
    transform: `translate(-50%, -50%) ${dragTransform}`,
    zIndex: isDragging ? 10 : 1,
  };

  return (
    <button
      ref={setNodeRef}
      type="button"
      style={style}
      {...listeners}
      {...attributes}
      title={item.statement}
      aria-label={`${item.statement} — importance ${item.importance}, evidence strength ${item.evidenceStrength}. Use arrow keys to reposition.`}
      className={cn(
        "flex h-7 w-7 cursor-grab items-center justify-center rounded-full border-2 border-white text-[10px] font-bold text-white shadow focus:ring-2 focus:ring-offset-2 dark:border-neutral-900",
        DFV_DOT[item.dfvPrimary],
        isDragging && "cursor-grabbing",
      )}
    >
      {item.dfvPrimary[0]!.toUpperCase()}
    </button>
  );
}

export default function RiskMapPage() {
  const { id } = useParams<{ id: string }>();
  const [items, setItems] = useState<MapItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [dirty, setDirty] = useState(false);
  const [saving, setSaving] = useState(false);
  const [visibleDfv, setVisibleDfv] = useState<Set<DfvCategory>>(
    new Set(["desirability", "feasibility", "viability"]),
  );
  const [feedback, setFeedback] = useState<MapFeedback | null>(null);
  const [loadingFeedback, setLoadingFeedback] = useState(false);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 4 } }),
    useSensor(KeyboardSensor),
  );

  useEffect(() => {
    fetch(`/api/ventures/${id}/map`)
      .then((r) => r.json())
      .then((data: { items: MapItem[] }) => {
        setItems(data.items);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [id]);

  function handleDragEnd(event: DragEndEvent) {
    const { active, delta } = event;
    if (delta.x === 0 && delta.y === 0) return;
    setItems((prev) =>
      prev.map((item) => {
        if (item.id !== active.id) return item;
        const evidenceStrength = clamp(
          item.evidenceStrength - pixelDeltaToScoreDelta(delta.x),
          0,
          10,
        );
        const importance = clamp(item.importance - pixelDeltaToScoreDelta(delta.y), 0, 10);
        return { ...item, evidenceStrength, importance };
      }),
    );
    setDirty(true);
  }

  function handleNumericChange(
    itemId: string,
    field: "importance" | "evidenceStrength",
    value: number,
  ) {
    setItems((prev) =>
      prev.map((item) => (item.id === itemId ? { ...item, [field]: clamp(value, 0, 10) } : item)),
    );
    setDirty(true);
  }

  async function handleSave() {
    setSaving(true);
    await fetch(`/api/ventures/${id}/map`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        positions: items.map((item) => ({
          assumptionId: item.id,
          importance: item.importance,
          evidenceStrength: item.evidenceStrength,
        })),
      }),
    });
    setSaving(false);
    setDirty(false);
  }

  async function handleGetFeedback() {
    setLoadingFeedback(true);
    const response = await fetch(`/api/ventures/${id}/map/feedback`, { method: "POST" });
    if (response.ok) {
      const data = (await response.json()) as { feedback: MapFeedback };
      setFeedback(data.feedback);
    }
    setLoadingFeedback(false);
  }

  function toggleDfv(category: DfvCategory) {
    setVisibleDfv((prev) => {
      const next = new Set(prev);
      if (next.has(category)) next.delete(category);
      else next.add(category);
      return next;
    });
  }

  const visibleItems = items.filter((item) => visibleDfv.has(item.dfvPrimary));
  const declumpOffsets = useMemo(() => computeDeclumpOffsets(visibleItems), [visibleItems]);

  return (
    <main className="mx-auto max-w-4xl px-6 py-12">
      <Link href={`/ventures/${id}`} className="text-sm text-neutral-500 hover:underline">
        ← Venture
      </Link>
      <div className="mt-2 mb-2 flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Risk map</h1>
        <div className="flex gap-2">
          {items.length > 0 && (
            <button
              type="button"
              onClick={handleGetFeedback}
              disabled={loadingFeedback}
              className="rounded-md border border-neutral-300 px-4 py-2 text-sm font-medium hover:bg-neutral-100 disabled:cursor-not-allowed disabled:opacity-50 dark:border-neutral-700 dark:hover:bg-neutral-800"
            >
              {loadingFeedback ? "Reviewing…" : "Get AI feedback"}
            </button>
          )}
          <button
            type="button"
            onClick={handleSave}
            disabled={!dirty || saving}
            className={cn(
              "rounded-md bg-neutral-900 px-4 py-2 text-sm font-medium text-white dark:bg-white dark:text-neutral-900",
              "hover:bg-neutral-700 disabled:cursor-not-allowed disabled:opacity-50 dark:hover:bg-neutral-200",
            )}
          >
            {saving ? "Saving…" : dirty ? "Save map" : "Saved"}
          </button>
        </div>
      </div>
      <p className="mb-6 text-sm text-neutral-600 dark:text-neutral-400">
        Vertical axis: importance (low at bottom, high at top). Horizontal axis: evidence (strong on
        the left, weak on the right). This is a prioritisation aid, not an objective ranking — drag
        a dot, use arrow keys once focused, or type exact scores below.
      </p>

      <div className="mb-4 flex gap-3 text-sm">
        {(["desirability", "feasibility", "viability"] as const).map((category) => (
          <label key={category} className="flex items-center gap-1.5">
            <input
              type="checkbox"
              checked={visibleDfv.has(category)}
              onChange={() => toggleDfv(category)}
            />
            <span className={cn("h-2 w-2 rounded-full", DFV_DOT[category])} />
            {DFV_LABEL[category]}
          </label>
        ))}
      </div>

      {loading ? (
        <p className="text-sm text-neutral-500">Loading…</p>
      ) : (
        <>
          <DndContext sensors={sensors} onDragEnd={handleDragEnd}>
            <div className="flex justify-center gap-2">
              <div className="flex flex-col items-center justify-between text-xs text-neutral-500">
                <span>High importance</span>
                <span className="[writing-mode:vertical-lr]">Importance</span>
                <span>Low importance</span>
              </div>
              <div>
                <div
                  className="relative border border-neutral-300 bg-neutral-50 dark:border-neutral-700 dark:bg-neutral-900"
                  style={{ width: CONTAINER_SIZE, height: CONTAINER_SIZE }}
                >
                  <div className="pointer-events-none absolute inset-x-0 top-1/2 border-t border-dashed border-neutral-300 dark:border-neutral-700" />
                  <div className="pointer-events-none absolute inset-y-0 left-1/2 border-l border-dashed border-neutral-300 dark:border-neutral-700" />

                  <span className="pointer-events-none absolute top-2 left-2 text-xs font-medium text-neutral-400">
                    Monitor
                  </span>
                  <span className="pointer-events-none absolute top-2 right-2 text-xs font-medium text-red-500">
                    Test first
                  </span>
                  <span className="pointer-events-none absolute bottom-2 left-2 text-xs font-medium text-neutral-400">
                    Supported
                  </span>
                  <span className="pointer-events-none absolute right-2 bottom-2 text-xs font-medium text-neutral-400">
                    Explore later
                  </span>

                  {visibleItems.map((item) => (
                    <Chip
                      key={item.id}
                      item={item}
                      offset={declumpOffsets.get(item.id) ?? { dx: 0, dy: 0 }}
                    />
                  ))}
                </div>
                <div className="mt-1 flex justify-between text-xs text-neutral-500">
                  <span>Strong evidence</span>
                  <span>Evidence</span>
                  <span>Weak evidence</span>
                </div>
              </div>
            </div>
          </DndContext>

          <table className="mt-8 w-full text-sm">
            <thead>
              <tr className="border-b border-neutral-200 text-left text-neutral-500 dark:border-neutral-800">
                <th className="py-2 font-medium">Assumption</th>
                <th className="py-2 font-medium">Importance</th>
                <th className="py-2 font-medium">Evidence</th>
              </tr>
            </thead>
            <tbody>
              {visibleItems.map((item) => (
                <tr key={item.id} className="border-b border-neutral-100 dark:border-neutral-900">
                  <td className="py-2 pr-4">{item.statement}</td>
                  <td className="py-2 pr-4">
                    <input
                      type="number"
                      min={0}
                      max={10}
                      step={0.5}
                      value={item.importance}
                      onChange={(e) =>
                        handleNumericChange(item.id, "importance", Number(e.target.value))
                      }
                      className="w-16 rounded-md border border-neutral-300 px-2 py-1 dark:border-neutral-700 dark:bg-neutral-900"
                    />
                  </td>
                  <td className="py-2">
                    <input
                      type="number"
                      min={0}
                      max={10}
                      step={0.5}
                      value={item.evidenceStrength}
                      onChange={(e) =>
                        handleNumericChange(item.id, "evidenceStrength", Number(e.target.value))
                      }
                      className="w-16 rounded-md border border-neutral-300 px-2 py-1 dark:border-neutral-700 dark:bg-neutral-900"
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {feedback && (
            <section className="mt-8 rounded-lg border border-neutral-200 p-5 dark:border-neutral-800">
              <h2 className="mb-3 text-sm font-medium tracking-wide text-neutral-500 uppercase">
                AI map feedback
              </h2>
              <p className="mb-4">{feedback.summary}</p>

              {feedback.highestRiskAssumptionIds.length > 0 && (
                <FeedbackList
                  title="Highest risk"
                  entries={feedback.highestRiskAssumptionIds.map((assumptionId) => ({
                    assumptionId,
                    reason: undefined,
                  }))}
                  items={items}
                />
              )}
              <FeedbackList
                title="Inconsistent placements"
                entries={feedback.inconsistentPlacements}
                items={items}
              />
              <FeedbackList
                title="Category errors"
                entries={feedback.categoryErrors}
                items={items}
              />
              <FeedbackList title="Weak wording" entries={feedback.weakWording} items={items} />
              {feedback.underrepresentedDfv.length > 0 && (
                <p className="mt-3 text-sm text-neutral-600 dark:text-neutral-400">
                  Underrepresented: {feedback.underrepresentedDfv.join(", ")}
                </p>
              )}
            </section>
          )}
        </>
      )}
    </main>
  );
}

function FeedbackList({
  title,
  entries,
  items,
}: {
  title: string;
  entries: { assumptionId: string; reason?: string }[];
  items: MapItem[];
}) {
  if (entries.length === 0) return null;
  return (
    <div className="mt-3">
      <h3 className="text-xs font-medium text-neutral-500 uppercase">{title}</h3>
      <ul className="mt-1 space-y-1 text-sm">
        {entries.map((entry, i) => {
          const item = items.find((it) => it.id === entry.assumptionId);
          return (
            <li key={`${entry.assumptionId}-${i}`}>
              {item?.statement ?? entry.assumptionId}
              {entry.reason && <span className="text-neutral-500"> — {entry.reason}</span>}
            </li>
          );
        })}
      </ul>
    </div>
  );
}
