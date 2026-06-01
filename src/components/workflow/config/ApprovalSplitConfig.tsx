"use client";

import { useMemo, useState } from "react";
import { Mail, GitFork, Plus, X } from "lucide-react";
import { useWorkflowStore } from "@/lib/workflow/store";
import { uid } from "@/lib/workflow/defaults";
import { USERS, getUser, ATTRIBUTES, WORKFLOW_SPLIT_ATTRIBUTES } from "@/lib/workflow/mock-data";
import { SectionCard } from "./SectionCard";
import { EntityPickerDrawer, type PickerItem } from "./EntityPickerDrawer";
import { DecisionOutcomesEmpty, DecisionOutcomesSection } from "./ApprovalOutcomes";
import { addOutcomeRoute, separableOutcomes } from "@/lib/workflow/decision-outcomes";
import type { ConditionalBranchData } from "@/lib/workflow/types";
import {
  ConfigBody,
  ConfigField,
  ConfigRow,
  ConfigSection,
  ConfigSelect,
  ConfigMultiSelect,
  ConfigInfoTip,
} from "./config-layout";
import type {
  ApprovalSplitData,
  CompletionMode,
  WorkflowNode,
  SplitBranchData,
  FallbackType,
} from "@/lib/workflow/types";
import {
  branchSplitName,
  getAttributeDef,
  getBranchAttributeValues,
  getSplitAttributeIds,
  syncApprovalSplitAttributes,
  syncBranchSplitFields,
} from "@/lib/workflow/split-by-attribute";

const COMPLETION_MODE_OPTIONS: { value: CompletionMode; label: string }[] = [
  { value: "all", label: "All of them" },
  { value: "any", label: "Any one of them" },
  { value: "majority", label: "Majority (more than half)" },
  { value: "threshold", label: "Threshold (N of M)" },
];

const FALLBACK_TYPES: FallbackType[] = ["Skip", "Block", "Add fallback email"];

export function ApprovalSplitConfig({ node }: { node: WorkflowNode }) {
  const data = node.data as ApprovalSplitData;
  const updateNode = useWorkflowStore((s) => s.updateNode);
  const addDecisionForAction = useWorkflowStore((s) => s.addDecisionForAction);
  const editorContext = useWorkflowStore((s) => s.editorContext);
  const isWorkflow = editorContext === "workflow";
  const decisionExists = useWorkflowStore((s) =>
    data.decisionNodeId
      ? s.nodes.some((n) => n.id === data.decisionNodeId)
      : false,
  );
  const [fallbackDrawerOpen, setFallbackDrawerOpen] = useState(false);

  function patch(fields: Partial<ApprovalSplitData>) {
    updateNode(node.id, fields as Partial<ApprovalSplitData>);
  }

  /** Re-create the combined outcome decision (if the user deleted it) and add
   *  the chosen outcome's route. */
  function handleAddOutcome(outcome: string) {
    const decisionId = addDecisionForAction(node.id);
    if (!decisionId) return;
    const dnode = useWorkflowStore
      .getState()
      .nodes.find((n) => n.id === decisionId);
    if (!dnode) return;
    const ddata = dnode.data as ConditionalBranchData;
    if (separableOutcomes(ddata).includes(outcome)) {
      updateNode(decisionId, addOutcomeRoute(ddata, outcome));
    }
  }

  const userItems = useMemo<PickerItem[]>(
    () =>
      USERS.map((u) => ({
        id: u.id,
        primary: u.name,
        secondary: u.email,
        meta: u.title,
        color: "#0EA5E9",
      })),
    [],
  );

  const fallbackUsers = data.globalFallbackUsers ?? [];
  const fallbackSummary =
    fallbackUsers.length > 0
      ? fallbackUsers.map((id) => getUser(id)?.name ?? id).join(", ")
      : null;

  const splitAttrIds = getSplitAttributeIds(data);
  const hasAttrSplit = splitAttrIds.length >= 1;

  function handleBranchCountChange(newCount: number) {
    const val = Math.max(2, Math.min(8, newCount));
    const current = data.branches.length;
    if (val === current) return;

    if (splitAttrIds.length > 0) {
      if (val > current) {
        const empty = Object.fromEntries(splitAttrIds.map((id) => [id, ""]));
        const added: SplitBranchData[] = [];
        for (let i = current; i < val; i++) {
          added.push(
            syncBranchSplitFields(
              { id: uid("br"), name: branchSplitName(splitAttrIds, empty), levels: [] },
              splitAttrIds,
            ),
          );
        }
        applySplit(splitAttrIds, [...data.branches, ...added]);
      } else {
        applySplit(splitAttrIds, data.branches.slice(0, val));
      }
      return;
    }

    if (val > current) {
      const added: SplitBranchData[] = [];
      for (let i = current; i < val; i++) {
        added.push({ id: uid("br"), name: `Branch ${i + 1}`, levels: [] });
      }
      patch({ branchCount: val, branches: [...data.branches, ...added] });
    } else {
      patch({ branchCount: val, branches: data.branches.slice(0, val) });
    }
  }

  const majorityCount = Math.floor(data.branches.length / 2) + 1;

  const splitAttributes = useMemo(
    () =>
      isWorkflow
        ? WORKFLOW_SPLIT_ATTRIBUTES
        : ATTRIBUTES.filter((a) => a.type === "select" && (a.options?.length ?? 0) > 0),
    [isWorkflow],
  );

  function applySplit(nextAttrIds: string[], branches: SplitBranchData[]) {
    const synced = syncApprovalSplitAttributes({
      ...data,
      branchAttributes: nextAttrIds.length ? nextAttrIds : undefined,
      branchAttribute: nextAttrIds.length === 1 ? nextAttrIds[0] : undefined,
      branches,
      branchCount: branches.length,
    });
    patch(synced);
  }

  function setSplitAttributes(nextAttrIds: string[]) {
    if (nextAttrIds.length === 0) {
      applySplit(
        [],
        data.branches.map((b, i) => ({
          ...b,
          attributeValue: undefined,
          attributeValues: undefined,
          name: `Branch ${i + 1}`,
        })),
      );
      return;
    }

    const branches =
      data.branches.length >= 2
        ? data.branches.map((b) => syncBranchSplitFields(b, nextAttrIds))
        : [
            syncBranchSplitFields(
              { id: uid("br"), name: "Branch 1", levels: [] },
              nextAttrIds,
            ),
            syncBranchSplitFields(
              { id: uid("br"), name: "Branch 2", levels: [] },
              nextAttrIds,
            ),
          ];

    applySplit(nextAttrIds, branches);
  }

  function setBranchAttrValue(branchId: string, attrId: string, value: string) {
    const next = data.branches.map((b) => {
      if (b.id !== branchId) return b;
      const values = { ...getBranchAttributeValues(b, splitAttrIds), [attrId]: value };
      return syncBranchSplitFields({ ...b, attributeValues: values }, splitAttrIds);
    });
    applySplit(splitAttrIds, next);
  }

  function addAttrBranch() {
    if (splitAttrIds.length < 1) return;
    const empty = Object.fromEntries(splitAttrIds.map((id) => [id, ""]));
    const br = syncBranchSplitFields(
      { id: uid("br"), name: branchSplitName(splitAttrIds, empty), levels: [] },
      splitAttrIds,
    );
    applySplit(splitAttrIds, [...data.branches, br]);
  }

  function removeAttrBranch(branchId: string) {
    if (data.branches.length <= 2) return;
    applySplit(
      splitAttrIds,
      data.branches.filter((b) => b.id !== branchId),
    );
  }

  return (
    <div className="flex h-full flex-col">
      <ConfigBody>
        <ConfigSection
          title="Split by attributes"
          subtitle="Define each branch by setting a value for every selected attribute."
          icon={GitFork}
        >
          <ConfigMultiSelect
            id={`split-attrs-${node.id}`}
            placeholder="Select attributes…"
            options={splitAttributes.map((a) => ({
              value: a.value,
              label: a.label,
            }))}
            value={splitAttrIds}
            onChange={setSplitAttributes}
          />

          {hasAttrSplit && (
            <div className="flex flex-col gap-2">
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-1">
                  <p className="text-[10.5px] font-medium text-[var(--foreground)]">
                    Branch definitions
                  </p>
                  <ConfigInfoTip
                    text={
                      splitAttrIds.length === 1
                        ? `Set the ${getAttributeDef(splitAttrIds[0])?.label ?? "attribute"} value for each branch.`
                        : "Set every attribute on each branch, e.g. Location = India and Department = Engineering."
                    }
                  />
                </div>
                <button
                  type="button"
                  onClick={addAttrBranch}
                  className="inline-flex h-7 items-center gap-1 rounded-md border border-[var(--border)] bg-white px-2 text-[11px] font-medium text-[var(--foreground)] hover:bg-[var(--muted)]"
                >
                  <Plus className="h-3 w-3" />
                  Add branch
                </button>
              </div>
              {data.branches.map((branch, idx) => (
                <div
                  key={branch.id}
                  className="rounded-md border border-[var(--border)] bg-white p-2"
                >
                  <div className="mb-1.5 flex items-center justify-between gap-2">
                    <span className="text-[10.5px] font-medium text-[var(--muted-fg)]">
                      Branch {idx + 1}
                    </span>
                    {data.branches.length > 2 && (
                      <button
                        type="button"
                        onClick={() => removeAttrBranch(branch.id)}
                        aria-label={`Remove branch ${idx + 1}`}
                        className="flex h-6 w-6 items-center justify-center rounded-md text-[var(--muted-fg)] hover:bg-red-50 hover:text-red-600"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    )}
                  </div>
                  <div className="flex flex-col gap-1.5">
                    {splitAttrIds.map((attrId) => {
                      const def = getAttributeDef(attrId);
                      const values = getBranchAttributeValues(branch, splitAttrIds);
                      return (
                        <div
                          key={attrId}
                          className="grid grid-cols-[minmax(72px,auto)_1fr] items-center gap-2"
                        >
                          <span className="text-[10.5px] font-medium text-[var(--muted-fg)]">
                            {def?.label ?? attrId}
                          </span>
                          {def?.type === "number" ? (
                            <input
                              type="number"
                              value={values[attrId] ?? ""}
                              onChange={(e) =>
                                setBranchAttrValue(branch.id, attrId, e.target.value)
                              }
                              placeholder={def.unit ? `e.g. 71` : "Value"}
                              className="w-full rounded-md border border-[var(--border)] bg-white px-2 py-1.5 text-[12px] outline-none focus:border-[var(--accent)]"
                            />
                          ) : (
                            <select
                              value={values[attrId] ?? ""}
                              onChange={(e) =>
                                setBranchAttrValue(branch.id, attrId, e.target.value)
                              }
                              className="w-full rounded-md border border-[var(--border)] bg-white py-1.5 pl-2 pr-6 text-[12px] outline-none focus:border-[var(--accent)]"
                            >
                              <option value="" disabled>
                                Select…
                              </option>
                              {(def?.options ?? []).map((opt) => (
                                <option key={opt} value={opt}>
                                  {opt}
                                </option>
                              ))}
                            </select>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          )}
        </ConfigSection>

        <ConfigSection
          title="Parallel Branches"
          subtitle="Branch count & completion rule"
          icon={GitFork}
          action={
            <div className="flex items-center gap-1.5">
              <span className="text-[11px] font-medium text-[var(--muted-fg)]">
                Branches
              </span>
              <input
                type="number"
                min={2}
                max={8}
                value={data.branchCount}
                onChange={(e) => handleBranchCountChange(Number(e.target.value))}
                className="w-16 rounded-md border border-[var(--border)] bg-white px-2 py-1.5 text-[13px] outline-none focus:border-[var(--accent)]"
              />
            </div>
          }
        >
          {isWorkflow && (
            <p className="rounded-md border border-[var(--border)]/60 bg-[var(--muted)]/40 px-2.5 py-1 text-[11px] text-[var(--muted-fg)]">
              All branches run in parallel.
            </p>
          )}

          {!isWorkflow && (
          <ConfigField label="Completion rule" required>
            <ConfigSelect
              id={`completion-mode-${node.id}`}
              value={data.completionMode}
              placeholder=""
              options={COMPLETION_MODE_OPTIONS.map((o) => o.label)}
              valueMap={COMPLETION_MODE_OPTIONS}
              onChange={(v) => patch({ completionMode: v as CompletionMode })}
            />
          </ConfigField>
          )}

          {!isWorkflow && data.completionMode === "threshold" && (
            <ConfigField label="Threshold" required>
              <div className="flex items-center gap-3">
                <input
                  type="number"
                  min={1}
                  max={data.branches.length || 99}
                  value={data.threshold}
                  onChange={(e) =>
                    patch({ threshold: Math.max(1, Number(e.target.value)) })
                  }
                  className="w-20 rounded-md border border-[var(--border)] bg-white px-3 py-2 text-[13px] outline-none focus:border-[var(--accent)]"
                />
                <span className="text-[12px] text-[var(--muted-fg)]">
                  of {data.branches.length} branches must approve
                </span>
              </div>
            </ConfigField>
          )}

          {!isWorkflow && data.completionMode === "majority" && (
            <p className="rounded-md border border-[var(--border)]/60 bg-[var(--muted)]/40 px-2.5 py-1.5 text-[11px] text-[var(--muted-fg)]">
              At least{" "}
              <span className="font-medium text-[var(--foreground)]">
                {majorityCount} of {data.branches.length}
              </span>{" "}
              branches must approve.
            </p>
          )}
        </ConfigSection>

        {!isWorkflow && (
        <ConfigSection
          title="Branch Defaults"
          subtitle="Fallback for all branches"
        >
          <ConfigField label="Global fallback type" required>
            <ConfigSelect
              id={`global-fallback-type-${node.id}`}
              value={data.globalFallbackType || ""}
              placeholder="Select fallback type"
              options={FALLBACK_TYPES}
              onChange={(v) => patch({ globalFallbackType: v as FallbackType | "" })}
            />
          </ConfigField>

          {data.globalFallbackType === "Add fallback email" && (
            <SectionCard
              category="rules"
              icon={Mail}
              title="Select fallback approvers"
              description="Users notified if a branch approver is unavailable"
              summary={fallbackSummary}
              count={fallbackUsers.length}
              onClick={() => setFallbackDrawerOpen(true)}
            />
          )}

          <p className="rounded-md border border-[var(--border)]/60 bg-[var(--muted)]/40 px-2.5 py-1.5 text-[11px] leading-relaxed text-[var(--muted-fg)]">
            Set an SLA deadline per approver via its{" "}
            <strong className="font-medium text-[var(--foreground)]">
              No Action / SLA Breached
            </strong>{" "}
            outcome.
          </p>
        </ConfigSection>
        )}

        {/* Combined outcome — the whole multisplit resolves to one decision
            rendered below it (Approved / Rejected / …). */}
        {!isWorkflow &&
          (data.decisionNodeId && decisionExists ? (
            <DecisionOutcomesSection decisionNodeId={data.decisionNodeId} />
          ) : (
            <DecisionOutcomesEmpty
              decisionKind="approval"
              onAddOutcome={handleAddOutcome}
            />
          ))}

      </ConfigBody>

      <EntityPickerDrawer
        open={fallbackDrawerOpen}
        onClose={() => setFallbackDrawerOpen(false)}
        title="Select fallback approvers"
        description="Notified if a branch approver is unavailable"
        icon={Mail}
        iconCategory="rules"
        items={userItems}
        selectedIds={fallbackUsers}
        onChange={(ids) => patch({ globalFallbackUsers: ids })}
        searchPlaceholder="Search users…"
      />
    </div>
  );
}
