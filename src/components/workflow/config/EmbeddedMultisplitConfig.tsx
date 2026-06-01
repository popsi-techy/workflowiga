"use client";

import { Plus, Trash2 } from "lucide-react";
import { uid } from "@/lib/workflow/defaults";
import { findBranchLevelContext } from "@/lib/workflow/branch-level-patch";
import { addOutcomeRoute, separableOutcomes } from "@/lib/workflow/decision-outcomes";
import { findMultisplitDecisionHostId } from "@/lib/workflow/multisplit-decision";
import { useWorkflowStore } from "@/lib/workflow/store";
import type {
  CompletionMode,
  EmbeddedConditionalData,
  SplitBranchData,
  WorkflowNode,
} from "@/lib/workflow/types";
import {
  ConfigBody,
  ConfigField,
  ConfigSection,
  ConfigSelect,
} from "./config-layout";
import {
  DecisionOutcomesEmpty,
  DecisionOutcomesSection,
} from "./ApprovalOutcomes";

const COMPLETION_MODES: CompletionMode[] = ["all", "any", "threshold", "majority"];
const COMPLETION_LABEL: Record<CompletionMode, string> = {
  all: "All branches must complete",
  any: "Any one branch completes",
  threshold: "A threshold of branches complete",
  majority: "Majority of branches complete",
};

const MIN_BRANCHES = 2;

export function EmbeddedMultisplitConfig({
  hostLevelId,
  data,
}: {
  hostLevelId: string;
  data: EmbeddedConditionalData;
}) {
  const updateNode = useWorkflowStore((s) => s.updateNode);
  const nodes = useWorkflowStore((s) => s.nodes);
  const editorContext = useWorkflowStore((s) => s.editorContext);
  const decisionHostId = findMultisplitDecisionHostId(nodes, hostLevelId);
  const decisionExists = !!decisionHostId;

  function patch(fields: Partial<EmbeddedConditionalData>) {
    updateNode(hostLevelId, {
      embeddedConditional: { ...data, ...fields },
    } as unknown as Partial<WorkflowNode["data"]>);
  }

  /** Re-sync the combined-outcome sibling, then add the chosen route. */
  function handleAddOutcome(outcome: string) {
    // Touch embedded data so updateNode re-runs nested multisplit sync.
    patch({ completionMode: data.completionMode ?? "all" });
    const synced = useWorkflowStore.getState().nodes;
    const hostId = findMultisplitDecisionHostId(synced, hostLevelId);
    if (!hostId) return;
    const ctx = findBranchLevelContext(synced, hostId);
    const emb = ctx?.level.embeddedConditional;
    if (!emb || !separableOutcomes(emb).includes(outcome)) return;
    updateNode(hostId, {
      embeddedConditional: addOutcomeRoute(emb, outcome),
    } as unknown as Partial<WorkflowNode["data"]>);
  }

  function addBranch() {
    const next: SplitBranchData = {
      id: uid("br"),
      name: `Branch ${data.branches.length + 1}`,
      levels: [],
    };
    const branches = [...data.branches, next];
    patch({ branches, conditionCount: branches.length, branchCount: branches.length });
  }

  function removeBranch(id: string) {
    if (data.branches.length <= MIN_BRANCHES) return;
    const branches = data.branches.filter((b) => b.id !== id);
    patch({ branches, conditionCount: branches.length, branchCount: branches.length });
  }

  function renameBranch(id: string, name: string) {
    patch({
      branches: data.branches.map((b) => (b.id === id ? { ...b, name } : b)),
    });
  }

  const completionMode = data.completionMode ?? "all";

  return (
    <div className="flex h-full flex-col">
      <ConfigBody>
        <ConfigSection
          title={data.name || "Multisplit"}
          subtitle="Runs every branch in parallel. Add steps inside each branch on the canvas."
        >
          <ConfigField label="Completion">
            <ConfigSelect
              id={`embedded-multisplit-mode-${hostLevelId}`}
              value={completionMode}
              placeholder="Select completion mode"
              options={COMPLETION_MODES}
              valueMap={COMPLETION_MODES.map((m) => ({
                value: m,
                label: COMPLETION_LABEL[m],
              }))}
              onChange={(v) => patch({ completionMode: v as CompletionMode })}
            />
          </ConfigField>
        </ConfigSection>

        <ConfigSection
          title="Branches"
          subtitle="Parallel paths created by this split."
        >
          <div className="flex flex-col gap-1.5">
            {data.branches.map((b) => (
              <div
                key={b.id}
                className="flex items-center gap-2 rounded-lg border border-[var(--border)] bg-white px-2.5 py-1.5"
              >
                <input
                  value={b.name}
                  onChange={(e) => renameBranch(b.id, e.target.value)}
                  className="min-w-0 flex-1 bg-transparent text-[13px] font-medium text-[var(--foreground)] outline-none"
                  placeholder="Branch name"
                />
                {data.branches.length > MIN_BRANCHES && (
                  <button
                    type="button"
                    onClick={() => removeBranch(b.id)}
                    aria-label="Remove branch"
                    className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md text-[var(--muted-fg)] transition-colors hover:bg-red-50 hover:text-red-600"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                )}
              </div>
            ))}
          </div>
          <button
            type="button"
            onClick={addBranch}
            className="inline-flex h-8 items-center gap-1.5 self-start rounded-lg border border-dashed border-[var(--border)] px-3 text-[12px] font-medium text-[var(--muted-fg)] transition-colors hover:border-[var(--accent)] hover:text-[var(--foreground)]"
          >
            <Plus className="h-3.5 w-3.5" />
            Add branch
          </button>
        </ConfigSection>

        {editorContext === "approval" &&
          (decisionExists ? (
            <DecisionOutcomesSection hostLevelId={decisionHostId!} />
          ) : (
            <DecisionOutcomesEmpty
              decisionKind="approval"
              onAddOutcome={handleAddOutcome}
            />
          ))}
      </ConfigBody>
    </div>
  );
}
