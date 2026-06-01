"use client";

import { Check, Variable } from "lucide-react";
import { cn } from "@/lib/cn";
import {
  APPROVAL_ATTRIBUTES,
  CUSTOM_APPROVER_ATTRS,
  getCustomApproverAttr,
} from "@/lib/workflow/mock-data";
import type { AttributeDef, Condition, Logic, Operator, SkipRule } from "@/lib/workflow/types";
import { Drawer } from "../Drawer";
import { ConditionBuilder } from "./ConditionBuilder";

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

const EMPTY_RULE: SkipRule = { logic: "AND", conditions: [] };

function validConditions(conditions: Condition[]): Condition[] {
  return conditions.filter(
    (c) => c.attribute && (Array.isArray(c.value) ? c.value.length : c.value),
  );
}

/** Compact summary for the config panel trigger card. */
export function customApproverSummary(
  attrId: string,
  rule?: SkipRule,
  attributes: AttributeDef[] = APPROVAL_ATTRIBUTES,
): string | null {
  const label = attrId ? getCustomApproverAttr(attrId)?.label : undefined;
  if (!label) return null;

  const valid = validConditions(rule?.conditions ?? []);
  if (valid.length === 0) return `${label} will approve`;

  const logic = rule?.logic ?? "AND";
  const parts = valid.map((c) => {
    const attr = attributes.find((a) => a.value === c.attribute);
    const op = OP_SHORT[c.operator] ?? c.operator;
    const val = Array.isArray(c.value) ? c.value.join(", ") : c.value;
    const unit = attr?.unit ?? "";
    return `${attr?.label ?? c.attribute} ${op} ${unit}${val}`;
  });
  const when = parts.join(logic === "OR" ? " OR " : " AND ");
  return `${label} will approve when ${when}`;
}

export function CustomApproverDrawer({
  open,
  onClose,
  selectedAttrId,
  approverRule,
  onChange,
}: {
  open: boolean;
  onClose: () => void;
  selectedAttrId: string;
  approverRule?: SkipRule;
  onChange: (attrId: string, rule: SkipRule) => void;
}) {
  const rule = approverRule ?? EMPTY_RULE;

  return (
    <Drawer
      open={open}
      onClose={onClose}
      title="Resolve approver from"
      description="Pick which request attribute determines who approves at this level."
      icon={Variable}
      iconCategory="tasks"
      width={560}
    >
      <div className="flex flex-col gap-4 p-4">
        <div className="flex flex-col gap-1.5">
          <p className="text-[11px] font-medium text-[var(--foreground)]">
            Approver attribute
          </p>
          <p className="text-[11px] leading-relaxed text-[var(--muted-fg)]">
            Resolved from the request context — e.g. Department Head for the
            requester&apos;s department.
          </p>
          <div className="mt-1 flex flex-col gap-1.5">
            {CUSTOM_APPROVER_ATTRS.map((attr) => {
              const selected = selectedAttrId === attr.id;
              return (
                <button
                  key={attr.id}
                  type="button"
                  onClick={() => onChange(attr.id, rule)}
                  className={cn(
                    "flex w-full items-start gap-2.5 rounded-lg border px-3 py-2.5 text-left transition-colors",
                    selected
                      ? "border-[var(--accent)] bg-[var(--accent-softer)]/40 ring-1 ring-[var(--accent)]/25"
                      : "border-[var(--border)] bg-white hover:border-[var(--border-strong)]",
                  )}
                >
                  <span
                    className={cn(
                      "mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-full border",
                      selected
                        ? "border-[var(--accent)] bg-[var(--accent)] text-white"
                        : "border-[var(--border-strong)] bg-white",
                    )}
                  >
                    {selected && <Check className="h-2.5 w-2.5" strokeWidth={3} />}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block text-[12.5px] font-medium text-[var(--foreground)]">
                      {attr.label}
                    </span>
                    <span className="mt-0.5 block text-[11px] leading-snug text-[var(--muted-fg)]">
                      {attr.description}
                    </span>
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {selectedAttrId && (
          <div className="flex flex-col gap-2 border-t border-[var(--border)] pt-4">
            <div>
              <p className="text-[11px] font-medium text-[var(--foreground)]">
                Apply when
              </p>
              <p className="mt-0.5 text-[11px] leading-relaxed text-[var(--muted-fg)]">
                Optional — only use this approver when the request matches these
                conditions. Leave empty to always use{" "}
                {getCustomApproverAttr(selectedAttrId)?.label ?? "this attribute"}.
              </p>
            </div>
            <ConditionBuilder
              flush
              attributes={APPROVAL_ATTRIBUTES}
              logic={rule.logic}
              conditions={rule.conditions}
              onLogicChange={(logic: Logic) =>
                onChange(selectedAttrId, { ...rule, logic })
              }
              onChange={(conditions) =>
                onChange(selectedAttrId, { ...rule, conditions })
              }
            />
          </div>
        )}
      </div>
    </Drawer>
  );
}
