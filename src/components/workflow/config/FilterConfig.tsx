"use client";

import { useState } from "react";
import { Filter as FilterIcon } from "lucide-react";
import { useWorkflowStore } from "@/lib/workflow/store";
import type { FilterData, WorkflowNode } from "@/lib/workflow/types";
import { ATTRIBUTES } from "@/lib/workflow/mock-data";
import { ConditionBuilder } from "./ConditionBuilder";
import { SectionCard } from "./SectionCard";
import { Drawer } from "../Drawer";
import { ConfigBody, ConfigInset, ConfigSurface } from "./config-layout";

export function FilterConfig({
  node,
  onPatch,
}: {
  node: WorkflowNode;
  onPatch?: (fields: Partial<FilterData>) => void;
}) {
  const data = node.data as FilterData;
  const updateNode = useWorkflowStore((s) => s.updateNode);
  const showToast = useWorkflowStore((s) => s.showToast);
  const [open, setOpen] = useState(false);

  function patch(fields: Partial<FilterData>) {
    if (onPatch) onPatch(fields);
    else updateNode(node.id, fields);
  }

  const validConditions = data.conditions.filter(
    (c) => c.attribute && c.value,
  );
  const count = validConditions.length;

  const summary =
    count === 0
      ? null
      : `${count} ${count === 1 ? "condition" : "conditions"} · ${data.logic}`;

  return (
    <div className="flex h-full flex-col">
      <ConfigBody>
        <p className="px-0.5 text-[10.5px] font-medium uppercase tracking-[0.06em] text-[var(--muted-fg)]">
          Conditions
        </p>
        <ConfigInset>
          <SectionCard
            category="filters"
            icon={FilterIcon}
            title="Define User Conditions"
            description="Configure attribute-based filters with AND / OR logic"
            summary={summary}
            count={count}
            onClick={() => setOpen(true)}
          />

          {count > 0 && (
            <ConfigSurface className="gap-2">
              <p className="text-[10.5px] font-medium uppercase tracking-[0.06em] text-[var(--muted-fg)]">
                Current filter
              </p>
            <div className="flex flex-wrap gap-1.5">
              {validConditions.slice(0, 4).map((c) => {
                const attr = ATTRIBUTES.find((a) => a.value === c.attribute);
                return (
                  <span
                    key={c.id}
                    className="inline-flex h-6 items-center rounded-md bg-white px-2 text-[11.5px] text-[var(--foreground)] ring-1 ring-[var(--border)]"
                  >
                    <strong className="font-semibold">{attr?.label ?? c.attribute}</strong>
                    <span className="mx-1 text-[var(--muted-fg)]">{prettyOp(c.operator)}</span>
                    <span>
                      {Array.isArray(c.value) ? c.value.join(", ") : c.value}
                    </span>
                  </span>
                );
              })}
              {validConditions.length > 4 && (
                <span className="inline-flex h-6 items-center rounded-md bg-[var(--muted)] px-2 text-[11.5px] text-[var(--muted-fg)]">
                  +{validConditions.length - 4} more
                </span>
              )}
            </div>
            </ConfigSurface>
          )}
        </ConfigInset>

      </ConfigBody>

      <Drawer
        open={open}
        onClose={() => setOpen(false)}
        icon={FilterIcon}
        iconCategory="filters"
        title="Define User Conditions"
        description="Workflow runs only for users matching these conditions"
        countChip={count || undefined}
        footer={
          <>
            <button
              onClick={() => setOpen(false)}
              className="h-8 rounded-md px-3 text-[12.5px] font-medium text-[var(--muted-fg)] hover:bg-[var(--muted)]"
            >
              Cancel
            </button>
            <button
              onClick={() => {
                showToast("Filter applied", "success");
                setOpen(false);
              }}
              className="h-8 rounded-md bg-[var(--accent)] px-3 text-[12.5px] font-semibold text-white hover:bg-[var(--accent-hover)]"
            >
              Apply
            </button>
          </>
        }
      >
        <ConditionBuilder
          logic={data.logic}
          conditions={data.conditions}
          onLogicChange={(l) => patch({ logic: l })}
          onChange={(c) => patch({ conditions: c })}
        />
      </Drawer>
    </div>
  );
}

function prettyOp(op: string): string {
  switch (op) {
    case "equals":
      return "equals";
    case "not_equals":
      return "≠";
    case "contains":
      return "contains";
    case "starts_with":
      return "starts with";
    case "in":
      return "in";
    case "not_in":
      return "not in";
    default:
      return op;
  }
}
