import {
  uid,
  defaultApprovalSplit,
  defaultSodCheck,
  defaultBranchAssignEntities,
  defaultConditionalBranch,
} from "./defaults";
import { buildSodDecisionData } from "./sod-decision";
import { buildApprovalDecisionData } from "./approval-decision";
import {
  defaultBranchFilterConfig,
  defaultBranchModuleConfig,
  defaultBranchNotificationConfig,
  routingEqualsCondition,
  GRANTED_NOTIFICATION_MESSAGE,
  REJECTED_NOTIFICATION_MESSAGE,
  SOD_VIOLATION_MESSAGE,
} from "./branch-blocks";
import { syncApprovalSplitAttributes } from "./split-by-attribute";
import { APPROVAL_OUTCOME_ATTR } from "./mock-data";
import type {
  ApprovalLevelConfig,
  ApprovalPolicyData,
  ApprovalSplitData,
  ConditionalBranchData,
  FilterData,
  SodCheckData,
  WorkflowNode,
} from "./types";

export const POL_AP_SOD_DUAL = "pol_ap_sod_dual";
export const POL_WF_JOINER_HIGH_RISK = "pol_wf_joiner_high_risk";

function branchApprovalLevel(
  name: string,
  approverType: "Manager" | "Owner",
): ApprovalLevelConfig {
  return {
    id: uid("lvl"),
    blockType: "approval_level",
    name,
    approverType,
    fallbackType: "Block",
    fallbackEmail: "",
    autoApproveOnTimeout: false,
    notifyApproverOnAssignment: true,
    assignmentNotifyChannels: ["email", "slack"],
    // Per-approver SLA is configured on the level itself inside multisplit branches.
    slaEnabled: true,
    slaDuration: 48,
    slaDurationUnit: "hours",
    slaTimeoutAction: "Auto Reject",
    approverRefs: [],
    approverRule: { logic: "AND", conditions: [] },
    fallbackUsers: [],
    skipEnabled: false,
    skip: { logic: "AND", conditions: [] },
  };
}

function branchAssign(name: string, appIds: string[]): ApprovalLevelConfig {
  return {
    ...defaultBranchAssignEntities(),
    name,
    appIds,
  };
}

/** SoD pre-check (action + decision) → parallel Manager + Owner (any) → outcome notify. */
export function buildSodDualApprovalNodes(): WorkflowNode[] {
  const sodActionId = uid("task");
  const sodDecisionId = uid("task");

  const sodCheck: SodCheckData = {
    ...defaultSodCheck(),
    name: "SoD pre-check",
    decisionNodeId: sodDecisionId,
    violationAction: "notify",
    violationChannels: ["email", "slack"],
    violationAudiences: ["Requester", "Manager"],
    slackMessage: SOD_VIOLATION_MESSAGE,
    emailMessage: SOD_VIOLATION_MESSAGE,
  };

  const sodDecision = buildSodDecisionData(sodActionId);

  const splitId = uid("task");
  const splitDecisionId = uid("task");

  const parallelSplit: ApprovalSplitData = {
    ...defaultApprovalSplit(),
    name: "Level 1 — Parallel approvers",
    completionMode: "any",
    branchCount: 2,
    globalFallbackType: "Block",
    decisionNodeId: splitDecisionId,
    branches: [
      {
        id: uid("br"),
        name: "Manager",
        levels: [branchApprovalLevel("Manager approval", "Manager")],
      },
      {
        id: uid("br"),
        name: "Owner",
        levels: [branchApprovalLevel("Owner approval", "Owner")],
      },
    ],
  };

  const rejectedNotify = defaultBranchNotificationConfig({
    name: "Notify — Rejected",
    notificationTrigger: "failed",
    notificationChannels: ["slack", "email"],
    notificationAudiences: ["Requester", "Manager"],
    slackMessage: REJECTED_NOTIFICATION_MESSAGE,
    emailMessage: REJECTED_NOTIFICATION_MESSAGE,
  });

  const approvedNotify = defaultBranchNotificationConfig({
    name: "Notify — Approved",
    notificationTrigger: "completed",
    notificationChannels: ["slack", "email"],
    notificationAudiences: ["Requester", "Manager"],
    slackMessage: GRANTED_NOTIFICATION_MESSAGE,
    emailMessage: GRANTED_NOTIFICATION_MESSAGE,
  });

  const outcomeConditional: ConditionalBranchData = {
    ...buildApprovalDecisionData(splitId, parallelSplit.name),
    conditionCount: 2,
    branchCount: 3,
    branches: [
      {
        id: uid("br"),
        name: "Rejected",
        levels: [rejectedNotify],
        condition: routingEqualsCondition(APPROVAL_OUTCOME_ATTR, "Rejected"),
      },
      {
        id: uid("br"),
        name: "Approved",
        levels: [approvedNotify],
        condition: routingEqualsCondition(APPROVAL_OUTCOME_ATTR, "Approved"),
      },
      {
        id: uid("br"),
        name: "Otherwise",
        levels: [],
        condition: { logic: "AND", conditions: [] },
      },
    ],
  };

  return [
    {
      id: uid("event"),
      kind: "event",
      data: {
        type: "approval_policy",
        description:
          "SoD pre-check, then Manager and Owner in parallel (any may approve).",
      } as ApprovalPolicyData,
      status: "configured",
    },
    {
      id: sodActionId,
      kind: "task",
      data: sodCheck,
      status: "configured",
    },
    {
      id: sodDecisionId,
      kind: "task",
      data: sodDecision,
      status: "configured",
    },
    {
      id: splitId,
      kind: "task",
      data: parallelSplit,
      status: "configured",
    },
    {
      id: splitDecisionId,
      kind: "task",
      data: outcomeConditional,
      status: "configured",
    },
  ];
}

/** Joiner → user filter → department multisplit (filter + assign / module per branch). */
export function buildJoinerHighRiskWorkflowNodes(): WorkflowNode[] {
  const riskFilter: FilterData = {
    logic: "AND",
    conditions: [
      {
        id: uid("c"),
        attribute: "risk_score",
        operator: "gte",
        value: "70",
      },
    ],
  };

  const engBranchFilter = defaultBranchFilterConfig({
    name: "Engineering only",
    criteria: {
      logic: "AND",
      conditions: [
        {
          id: uid("c"),
          attribute: "department",
          operator: "equals",
          value: "Engineering",
        },
      ],
    },
  });

  const financeModule = defaultBranchModuleConfig({
    name: "SoD dual approval",
    policyId: POL_AP_SOD_DUAL,
  });

  const splitRaw: ApprovalSplitData = {
    ...defaultApprovalSplit(),
    name: "High-risk provisioning paths",
    branchAttributes: ["department", "risk_score"],
    branchCount: 2,
    completionMode: "all",
    globalFallbackType: "Block",
    branches: [
      {
        id: uid("br"),
        name: "Engineering · 71",
        attributeValues: { department: "Engineering", risk_score: "71" },
        levels: [engBranchFilter, branchAssign("Assign Slack", ["app_slack"])],
      },
      {
        id: uid("br"),
        name: "Finance · 71",
        attributeValues: { department: "Finance", risk_score: "71" },
        levels: [financeModule, branchAssign("Assign Stripe", ["app_stripe"])],
      },
    ],
  };
  const split = syncApprovalSplitAttributes(splitRaw);

  const postSplitConditional: ConditionalBranchData = {
    ...defaultConditionalBranch(),
    name: "Post-provisioning routing",
    routingAttributes: ["department"],
    branches: [
      {
        id: uid("br"),
        name: "Engineering follow-up",
        levels: [],
        condition: {
          logic: "AND",
          conditions: [
            {
              id: uid("c"),
              attribute: "department",
              operator: "equals",
              value: "Engineering",
            },
          ],
        },
      },
      {
        id: uid("br"),
        name: "Otherwise",
        levels: [],
        condition: { logic: "AND", conditions: [] },
      },
    ],
  };

  return [
    {
      id: uid("event"),
      kind: "event",
      data: {
        type: "joiner",
        description:
          "High-risk joiners: filter → parallel department paths (filter/assign or module/assign) → conditional.",
      },
      status: "configured",
    },
    {
      id: uid("filter"),
      kind: "filter",
      data: riskFilter,
      status: "configured",
    },
    {
      id: uid("task"),
      kind: "task",
      data: split,
      status: "configured",
    },
    {
      id: uid("task"),
      kind: "task",
      data: postSplitConditional,
      status: "incomplete",
    },
  ];
}
