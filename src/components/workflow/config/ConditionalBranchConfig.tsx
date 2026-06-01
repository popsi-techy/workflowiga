"use client";

import { useState } from "react";
import { Mail } from "lucide-react";
import { useWorkflowStore } from "@/lib/workflow/store";
import { CONDITIONAL_ATTRIBUTES, APPROVAL_CONDITIONAL_ATTRIBUTES, USERS, getUser } from "@/lib/workflow/mock-data";
import {
  addElseIfBranch,
  addElseBranch,
  applyConditionCount,
  isConditionalSetupComplete,
  removeConditionBranch,
  removeElseBranch,
  resolveConditionCount,
  resolveElseEnabled,
} from "@/lib/workflow/conditional-branch";
import { RoutingBranchLadder } from "./RoutingBranchLadder";
import { ConditionalBranchSetup } from "./ConditionalBranchSetup";
import { SectionCard } from "./SectionCard";
import { EntityPickerDrawer, type PickerItem } from "./EntityPickerDrawer";
import {
  ConfigBody,
  ConfigField,
  ConfigSection,
  ConfigSelect,
} from "./config-layout";
import type {
  ConditionalBranchData,
  SplitBranchData,
  FallbackType,
  WorkflowNode,
} from "@/lib/workflow/types";
import { useMemo } from "react";

const FALLBACK_TYPES: FallbackType[] = ["Skip", "Block", "Add fallback email"];

export function ConditionalBranchConfig({ node }: { node: WorkflowNode }) {
  const data = node.data as ConditionalBranchData;
  const updateNode = useWorkflowStore((s) => s.updateNode);
  const editorContext = useWorkflowStore((s) => s.editorContext);
  const isWorkflow = editorContext === "workflow";
  const routingAttributes = isWorkflow
    ? CONDITIONAL_ATTRIBUTES
    : APPROVAL_CONDITIONAL_ATTRIBUTES;
  const hasElseBranch = resolveElseEnabled(data);
  const [fallbackDrawerOpen, setFallbackDrawerOpen] = useState(false);
  const [pendingCount, setPendingCount] = useState(
    Math.max(1, resolveConditionCount(data) || 1),
  );

  const setupComplete = isConditionalSetupComplete(data);

  function patch(fields: Partial<ConditionalBranchData>) {
    updateNode(node.id, fields as Partial<ConditionalBranchData>);
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

  function createRoutes() {
    patch(applyConditionCount(data, pendingCount));
  }

  function setConditionCount(next: number) {
    patch(applyConditionCount(data, next));
  }

  function patchBranch(branchId: string, fields: Partial<SplitBranchData>) {
    patch({
      branches: data.branches.map((b) =>
        b.id === branchId ? { ...b, ...fields } : b,
      ),
    });
  }

  function handleAddElseIf() {
    patch(addElseIfBranch(data));
  }

  function handleRemoveBranch(branchId: string) {
    const elseBranch = hasElseBranch
      ? data.branches[data.branches.length - 1]
      : undefined;
    if (elseBranch?.id === branchId) {
      const next = removeElseBranch(data);
      if (next) patch(next);
      return;
    }
    const next = removeConditionBranch(data, branchId);
    if (next) patch(next);
  }

  function handleAddElse() {
    patch(addElseBranch(data));
  }

  return (
    <div className="flex h-full flex-col">
      <ConfigBody>
        {!setupComplete ? (
          <ConfigSection
            title="Set up routing"
            subtitle="Choose how many IF / ELSE IF routes you need before building the flow."
          >
            <ConditionalBranchSetup
              pendingCount={pendingCount}
              onPendingCountChange={setPendingCount}
              onCreate={createRoutes}
            />
          </ConfigSection>
        ) : (
          <>
            <ConfigSection
              title="Conditions"
              subtitle={
                hasElseBranch
                  ? "Checked top to bottom — first match wins. The ELSE row at the bottom runs when nothing above matches."
                  : "Checked top to bottom — first match wins. Unmatched requests stop after the last branch (no else path)."
              }
              action={
                <div className="flex items-center gap-1">
                  <input
                    type="number"
                    min={1}
                    max={7}
                    value={resolveConditionCount(data)}
                    onChange={(e) => setConditionCount(Number(e.target.value))}
                    aria-label="Number of conditions"
                    className="w-11 rounded border border-[var(--border)] bg-white px-1.5 py-0.5 text-center text-[11px] outline-none focus:border-[var(--accent)]"
                  />
                </div>
              }
            >
              <RoutingBranchLadder
                branches={data.branches}
                attributes={routingAttributes}
                onPatchBranch={patchBranch}
                onAddElseIf={handleAddElseIf}
                onRemoveBranch={handleRemoveBranch}
                hasElseBranch={hasElseBranch}
                onAddElse={handleAddElse}
              />
            </ConfigSection>
          </>
        )}

        {!isWorkflow && setupComplete && (
          <ConfigSection
            title="Branch Defaults"
            subtitle="Fallback for all branches"
          >
            <ConfigField label="Global fallback type">
              <ConfigSelect
                id={`cb-global-fallback-${node.id}`}
                value={data.globalFallbackType || ""}
                placeholder="Select fallback type"
                options={FALLBACK_TYPES}
                onChange={(v) =>
                  patch({ globalFallbackType: v as FallbackType | "" })
                }
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
