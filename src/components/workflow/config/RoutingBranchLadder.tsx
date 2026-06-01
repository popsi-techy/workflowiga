"use client";

import { useState } from "react";
import { Plus, SlidersHorizontal, X } from "lucide-react";
import { cn } from "@/lib/cn";
import {
  routingBranchKeyword,
  type RoutingBranchKeyword,
} from "@/lib/workflow/routing-branch";
import type {
  AttributeDef,
  Condition,
  Logic,
  Operator,
  SplitBranchData,
} from "@/lib/workflow/types";
import { ConditionBuilder } from "./ConditionBuilder";
import { Drawer } from "../Drawer";

const OP_SHORT: Record<Operator, string> = {
  equals: "=",
  not_equals: "≠",
  contains: "contains",
  starts_with: "starts with",
  in: "in",
  not_in: "not in",
  greater_than: ">",
  less_than: "<",
  gte: "≥",
  lte: "≤",
};

function validConditions(branch: SplitBranchData): Condition[] {
  return (branch.condition?.conditions ?? []).filter(
    (c) => c.attribute && (Array.isArray(c.value) ? c.value.length : c.value),
  );
}

/** Compact, read-only summary of a branch's conditions for the ladder body. */
function summarizeBranch(
  branch: SplitBranchData,
  attributes: AttributeDef[],
): string | null {
  const valid = validConditions(branch);
  if (valid.length === 0) return null;
  const logic = branch.condition?.logic ?? "AND";
  const parts = valid.map((c) => {
    const attr = attributes.find((a) => a.value === c.attribute);
    const op = OP_SHORT[c.operator] ?? c.operator;
    const val = Array.isArray(c.value) ? c.value.join(", ") : c.value;
    const unit = attr?.unit ?? "";
    return `${attr?.label ?? c.attribute} ${op} ${unit}${val}`;
  });
  return parts.join(logic === "OR" ? " OR " : " AND ");
}

function KeywordBadge({ keyword }: { keyword: RoutingBranchKeyword }) {
  return (
    <span
      className={cn(
        "inline-flex shrink-0 rounded px-1 py-px text-[9px] font-bold uppercase tracking-wide",
        keyword === "IF" && "bg-[var(--accent)] text-white",
        keyword === "ELSE IF" && "bg-[var(--accent-softer)] text-[#9A3412]",
        keyword === "ELSE" && "bg-[var(--muted)] text-[var(--muted-fg)]",
      )}
    >
      {keyword}
    </span>
  );
}

function canRemoveRoutingBranch(
  index: number,
  total: number,
  hasElseBranch: boolean,
  outcomesMode: boolean,
): boolean {
  if (outcomesMode) return true;
  if (hasElseBranch && index === total - 1) return true;
  return total > 2 && index < total - 1;
}

export function RoutingBranchLadder({
  branches,
  attributes,
  onPatchBranch,
  onAddElseIf,
  onRemoveBranch,
  hideAddElseIf,
  hasElseBranch = true,
  onAddElse,
  outcomesMode,
}: {
  branches: SplitBranchData[];
  /** Attribute set offered to every branch's condition builder. */
  attributes: AttributeDef[];
  onPatchBranch: (branchId: string, fields: Partial<SplitBranchData>) => void;
  onAddElseIf: () => void;
  onRemoveBranch?: (branchId: string) => void;
  /** Hide the generic "Else if" button (decision blocks use outcome chips). */
  hideAddElseIf?: boolean;
  /** When false, the trailing else route was removed. */
  hasElseBranch?: boolean;
  /** Re-add a default else / catch-all route. */
  onAddElse?: () => void;
  /** Outcomes (decision-block) mode: each row is a fixed outcome whose
   *  condition is locked (no editing), there is no trailing catch-all row
   *  (the else path is rendered separately), and any row can be removed. */
  outcomesMode?: boolean;
}) {
  const total = branches.length;
  const [editingId, setEditingId] = useState<string | null>(null);
  const editingIndex = branches.findIndex((b) => b.id === editingId);
  const editingBranch = editingIndex >= 0 ? branches[editingIndex] : undefined;
  const editingCondition = editingBranch?.condition ?? {
    logic: "AND" as Logic,
    conditions: [] as Condition[],
  };

  return (
    <div className="flex flex-col gap-2">
      {branches.map((branch, index) => {
        const keyword = outcomesMode
          ? index === 0
            ? "IF"
            : "ELSE IF"
          : routingBranchKeyword(index, total, { hasElseBranch });
        // In outcomes mode every row is a real outcome — none is the catch-all.
        const isElseCatchAll = !outcomesMode && hasElseBranch && keyword === "ELSE";
        const removable =
          !!onRemoveBranch &&
          (outcomesMode
            ? true
            : canRemoveRoutingBranch(index, total, hasElseBranch, false));
        const summary = summarizeBranch(branch, attributes);

        return (
          <div
            key={branch.id}
            className={cn(
              "overflow-hidden rounded-md border border-[var(--border)] bg-white",
              keyword === "IF" && "ring-1 ring-[var(--accent)]/25",
            )}
          >
            <div className="flex items-center gap-1.5 border-b border-[var(--border)]/70 bg-[var(--muted)]/25 px-2.5 py-1.5">
              <KeywordBadge keyword={keyword} />
              <input
                type="text"
                value={branch.name}
                onChange={(e) =>
                  onPatchBranch(branch.id, { name: e.target.value })
                }
                placeholder={isElseCatchAll ? "Default route" : "Route name"}
                className="min-w-0 flex-1 bg-transparent text-[11.5px] font-medium text-[var(--foreground)] outline-none placeholder:text-[var(--muted-fg)]"
              />
              {!isElseCatchAll && !outcomesMode && (
                <button
                  type="button"
                  onClick={() => setEditingId(branch.id)}
                  aria-label={`Configure ${branch.name || keyword} conditions`}
                  title="Configure conditions"
                  className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md text-[var(--muted-fg)] hover:bg-[var(--accent-softer)] hover:text-[var(--accent)]"
                >
                  <SlidersHorizontal className="h-3.5 w-3.5" />
                </button>
              )}
              {removable && (
                <button
                  type="button"
                  onClick={() => onRemoveBranch(branch.id)}
                  aria-label={`Remove ${branch.name || keyword} route`}
                  className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md text-[var(--muted-fg)] hover:bg-red-50 hover:text-red-600"
                >
                  <X className="h-3 w-3" />
                </button>
              )}
            </div>

            {isElseCatchAll ? (
              <p className="px-2.5 py-2 text-[11px] text-[var(--muted-fg)]">
                All requests that did not match above
              </p>
            ) : outcomesMode ? (
              <div className="flex w-full items-center gap-2 px-2.5 py-2">
                <span
                  className={cn(
                    "min-w-0 flex-1 truncate text-[11px]",
                    summary
                      ? "text-[var(--foreground)]"
                      : "text-[var(--muted-fg)]",
                  )}
                >
                  {summary ?? "—"}
                </span>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => setEditingId(branch.id)}
                className="flex w-full items-center gap-2 px-2.5 py-2 text-left transition-colors hover:bg-[var(--muted)]/30"
              >
                <span
                  className={cn(
                    "min-w-0 flex-1 truncate text-[11px]",
                    summary
                      ? "text-[var(--foreground)]"
                      : "text-[var(--muted-fg)]",
                  )}
                >
                  {summary ?? "Set conditions"}
                </span>
              </button>
            )}
          </div>
        );
      })}

      {!hideAddElseIf && total < 8 && (
        <button
          type="button"
          onClick={onAddElseIf}
          className="inline-flex h-7 items-center gap-1 self-start rounded border border-dashed border-[var(--border)] px-2 text-[11px] font-medium text-[var(--muted-fg)] hover:border-[var(--accent)] hover:text-[var(--foreground)]"
        >
          <Plus className="h-3 w-3" />
          Else if
        </button>
      )}

      {onAddElse && !hasElseBranch && (
        <button
          type="button"
          onClick={onAddElse}
          className="inline-flex h-7 items-center gap-1 self-start rounded border border-dashed border-[var(--border)] px-2 text-[11px] font-medium text-[var(--muted-fg)] hover:border-[var(--accent)] hover:text-[var(--foreground)]"
        >
          <Plus className="h-3 w-3" />
          Else
        </button>
      )}

      <Drawer
        open={!!editingBranch}
        onClose={() => setEditingId(null)}
        title={editingBranch?.name || "Branch conditions"}
        description="Define the conditions a request must match for this branch. First matching branch wins."
        icon={SlidersHorizontal}
        iconCategory="rules"
        width={560}
      >
        {editingBranch && (
          <ConditionBuilder
            attributes={attributes}
            logic={editingCondition.logic}
            conditions={editingCondition.conditions}
            onLogicChange={(logic) =>
              onPatchBranch(editingBranch.id, {
                condition: { ...editingCondition, logic },
              })
            }
            onChange={(conditions) =>
              onPatchBranch(editingBranch.id, {
                condition: { ...editingCondition, conditions },
              })
            }
          />
        )}
      </Drawer>
    </div>
  );
}
