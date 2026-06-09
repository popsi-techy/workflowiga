"use client";

import { useState } from "react";
import { Check, Plus, Minus, SlidersHorizontal, X } from "lucide-react";
import { cn } from "@/lib/cn";
import { useWorkflowStore } from "@/lib/workflow/store";
import {
  BOOLEAN_ATTRIBUTES,
  BOOLEAN_CASE_LABELS,
  BOOLEAN_CASE_ORDER,
  syncConditionalV2Branches,
} from "@/lib/workflow/boolean-branch";
import {
  APPROVAL_V2_ATTRIBUTE_GROUPS,
  approvalV2AttributeGroupId,
  formatApprovalConditionRule,
  RELATIONSHIP_BOOLEAN_ATTRIBUTES,
} from "@/lib/workflow/approval-conditional-v2";
import { ConfigBody, ConfigInset, ConfigRow, ConfigSection } from "./config-layout";
import { Switch } from "../Switch";
import { Drawer } from "../Drawer";
import { ConditionBuilder } from "./ConditionBuilder";
import { uid } from "@/lib/workflow/defaults";
import { CONDITIONAL_ATTRIBUTES } from "@/lib/workflow/mock-data";
import type {
  AdvancedCondition,
  BooleanCaseValue,
  ConditionalBranchV2Data,
  WorkflowNode,
} from "@/lib/workflow/types";

const CASE_COLORS: Record<BooleanCaseValue, { base: string; active: string }> = {
  true:  { base: "border-emerald-200 text-emerald-700 hover:bg-emerald-50",  active: "bg-emerald-500 border-emerald-500 text-white" },
  false: { base: "border-red-200    text-red-700    hover:bg-red-50",        active: "bg-red-500    border-red-500    text-white" },
  any:   { base: "border-sky-200    text-sky-700    hover:bg-sky-50",        active: "bg-sky-500    border-sky-500    text-white" },
  none:  { base: "border-slate-200  text-slate-600  hover:bg-slate-50",      active: "bg-slate-500  border-slate-500  text-white" },
};

type AttributeSectionId = "request_initiator" | "target_user" | "manager";
type AdvancedSectionId = AttributeSectionId | "advanced";

function resolveAdvancedSection(
  adv: AdvancedCondition,
  pendingGroupId: string | undefined,
): AdvancedSectionId {
  if (pendingGroupId === "advanced") return "advanced";
  const firstAttr = adv.condition.conditions.find((c) => c.attribute)?.attribute;
  const attrGroup = firstAttr ? approvalV2AttributeGroupId(firstAttr) : null;
  if (
    attrGroup === "request_initiator" ||
    attrGroup === "target_user" ||
    attrGroup === "manager"
  ) {
    return attrGroup;
  }
  if (
    pendingGroupId === "request_initiator" ||
    pendingGroupId === "target_user" ||
    pendingGroupId === "manager"
  ) {
    return pendingGroupId;
  }
  return "advanced";
}

function summarizeAdvanced(adv: AdvancedCondition): string {
  const conds = adv.condition.conditions;
  if (conds.length === 0) return "Set condition";
  const firstTwo = conds.slice(0, 2).map(formatApprovalConditionRule);
  let summary = firstTwo.join(` ${adv.condition.logic} `);
  if (conds.length > 2) summary += ` +${conds.length - 2}`;
  return summary;
}

function RelationshipAttributeRow({
  attr,
  isSelected,
  selectedCases,
  onToggleAttribute,
  onToggleCase,
}: {
  attr: (typeof BOOLEAN_ATTRIBUTES)[number];
  isSelected: boolean;
  selectedCases: BooleanCaseValue[];
  onToggleAttribute: () => void;
  onToggleCase: (caseVal: BooleanCaseValue) => void;
}) {
  return (
    <div className="flex flex-col">
      <button
        type="button"
        onClick={onToggleAttribute}
        className={cn(
          "flex w-full items-center gap-2.5 rounded-lg border px-3 py-2.5 text-left transition-all",
          isSelected
            ? "border-[var(--accent)]/50 bg-[var(--accent-softer)]/60 shadow-sm"
            : "border-[var(--border)] bg-white hover:border-[var(--accent)]/30 hover:bg-[var(--muted)]/30",
        )}
      >
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
        <span
          className={cn(
            "flex-1 text-[12px] leading-snug",
            isSelected
              ? "font-semibold text-[var(--foreground)]"
              : "font-medium text-[var(--muted-fg)]",
          )}
        >
          {attr.label}
        </span>
        {isSelected && (
          <span className="shrink-0 rounded-full bg-[var(--accent-soft)] px-2 py-0.5 text-[10px] font-semibold text-[var(--accent)]">
            {selectedCases.length} {selectedCases.length === 1 ? "branch" : "branches"}
          </span>
        )}
        <span
          className={cn(
            "flex h-5 w-5 shrink-0 items-center justify-center rounded-full transition-colors",
            isSelected ? "bg-[var(--accent)]/10 text-[var(--accent)]" : "text-[var(--muted-fg)]",
          )}
        >
          {isSelected ? <Minus className="h-3 w-3" /> : <Plus className="h-3 w-3" />}
        </span>
      </button>

      {isSelected && (
        <div className="ml-5 mt-2 flex flex-col gap-2 rounded-lg border border-dashed border-[var(--border-strong)] bg-white px-3 py-2.5">
          <div className="text-[11px] font-semibold uppercase tracking-wider text-[var(--muted-fg)]">
            Select branch values
          </div>
          <div className="flex flex-wrap gap-2">
            {BOOLEAN_CASE_ORDER.map((caseVal) => {
              const active = selectedCases.includes(caseVal);
              return (
                <button
                  key={caseVal}
                  type="button"
                  onClick={() => onToggleCase(caseVal)}
                  className={cn(
                    "inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-[12px] font-semibold transition-colors cursor-pointer",
                    active ? CASE_COLORS[caseVal].active : CASE_COLORS[caseVal].base,
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
}

function AttributeConditionCard({
  adv,
  index,
  onEdit,
  onRemove,
  onRename,
  badgeLabel,
}: {
  adv: AdvancedCondition;
  index: number;
  onEdit: () => void;
  onRemove: () => void;
  onRename: (name: string) => void;
  badgeLabel?: string;
}) {
  const summary = summarizeAdvanced(adv);

  return (
    <div className="overflow-hidden rounded-md border border-[var(--border)] bg-white">
      <div className="flex items-center gap-1.5 border-b border-[var(--border)]/70 bg-[var(--muted)]/25 px-2.5 py-1.5">
        <span className="inline-flex shrink-0 rounded px-1 py-px text-[9px] font-bold uppercase tracking-wide bg-[var(--accent-softer)] text-[#9A3412]">
          {badgeLabel ?? `Condition ${index + 1}`}
        </span>
        <input
          type="text"
          value={adv.name}
          onChange={(e) => onRename(e.target.value)}
          placeholder="Condition name"
          className="min-w-0 flex-1 bg-transparent text-[11.5px] font-medium text-[var(--foreground)] outline-none placeholder:text-[var(--muted-fg)]"
        />
        <button
          type="button"
          onClick={onEdit}
          title="Configure conditions"
          className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md text-[var(--muted-fg)] hover:bg-[var(--accent-softer)] hover:text-[var(--accent)]"
        >
          <SlidersHorizontal className="h-3.5 w-3.5" />
        </button>
        <button
          type="button"
          onClick={onRemove}
          title="Remove condition"
          className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md text-[var(--muted-fg)] hover:bg-red-50 hover:text-red-600"
        >
          <X className="h-3.5 w-3.5" />
        </button>
      </div>
      <button
        type="button"
        onClick={onEdit}
        className="flex w-full items-center gap-2 px-2.5 py-2 text-left transition-colors hover:bg-[var(--muted)]/30"
      >
        <span
          className={cn(
            "min-w-0 flex-1 truncate text-[11px]",
            adv.condition.conditions.length > 0
              ? "text-[var(--foreground)]"
              : "text-[var(--muted-fg)]",
          )}
        >
          {summary}
        </span>
      </button>
    </div>
  );
}

export function ConditionalBranchV2Config({
  node,
  onPatch,
}: {
  node: WorkflowNode;
  onPatch?: (fields: Partial<ConditionalBranchV2Data>) => void;
}) {
  const data = node.data as ConditionalBranchV2Data;
  const updateNode = useWorkflowStore((s) => s.updateNode);
  const editorContext = useWorkflowStore((s) => s.editorContext);
  const isWorkflow = editorContext === "workflow";
  const [advancedEditingId, setAdvancedEditingId] = useState<string | null>(null);
  const [editingGroupId, setEditingGroupId] = useState<string | null>(null);
  const [pendingGroupById, setPendingGroupById] = useState<Record<string, string>>({});
  const [showAllRelationships, setShowAllRelationships] = useState(false);

  const RELATIONSHIP_INITIAL_COUNT = 3;
  const visibleRelationshipAttributes = BOOLEAN_ATTRIBUTES.filter((attr, idx) => {
    if (showAllRelationships) return true;
    if (idx < RELATIONSHIP_INITIAL_COUNT) return true;
    return data.selectedAttributes.includes(attr.value);
  });
  const hiddenRelationshipCount =
    BOOLEAN_ATTRIBUTES.length - visibleRelationshipAttributes.length;

  const advancedConditions = data.advancedConditions ?? [];
  const editingAdvancedIndex = advancedConditions.findIndex((a) => a.id === advancedEditingId);
  const editingAdvanced =
    editingAdvancedIndex >= 0 ? advancedConditions[editingAdvancedIndex] : undefined;

  function patch(fields: Partial<ConditionalBranchV2Data>) {
    const merged = { ...data, ...fields };
    const synced = syncConditionalV2Branches(merged, data.branches);
    if (onPatch) {
      onPatch(synced);
    } else {
      updateNode(node.id, synced as Partial<ConditionalBranchV2Data>);
    }
  }

  function handleAddAdvanced(groupId: string) {
    const newId = uid("c");
    const nextList = [
      ...advancedConditions,
      {
        id: newId,
        name: "",
        condition: { logic: "AND" as const, conditions: [] },
      },
    ];
    setPendingGroupById((prev) => ({ ...prev, [newId]: groupId }));
    patch({ advancedConditions: nextList });
    setEditingGroupId(groupId);
    setAdvancedEditingId(newId);
  }

  function handleRemoveAdvanced(id: string) {
    patch({ advancedConditions: advancedConditions.filter((a) => a.id !== id) });
    if (advancedEditingId === id) {
      setAdvancedEditingId(null);
      setEditingGroupId(null);
    }
    setPendingGroupById((prev) => {
      const next = { ...prev };
      delete next[id];
      return next;
    });
  }

  function handlePatchAdvanced(
    id: string,
    fields: Partial<(typeof advancedConditions)[0]>,
  ) {
    patch({
      advancedConditions: advancedConditions.map((a) =>
        a.id === id ? { ...a, ...fields } : a,
      ),
    });
  }

  function toggleAttribute(attrValue: string) {
    const isSelected = data.selectedAttributes.includes(attrValue);
    if (isSelected) {
      const nextSelected = data.selectedAttributes.filter((a) => a !== attrValue);
      const nextCases = { ...data.attributeCases };
      delete nextCases[attrValue];
      patch({ selectedAttributes: nextSelected, attributeCases: nextCases });
    } else {
      patch({ selectedAttributes: [...data.selectedAttributes, attrValue] });
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

  const isEntityGroup =
    editingGroupId === "request_initiator" ||
    editingGroupId === "target_user" ||
    editingGroupId === "manager";

  const advancedExpressionGroups = [
    { label: "Relationship conditions", attributes: RELATIONSHIP_BOOLEAN_ATTRIBUTES },
    ...APPROVAL_V2_ATTRIBUTE_GROUPS,
  ];

  const drawerGroups = isWorkflow
    ? undefined
    : isEntityGroup
      ? APPROVAL_V2_ATTRIBUTE_GROUPS.filter((g) => g.id === editingGroupId)
      : advancedExpressionGroups;

  const drawerAttributes = isWorkflow
    ? CONDITIONAL_ATTRIBUTES
    : isEntityGroup
      ? (drawerGroups ?? []).flatMap((g) => g.attributes)
      : [
          ...RELATIONSHIP_BOOLEAN_ATTRIBUTES,
          ...APPROVAL_V2_ATTRIBUTE_GROUPS.flatMap((g) => g.attributes),
          ...CONDITIONAL_ATTRIBUTES.filter(
            (a) =>
              !APPROVAL_V2_ATTRIBUTE_GROUPS.some((g) =>
                g.attributes.some((ga) => ga.value === a.value),
              ) && !RELATIONSHIP_BOOLEAN_ATTRIBUTES.some((r) => r.value === a.value),
          ),
        ];

  return (
    <div className="flex h-full flex-col">
      <ConfigBody>
        <ConfigInset>
          <ConfigRow
            label="Include else branch"
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

        <ConfigSection
          title="Relationship conditions"
          subtitle="Pick a relationship, then activate True, False, Any, or None to create a branch for each value."
          inset={false}
        >
          <div className="flex flex-col gap-2">
            {visibleRelationshipAttributes.map((attr) => (
              <RelationshipAttributeRow
                key={attr.value}
                attr={attr}
                isSelected={data.selectedAttributes.includes(attr.value)}
                selectedCases={data.attributeCases[attr.value] ?? []}
                onToggleAttribute={() => toggleAttribute(attr.value)}
                onToggleCase={(caseVal) => toggleCase(attr.value, caseVal)}
              />
            ))}

            {hiddenRelationshipCount > 0 ? (
              <button
                type="button"
                onClick={() => setShowAllRelationships(true)}
                className="mt-1 flex w-full items-center justify-center gap-1.5 rounded-lg border border-dashed border-[var(--border-strong)] bg-white py-2 text-[12px] font-medium text-[var(--accent)] transition-all hover:border-[var(--accent)]/30 hover:bg-[var(--accent-soft)]/30"
              >
                Load {hiddenRelationshipCount} more{" "}
                {hiddenRelationshipCount === 1 ? "condition" : "conditions"}
              </button>
            ) : (
              showAllRelationships &&
              BOOLEAN_ATTRIBUTES.length > RELATIONSHIP_INITIAL_COUNT && (
                <button
                  type="button"
                  onClick={() => setShowAllRelationships(false)}
                  className="mt-1 flex w-full items-center justify-center gap-1.5 rounded-lg border border-dashed border-[var(--border-strong)] bg-white py-2 text-[12px] font-medium text-[var(--muted-fg)] transition-all hover:bg-[var(--muted)]/50 hover:text-[var(--foreground)]"
                >
                  Show less
                </button>
              )
            )}
          </div>

        </ConfigSection>

        {!isWorkflow &&
          APPROVAL_V2_ATTRIBUTE_GROUPS.map((group) => {
            const groupConditions = advancedConditions.filter(
              (adv) =>
                resolveAdvancedSection(adv, pendingGroupById[adv.id]) === group.id,
            );

            return (
              <ConfigSection
                key={group.id}
                title={group.label}
                subtitle="Department, location, and job title rules using operators and values."
                inset={false}
              >
                <div className="flex flex-col gap-2">
                  {groupConditions.map((adv) => {
                    const globalIndex = advancedConditions.findIndex((a) => a.id === adv.id);
                    return (
                      <AttributeConditionCard
                        key={adv.id}
                        adv={adv}
                        index={globalIndex}
                        onEdit={() => {
                          setEditingGroupId(group.id);
                          setAdvancedEditingId(adv.id);
                        }}
                        onRemove={() => handleRemoveAdvanced(adv.id)}
                        onRename={(name) => handlePatchAdvanced(adv.id, { name })}
                      />
                    );
                  })}

                  <button
                    type="button"
                    onClick={() => handleAddAdvanced(group.id)}
                    className="inline-flex h-7 items-center gap-1 self-start rounded border border-dashed border-[var(--border)] px-2 text-[11px] font-medium text-[var(--muted-fg)] hover:border-[var(--accent)] hover:text-[var(--foreground)]"
                  >
                    <Plus className="h-3 w-3" />
                    Add condition
                  </button>
                </div>
              </ConfigSection>
            );
          })}

        <ConfigSection
          title="Advanced expressions"
          subtitle={
            isWorkflow
              ? "Add custom conditions using the expression builder."
              : "Combine relationship, request, target user, and manager attributes in custom rules. Runs after relationship branches."
          }
          inset={false}
        >
          <div className="flex flex-col gap-2">
            {(isWorkflow
              ? advancedConditions
              : advancedConditions.filter(
                  (adv) =>
                    resolveAdvancedSection(adv, pendingGroupById[adv.id]) === "advanced",
                )
            ).map((adv, index) => (
              <AttributeConditionCard
                key={adv.id}
                adv={adv}
                index={index}
                badgeLabel={`Advanced ${index + 1}`}
                onEdit={() => {
                  setEditingGroupId(isWorkflow ? "workflow" : "advanced");
                  setAdvancedEditingId(adv.id);
                }}
                onRemove={() => handleRemoveAdvanced(adv.id)}
                onRename={(name) => handlePatchAdvanced(adv.id, { name })}
              />
            ))}
            <button
              type="button"
              onClick={() => handleAddAdvanced(isWorkflow ? "workflow" : "advanced")}
              className="inline-flex h-7 items-center gap-1 self-start rounded border border-dashed border-[var(--border)] px-2 text-[11px] font-medium text-[var(--muted-fg)] hover:border-[var(--accent)] hover:text-[var(--foreground)]"
            >
              <Plus className="h-3 w-3" />
              Add advanced expression
            </button>
          </div>
        </ConfigSection>
      </ConfigBody>

      <Drawer
        open={!!editingAdvanced}
        onClose={() => {
          setAdvancedEditingId(null);
          setEditingGroupId(null);
        }}
        title={
          editingAdvanced?.name ||
          (editingGroupId === "advanced" || editingGroupId === "workflow"
            ? "Advanced expression"
            : "Attribute condition")
        }
        description={
          editingGroupId === "advanced" || editingGroupId === "workflow"
            ? "Build custom rules using categorized request, target user, and manager attributes."
            : "Define department, location, or job title rules."
        }
        icon={SlidersHorizontal}
        iconCategory="rules"
        width={560}
      >
        {editingAdvanced && (
          <ConditionBuilder
            attributes={drawerAttributes}
            attributeGroups={isWorkflow ? undefined : drawerGroups}
            logic={editingAdvanced.condition.logic}
            conditions={editingAdvanced.condition.conditions}
            onLogicChange={(logic) =>
              handlePatchAdvanced(editingAdvanced.id, {
                condition: { ...editingAdvanced.condition, logic },
              })
            }
            onChange={(conditions) =>
              handlePatchAdvanced(editingAdvanced.id, {
                condition: { ...editingAdvanced.condition, conditions },
              })
            }
          />
        )}
      </Drawer>
    </div>
  );
}
