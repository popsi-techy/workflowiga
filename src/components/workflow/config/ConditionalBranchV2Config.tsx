"use client";

import { useState } from "react";
import { Check, Plus, Minus } from "lucide-react";
import { cn } from "@/lib/cn";
import { useWorkflowStore } from "@/lib/workflow/store";
import {
  BOOLEAN_ATTRIBUTES,
  BOOLEAN_CASE_LABELS,
  BOOLEAN_CASE_ORDER,
  syncConditionalV2Branches,
} from "@/lib/workflow/boolean-branch";
import { ConfigBody, ConfigInset, ConfigRow, ConfigSection } from "./config-layout";
import { Switch } from "../Switch";
import type {
  BooleanCaseValue,
  ConditionalBranchV2Data,
  WorkflowNode,
} from "@/lib/workflow/types";

// ── Case styling ────────────────────────────────────────────────────────────

const CASE_COLORS: Record<BooleanCaseValue, { base: string; active: string }> = {
  true:  { base: "border-emerald-200 text-emerald-700 hover:bg-emerald-50",  active: "bg-emerald-500 border-emerald-500 text-white" },
  false: { base: "border-red-200    text-red-700    hover:bg-red-50",        active: "bg-red-500    border-red-500    text-white" },
  any:   { base: "border-sky-200    text-sky-700    hover:bg-sky-50",        active: "bg-sky-500    border-sky-500    text-white" },
  none:  { base: "border-slate-200  text-slate-600  hover:bg-slate-50",      active: "bg-slate-500  border-slate-500  text-white" },
};

// ── Main component ──────────────────────────────────────────────────────────

export function ConditionalBranchV2Config({
  node,
  onPatch,
}: {
  node: WorkflowNode;
  onPatch?: (fields: Partial<ConditionalBranchV2Data>) => void;
}) {
  const data = node.data as ConditionalBranchV2Data;
  const updateNode = useWorkflowStore((s) => s.updateNode);
  const [showAll, setShowAll] = useState(false);

  function patch(fields: Partial<ConditionalBranchV2Data>) {
    const merged = { ...data, ...fields };
    const synced = syncConditionalV2Branches(merged, data.branches);
    if (onPatch) {
      onPatch(synced);
    } else {
      updateNode(node.id, synced as Partial<ConditionalBranchV2Data>);
    }
  }

  function toggleAttribute(attrValue: string) {
    const isSelected = data.selectedAttributes.includes(attrValue);
    if (isSelected) {
      const nextSelected = data.selectedAttributes.filter((a) => a !== attrValue);
      const nextCases = { ...data.attributeCases };
      delete nextCases[attrValue];
      patch({ selectedAttributes: nextSelected, attributeCases: nextCases });
    } else {
      const nextSelected = [...data.selectedAttributes, attrValue];
      patch({ selectedAttributes: nextSelected });
    }
  }

  function toggleCase(attrValue: string, caseVal: BooleanCaseValue) {
    const current = data.attributeCases[attrValue] ?? [];
    const has = current.includes(caseVal);
    const nextCases = has
      ? current.filter((c) => c !== caseVal)
      : [...current, caseVal];

    const nextAttributeCases = { ...data.attributeCases, [attrValue]: nextCases };

    if (nextCases.length === 0) {
      const nextSelected = data.selectedAttributes.filter((a) => a !== attrValue);
      const cleaned = { ...nextAttributeCases };
      delete cleaned[attrValue];
      patch({ selectedAttributes: nextSelected, attributeCases: cleaned });
    } else {
      patch({ attributeCases: nextAttributeCases });
    }
  }

  const totalConditionBranches = data.elseEnabled
    ? data.branches.length - 1
    : data.branches.length;

  const visibleAttributes = BOOLEAN_ATTRIBUTES.filter((attr, idx) => {
    if (showAll) return true;
    if (idx < 3) return true;
    return data.selectedAttributes.includes(attr.value);
  });

  return (
    <div className="flex h-full flex-col">
      <ConfigBody>

        {/* ── Else Branch ────────────────────────────────────────────── */}
        <ConfigInset>
          <ConfigRow
            label="Include Else branch"
            hint="Runs when no condition matched — typically exits or skips the flow"
            action={
              <Switch
                id={`cbv2-else-${node.id}`}
                enabled={data.elseEnabled}
                onChange={(v) => patch({ elseEnabled: v })}
              />
            }
          />
        </ConfigInset>

        {/* ── Attributes + inline branch builder ─────────────────────── */}
        <ConfigSection
          title="Boolean Attributes"
          subtitle="Pick an attribute, then activate True / False / Any / None to create a branch for each value."
          inset={false}
        >
          <div className="flex flex-col gap-2">
            {visibleAttributes.map((attr) => {
              const isSelected = data.selectedAttributes.includes(attr.value);
              const selectedCases = data.attributeCases[attr.value] ?? [];

              return (
                <div key={attr.value} className="flex flex-col">

                  {/* ── Attribute header row ─────────────────────────── */}
                  <button
                    type="button"
                    onClick={() => toggleAttribute(attr.value)}
                    className={cn(
                      "flex w-full items-center gap-2.5 rounded-lg border px-3 py-2.5 text-left transition-all",
                      isSelected
                        ? "border-[var(--accent)]/50 bg-[var(--accent-softer)]/60 shadow-sm"
                        : "border-[var(--border)] bg-white hover:border-[var(--accent)]/30 hover:bg-[var(--muted)]/30",
                    )}
                  >
                    {/* Checkbox */}
                    <span
                      className={cn(
                        "flex h-4 w-4 shrink-0 items-center justify-center rounded border transition-colors",
                        isSelected
                          ? "border-[var(--accent)] bg-[var(--accent)] text-white"
                          : "border-[var(--border-strong)] bg-white",
                      )}
                    >
                      {isSelected && <Check className="h-2.5 w-2.5" />}
                    </span>

                    {/* Attribute name */}
                    <span
                      className={cn(
                        "flex-1 truncate font-mono text-[11.5px]",
                        isSelected
                          ? "font-semibold text-[var(--foreground)]"
                          : "font-medium text-[var(--muted-fg)]",
                      )}
                    >
                      {attr.label}
                    </span>

                    {/* Branch count pill when selected */}
                    {isSelected && (
                      <span className="shrink-0 rounded-full bg-[var(--accent-soft)] px-2 py-0.5 text-[10px] font-semibold text-[var(--accent)]">
                        {selectedCases.length} {selectedCases.length === 1 ? "branch" : "branches"}
                      </span>
                    )}

                    {/* +/- icon */}
                    <span className={cn(
                      "flex h-5 w-5 shrink-0 items-center justify-center rounded-full transition-colors",
                      isSelected
                        ? "bg-[var(--accent)]/10 text-[var(--accent)]"
                        : "text-[var(--muted-fg)]",
                    )}>
                      {isSelected
                        ? <Minus className="h-3 w-3" />
                        : <Plus className="h-3 w-3" />}
                    </span>
                  </button>

                  {/* ── Case chips ───────────────────────────────────── */}
                  {isSelected && (
                    <div className="ml-5 mt-2 flex flex-col gap-2 rounded-lg border border-dashed border-[var(--border-strong)] bg-white px-3 py-2.5">
                      <div className="text-[11px] font-semibold uppercase tracking-wider text-[var(--muted-fg)]">
                        Select Branch Values
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {BOOLEAN_CASE_ORDER.map((caseVal) => {
                          const active = selectedCases.includes(caseVal);
                          return (
                            <button
                              key={caseVal}
                              type="button"
                              onClick={() => toggleCase(attr.value, caseVal)}
                              className={cn(
                                "inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-[12px] font-semibold transition-colors cursor-pointer",
                                active
                                  ? CASE_COLORS[caseVal].active
                                  : CASE_COLORS[caseVal].base,
                              )}
                            >
                              {active && <Check className="h-3.5 w-3.5" />}
                              {BOOLEAN_CASE_LABELS[caseVal]}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}

            {/* Load more / Show less trigger button */}
            {visibleAttributes.length < BOOLEAN_ATTRIBUTES.length ? (
              <button
                type="button"
                onClick={() => setShowAll(true)}
                className="mt-1 flex w-full items-center justify-center gap-1.5 rounded-lg border border-dashed border-[var(--border-strong)] bg-white py-2 text-[12px] font-medium text-[var(--accent)] hover:bg-[var(--accent-soft)]/30 hover:border-[var(--accent)]/30 transition-all cursor-pointer"
              >
                Load {BOOLEAN_ATTRIBUTES.length - visibleAttributes.length} more attributes
              </button>
            ) : (
              showAll && (
                <button
                  type="button"
                  onClick={() => setShowAll(false)}
                  className="mt-1 flex w-full items-center justify-center gap-1.5 rounded-lg border border-dashed border-[var(--border-strong)] bg-white py-2 text-[12px] font-medium text-[var(--muted-fg)] hover:bg-[var(--muted)]/50 hover:text-[var(--foreground)] transition-all cursor-pointer"
                >
                  Show less
                </button>
              )
            )}
          </div>

          {/* Summary footer */}
          {totalConditionBranches > 0 && (
            <p className="mt-2.5 text-[11px] text-[var(--muted-fg)]">
              <span className="font-semibold text-[var(--foreground)]">{totalConditionBranches}</span>{" "}
              condition {totalConditionBranches !== 1 ? "branches" : "branch"} will be created on the canvas
              {data.elseEnabled && " · plus an Else branch"}.
            </p>
          )}
        </ConfigSection>

      </ConfigBody>
    </div>
  );
}
