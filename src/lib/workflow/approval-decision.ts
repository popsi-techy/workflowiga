import { uid, defaultConditionalBranch } from "./defaults";
import { routingEqualsCondition } from "./branch-blocks";
import {
  APPROVAL_OUTCOME_ATTR,
  type ApprovalOutcome,
} from "./mock-data";
import {
  getConditionBranches,
  getElseBranch,
  resolveElseEnabled,
} from "./conditional-branch";
import type {
  ConditionalBranchData,
  DecisionLike,
  EmbeddedConditionalData,
  SlaTimeoutAction,
  SplitBranchData,
} from "./types";

/** Outcomes the user can split out of the catch-all into dedicated routes. */
export const SEPARABLE_APPROVAL_OUTCOMES: ApprovalOutcome[] = [
  "Rejected",
  "Delegated",
  "No Action / SLA Breached",
];

/** The outcome that owns the SLA deadline: adding this route enables the SLA,
 *  removing it disables it. */
export const NO_ACTION_OUTCOME: ApprovalOutcome = "No Action / SLA Breached";

/** Timeout resolutions offered on the No-Action / SLA-breach rule. */
export const APPROVAL_SLA_TIMEOUT_ACTIONS: SlaTimeoutAction[] = [
  "Auto Reject",
  "Auto Approve",
  "Proceed to next step",
];

export const DEFAULT_APPROVAL_SLA_TIMEOUT: SlaTimeoutAction = "Auto Reject";
export const DEFAULT_APPROVAL_SLA_DURATION = 48;

export const APPROVAL_OUTCOME_CHIP_LABEL: Record<
  Exclude<ApprovalOutcome, "Approved">,
  string
> = {
  Rejected: "Add rejection rule",
  Delegated: "Add delegation rule",
  "No Action / SLA Breached": "Add no-action rule",
};

function outcomeBranch(outcome: ApprovalOutcome): SplitBranchData {
  return {
    id: uid("br"),
    name: outcome,
    levels: [],
    condition: routingEqualsCondition(APPROVAL_OUTCOME_ATTR, outcome),
  };
}

/** Which outcomes already have their own dedicated route. */
export function configuredApprovalOutcomes(
  data: DecisionLike,
): ApprovalOutcome[] {
  const outcomes: ApprovalOutcome[] = [];
  for (const b of getConditionBranches(data.branches)) {
    for (const c of b.condition?.conditions ?? []) {
      if (c.attribute === APPROVAL_OUTCOME_ATTR && !Array.isArray(c.value)) {
        outcomes.push(c.value as ApprovalOutcome);
      }
    }
  }
  return outcomes;
}

export function separableApprovalOutcomes(
  data: DecisionLike,
): ApprovalOutcome[] {
  const taken = new Set(configuredApprovalOutcomes(data));
  return SEPARABLE_APPROVAL_OUTCOMES.filter((o) => !taken.has(o));
}

/** Promote an outcome into its own IF / ELSE IF route (does not add a catch-all). */
export function addApprovalOutcomeRoute<T extends DecisionLike>(
  data: T,
  outcome: ApprovalOutcome,
): T {
  if (configuredApprovalOutcomes(data).includes(outcome)) return data;
  const hasElse = resolveElseEnabled(data);
  const conditions = getConditionBranches(data.branches, hasElse);
  const nextConditions = [...conditions, outcomeBranch(outcome)];
  if (!hasElse) {
    return {
      ...data,
      conditionCount: nextConditions.length,
      branchCount: nextConditions.length,
      branches: nextConditions,
      elseEnabled: false,
    };
  }
  const elseBranch = getElseBranch(data.branches, true)!;
  return {
    ...data,
    conditionCount: nextConditions.length,
    branchCount: nextConditions.length + 1,
    branches: [...nextConditions, elseBranch],
    elseEnabled: true,
  };
}

/** Build the default decision block for an approval level: one "Approved"
 *  route only — add other outcomes via chips; optional catch-all via "+ Else". */
export function buildApprovalDecisionData(
  sourceActionId: string,
  approverLabel?: string,
): ConditionalBranchData {
  const approved = outcomeBranch("Approved");
  return {
    ...defaultConditionalBranch(),
    name: approverLabel ? `${approverLabel} outcome` : "Approval outcome",
    decisionKind: "approval",
    sourceActionId,
    routingAttributes: [APPROVAL_OUTCOME_ATTR],
    conditionCount: 1,
    branchCount: 1,
    elseEnabled: false,
    branches: [approved],
    globalFallbackType: "",
    globalFallbackEmail: "",
    globalFallbackUsers: [],
  };
}

/** Inline-decision variant for an approval level living inside a branch. */
export function buildApprovalDecisionEmbedded(
  sourceLevelId: string,
  approverLabel?: string,
): EmbeddedConditionalData {
  const node = buildApprovalDecisionData(sourceLevelId, approverLabel);
  return {
    name: node.name,
    splitKind: "conditional",
    decisionKind: "approval",
    sourceLevelId,
    routingAttributes: node.routingAttributes,
    conditionCount: node.conditionCount,
    branchCount: node.branchCount,
    elseEnabled: node.elseEnabled,
    branches: node.branches,
    globalFallbackType: "",
  };
}
