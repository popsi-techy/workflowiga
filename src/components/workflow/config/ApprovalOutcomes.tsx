"use client";

import { Clock, Plus } from "lucide-react";
import { useWorkflowStore } from "@/lib/workflow/store";
import { APPROVAL_OUTCOME_ATTR, CONDITIONAL_ATTRIBUTES } from "@/lib/workflow/mock-data";
import {
  getConditionBranches,
  getElseBranch,
  removeConditionBranch,
  addElseBranch,
  removeElseBranch,
  resolveElseEnabled,
} from "@/lib/workflow/conditional-branch";
import {
  addOutcomeRoute,
  decisionOutcomesTitle,
  outcomeChipLabel,
  separableOutcomes,
} from "@/lib/workflow/decision-outcomes";
import {
  APPROVAL_SLA_TIMEOUT_ACTIONS,
  DEFAULT_APPROVAL_SLA_DURATION,
  DEFAULT_APPROVAL_SLA_TIMEOUT,
  NO_ACTION_OUTCOME,
} from "@/lib/workflow/approval-decision";
import { findBranchLevelContext } from "@/lib/workflow/branch-level-patch";
import { RoutingBranchLadder } from "./RoutingBranchLadder";
import { ConfigField, ConfigInset, ConfigSection, ConfigSelect } from "./config-layout";
import { Switch } from "../Switch";
import type {
  ApprovalLevelConfig,
  ApprovalLevelData,
  ConditionalBranchData,
  DecisionKind,
  DecisionLike,
  EmbeddedConditionalData,
  SlaTimeoutAction,
  SplitBranchData,
} from "@/lib/workflow/types";

/** Per-approver SLA — multisplit branch levels and standalone on single approval levels. */
export function ApprovalSlaSection({
  levelId,
  data,
  onPatch,
  variant = "outcome",
}: {
  levelId: string;
  data: Pick<
    ApprovalLevelData,
    "slaEnabled" | "slaDuration" | "slaDurationUnit" | "slaTimeoutAction"
  >;
  onPatch: (fields: Partial<ApprovalLevelData>) => void;
  /** `standalone` shows an enable toggle and general SLA copy (not tied to outcomes). */
  variant?: "outcome" | "standalone";
}) {
  const slaTimeout = APPROVAL_SLA_TIMEOUT_ACTIONS.includes(
    data.slaTimeoutAction as SlaTimeoutAction,
  )
    ? (data.slaTimeoutAction as SlaTimeoutAction)
    : DEFAULT_APPROVAL_SLA_TIMEOUT;

  const standalone = variant === "standalone";
  const enabled = standalone ? !!data.slaEnabled : true;

  function enableSla() {
    onPatch({
      slaEnabled: true,
      slaDuration: data.slaDuration || DEFAULT_APPROVAL_SLA_DURATION,
      slaDurationUnit: data.slaDurationUnit ?? "hours",
      slaTimeoutAction: slaTimeout,
    });
  }

  return (
    <ConfigSection
      title={standalone ? "SLA" : "No Action / SLA Breached"}
      subtitle={
        standalone
          ? "Set a deadline and what happens if this approver does not act in time."
          : "What happens if this approver does not act before the deadline."
      }
      action={
        standalone ? (
          <Switch
            id={`sla-enabled-${levelId}`}
            aria-label="Enable SLA"
            enabled={!!data.slaEnabled}
            onChange={(v) =>
              v ? enableSla() : onPatch({ slaEnabled: false })
            }
          />
        ) : undefined
      }
    >
      {enabled && (
      <ConfigInset className="gap-2.5">
        <div className="flex items-center gap-1.5">
          <Clock className="h-3.5 w-3.5 text-amber-600" />
          <span className="text-[11.5px] font-medium text-[var(--foreground)]">
            SLA settings
          </span>
        </div>
        <ConfigField label="SLA deadline">
          <div className="flex items-center gap-2">
            <input
              type="number"
              min={1}
              max={9999}
              value={data.slaDuration || DEFAULT_APPROVAL_SLA_DURATION}
              onChange={(e) =>
                onPatch({
                  slaEnabled: true,
                  slaDuration: Math.max(1, Number(e.target.value)),
                })
              }
              className="w-24 rounded-md border border-[var(--border)] bg-white px-3 py-2 text-[13px] outline-none focus:border-[var(--accent)]"
            />
            <ConfigSelect
              id={`sla-unit-${levelId}`}
              value={data.slaDurationUnit ?? "hours"}
              placeholder=""
              options={["hours", "days"]}
              onChange={(v) =>
                onPatch({ slaDurationUnit: v as "hours" | "days" })
              }
            />
          </div>
        </ConfigField>
        <ConfigField
          label="On timeout"
          hint="What happens when nobody acts before the deadline"
        >
          <ConfigSelect
            id={`sla-timeout-${levelId}`}
            value={slaTimeout}
            placeholder=""
            options={APPROVAL_SLA_TIMEOUT_ACTIONS}
            onChange={(v) =>
              onPatch({ slaTimeoutAction: v as SlaTimeoutAction, slaEnabled: true })
            }
          />
        </ConfigField>
      </ConfigInset>
      )}
    </ConfigSection>
  );
}

/** Inline outcome editor for an action step's linked decision block.
 *  Works for a top-level decision node (`decisionNodeId`) or an inline
 *  decision embedded in a branch level (`hostLevelId`). Shared by approval
 *  levels and SoD checks (dispatches by decisionKind). */
export function DecisionOutcomesSection(
  props: { decisionNodeId: string } | { hostLevelId: string },
) {
  const nodes = useWorkflowStore((s) => s.nodes);
  const updateNode = useWorkflowStore((s) => s.updateNode);
  const removeNode = useWorkflowStore((s) => s.removeNode);

  const isEmbedded = "hostLevelId" in props;

  // Resolve the decision data + a unified patcher for either source.
  let data: (DecisionLike & { decisionKind?: ConditionalBranchData["decisionKind"] }) | null = null;
  let applyDecision: (next: Partial<DecisionLike>) => void = () => {};

  if (isEmbedded) {
    const ctx = findBranchLevelContext(nodes, props.hostLevelId);
    const emb = ctx?.level.embeddedConditional;
    if (emb) {
      data = emb;
      applyDecision = (next) =>
        updateNode(props.hostLevelId, {
          embeddedConditional: { ...emb, ...next } as EmbeddedConditionalData,
        } as never);
    }
  } else {
    const node = nodes.find((n) => n.id === props.decisionNodeId);
    if (node) {
      data = node.data as ConditionalBranchData;
      applyDecision = (next) =>
        updateNode(props.decisionNodeId, next as Partial<ConditionalBranchData>);
    }
  }

  if (!data) return null;
  const decision = data;
  const hasElseBranch = resolveElseEnabled(decision);
  const conditionBranches = getConditionBranches(decision.branches, hasElseBranch);
  const elseBranch = getElseBranch(decision.branches, hasElseBranch);
  const chips = separableOutcomes(decision);
  const { title, subtitle } = decisionOutcomesTitle(decision.decisionKind);
  const isSod = decision.decisionKind === "sod";
  const isApproval = decision.decisionKind === "approval";

  // The approval action this decision serves — SLA / timeout lives on it and is
  // surfaced through the "No Action / SLA Breached" outcome below.
  const actionId = isEmbedded
    ? props.hostLevelId
    : (decision as ConditionalBranchData).sourceActionId;
  const actionData: ApprovalLevelData | ApprovalLevelConfig | undefined = isEmbedded
    ? findBranchLevelContext(nodes, props.hostLevelId)?.level
    : actionId
      ? (nodes.find((n) => n.id === actionId)?.data as ApprovalLevelData | undefined)
      : undefined;
  const hasNoAction = conditionBranches.some((b) =>
    (b.condition?.conditions ?? []).some(
      (c) => c.attribute === APPROVAL_OUTCOME_ATTR && c.value === NO_ACTION_OUTCOME,
    ),
  );

  function patchAction(fields: Partial<ApprovalLevelData>) {
    if (actionId) updateNode(actionId, fields as never);
  }

  function patchBranch(branchId: string, fields: Partial<SplitBranchData>) {
    applyDecision({
      branches: decision.branches.map((b) =>
        b.id === branchId ? { ...b, ...fields } : b,
      ),
    });
  }

  function addChip(outcome: string) {
    applyDecision(addOutcomeRoute(decision, outcome));
    // Adding the No-Action rule enables this approver's SLA.
    if (isApproval && outcome === NO_ACTION_OUTCOME) {
      const keepTimeout = APPROVAL_SLA_TIMEOUT_ACTIONS.includes(
        actionData?.slaTimeoutAction as SlaTimeoutAction,
      );
      patchAction({
        slaEnabled: true,
        slaDuration: actionData?.slaDuration || DEFAULT_APPROVAL_SLA_DURATION,
        slaDurationUnit: actionData?.slaDurationUnit ?? "hours",
        slaTimeoutAction: keepTimeout
          ? actionData!.slaTimeoutAction
          : DEFAULT_APPROVAL_SLA_TIMEOUT,
      });
    }
  }

  /** Removing the last outcome leaves nothing to route, so drop the decision
   *  entirely and fall back to the empty state (where any rule can be re-added). */
  function clearDecision() {
    if (isEmbedded) {
      updateNode(props.hostLevelId, { embeddedConditional: undefined } as never);
    } else {
      removeNode(props.decisionNodeId);
    }
  }

  function removeOutcome(branchId: string) {
    const branch = conditionBranches.find((b) => b.id === branchId);
    const wasNoAction = (branch?.condition?.conditions ?? []).some(
      (c) => c.attribute === APPROVAL_OUTCOME_ATTR && c.value === NO_ACTION_OUTCOME,
    );
    if (elseBranch?.id === branchId) {
      const next = removeElseBranch(decision);
      if (next) applyDecision(next);
      return;
    }
    const next = removeConditionBranch(decision, branchId);
    if (next) applyDecision(next);
    else clearDecision();
    // Dropping the No-Action rule turns the SLA off.
    if (isApproval && wasNoAction) patchAction({ slaEnabled: false });
  }

  function handleAddElse() {
    applyDecision(addElseBranch(decision));
  }

  return (
    <>
      <ConfigSection title={title} subtitle={subtitle}>
        <RoutingBranchLadder
          branches={conditionBranches}
          attributes={CONDITIONAL_ATTRIBUTES}
          onPatchBranch={patchBranch}
          onAddElseIf={() => {}}
          onRemoveBranch={removeOutcome}
          hideAddElseIf
          outcomesMode
        />

        {chips.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {chips.map((outcome) => (
              <button
                key={outcome}
                type="button"
                onClick={() => addChip(outcome)}
                className="inline-flex h-7 items-center gap-1 rounded-full border border-dashed border-[var(--border)] px-2.5 text-[11.5px] font-medium text-[var(--muted-fg)] transition-colors hover:border-[var(--accent)] hover:text-[var(--foreground)]"
              >
                <Plus className="h-3 w-3" />
                {outcomeChipLabel(decision.decisionKind, outcome)}
              </button>
            ))}
          </div>
        )}

        {chips.length === 0 && (
          <p className="px-0.5 text-[11px] text-[var(--muted-fg)]">
            All outcomes have dedicated routes.
          </p>
        )}

        {/* Approval: the No-Action outcome owns the SLA deadline + timeout
            resolution. Shown only while that route exists. */}
        {isApproval && hasNoAction && actionData && (
          <ApprovalSlaSection
            levelId={actionId!}
            data={actionData}
            onPatch={patchAction}
          />
        )}

        {isSod && chips.length > 0 && (
          <ConfigInset className="gap-1">
            <div className="flex items-center gap-1.5">
              <span className="inline-flex shrink-0 rounded bg-[var(--muted)] px-1 py-px text-[9px] font-bold uppercase tracking-wide text-[var(--muted-fg)]">
                ELSE
              </span>
              <span className="text-[11.5px] font-medium text-[var(--foreground)]">
                All other requests
              </span>
            </div>
            <p className="text-[11px] leading-snug text-[var(--muted-fg)]">
              Anything not matched above continues to the next step.
            </p>
          </ConfigInset>
        )}
      </ConfigSection>

      {isApproval && hasElseBranch && elseBranch && (
        <ConfigSection
          title="Everything else"
          subtitle="Outcomes without a dedicated route follow this path."
        >
          <RoutingBranchLadder
            branches={[elseBranch]}
            attributes={CONDITIONAL_ATTRIBUTES}
            onPatchBranch={patchBranch}
            onAddElseIf={() => {}}
            onRemoveBranch={removeOutcome}
            hideAddElseIf
            hasElseBranch
          />
        </ConfigSection>
      )}

      {isApproval && !hasElseBranch && (
        <button
          type="button"
          onClick={handleAddElse}
          className="inline-flex h-7 items-center gap-1 self-start rounded border border-dashed border-[var(--border)] px-2 text-[11px] font-medium text-[var(--muted-fg)] hover:border-[var(--accent)] hover:text-[var(--foreground)]"
        >
          <Plus className="h-3 w-3" />
          Else (all other requests)
        </button>
      )}
    </>
  );
}

/** Outcome chips offered when an action has no decision yet (e.g. the user
 *  deleted the decision block). Clicking one recreates the routing. */
function emptyStateOutcomeChips(
  kind: DecisionKind,
): { outcome: string; label: string }[] {
  if (kind === "sod") {
    return [
      { outcome: "Violation detected", label: "Add SoD violation rule" },
      { outcome: "No violation", label: "Add SoD no violation rule" },
      { outcome: "Risk: Low", label: "Add low-risk rule" },
      { outcome: "Risk: Medium", label: "Add medium-risk rule" },
      { outcome: "Risk: High", label: "Add high-risk rule" },
    ];
  }
  return [
    { outcome: "Approved", label: "Add approval rule" },
    { outcome: "Rejected", label: "Add rejection rule" },
    { outcome: "Delegated", label: "Add delegation rule" },
    { outcome: "No Action / SLA Breached", label: "Add no-action rule" },
  ];
}

/** Shown in an action's config when it has no decision block. Each chip
 *  re-creates the decision (and that outcome's route) so routing never gets
 *  stuck in an empty state after the decision block is removed. */
export function DecisionOutcomesEmpty({
  decisionKind,
  onAddOutcome,
}: {
  decisionKind: DecisionKind;
  onAddOutcome: (outcome: string) => void;
}) {
  const { title } = decisionOutcomesTitle(decisionKind);
  const chips = emptyStateOutcomeChips(decisionKind);
  return (
    <ConfigSection
      title={title}
      subtitle="No outcomes yet — add a rule to route this step's result."
    >
      <ConfigInset className="gap-1.5">
        <p className="text-[11px] leading-snug text-[var(--muted-fg)]">
          Add a rule below to (re)create the decision and start routing this
          step&apos;s result again.
        </p>
      </ConfigInset>
      <div className="flex flex-wrap gap-1.5">
        {chips.map(({ outcome, label }) => (
          <button
            key={outcome}
            type="button"
            onClick={() => onAddOutcome(outcome)}
            className="inline-flex h-7 items-center gap-1 rounded-full border border-dashed border-[var(--border)] px-2.5 text-[11.5px] font-medium text-[var(--muted-fg)] transition-colors hover:border-[var(--accent)] hover:text-[var(--foreground)]"
          >
            <Plus className="h-3 w-3" />
            {label}
          </button>
        ))}
      </div>
    </ConfigSection>
  );
}
