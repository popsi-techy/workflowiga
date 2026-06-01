import { uid, defaultConditionalBranch, defaultSodCheck } from "./defaults";
import { buildSodDecisionData } from "./sod-decision";
import {
  defaultBranchNotificationConfig,
  defaultBranchExitConfig,
  defaultNestedConditionalLevel,
  routingEqualsCondition,
  GRANTED_NOTIFICATION_MESSAGE,
  REJECTED_NOTIFICATION_MESSAGE,
  SOD_VIOLATION_MESSAGE,
} from "./branch-blocks";
import { getElseBranch } from "./conditional-branch";
import { APPROVAL_OUTCOME_ATTR, SOD_RESULT_ATTR } from "./mock-data";
import type {
  ApprovalLevelConfig,
  ApprovalPolicyData,
  ConditionalBranchData,
  SodCheckData,
  WorkflowNode,
} from "./types";

export const POL_AP_SOD_INTERN_RISK = "pol_ap_sod_intern_risk";

function serialApprovalLevel(
  overrides: Partial<ApprovalLevelConfig> & {
    name: string;
    approverType: ApprovalLevelConfig["approverType"];
  },
): ApprovalLevelConfig {
  return {
    id: uid("lvl"),
    blockType: "approval_level",
    fallbackType: "Block",
    fallbackEmail: "",
    slaEnabled: false,
    slaDuration: 48,
    slaDurationUnit: "hours",
    autoApproveOnTimeout: false,
    slaTimeoutAction: "Auto Reject",
    notifyApproverOnAssignment: true,
    assignmentNotifyChannels: ["email", "slack"],
    approverRefs: [],
    approverRule: { logic: "AND", conditions: [] },
    fallbackUsers: [],
    skipEnabled: false,
    skip: { logic: "AND", conditions: [] },
    ...overrides,
  };
}

/**
 * SoD check (action) → linked SoD result decision. On violation, serial
 * Manager → SoD/Risk Officer approval with nested approval-outcome notifies.
 */
export function buildSodInternRiskViolationPolicyNodes(): WorkflowNode[] {
  const sodActionId = uid("task");
  const sodDecisionId = uid("task");

  const sodCheck: SodCheckData = {
    ...defaultSodCheck(),
    name: "SoD Check",
    decisionNodeId: sodDecisionId,
    violationAction: "continue",
    violationChannels: ["email", "slack"],
    violationAudiences: ["Requester", "Manager", "Owner"],
    slackMessage: SOD_VIOLATION_MESSAGE,
    emailMessage: SOD_VIOLATION_MESSAGE,
  };

  const violationNotify = defaultBranchNotificationConfig({
    name: "Notify — SoD violation",
    notificationTrigger: "started",
    notificationChannels: ["slack", "email"],
    notificationAudiences: ["Requester", "Manager", "Owner"],
    slackMessage: SOD_VIOLATION_MESSAGE,
    emailMessage: SOD_VIOLATION_MESSAGE,
  });

  const managerApproval = serialApprovalLevel({
    name: "Manager approval",
    approverType: "Manager",
    slaEnabled: true,
    slaDuration: 48,
    slaDurationUnit: "hours",
    slaTimeoutAction: "Auto Reject",
  });

  const riskOfficerApproval = serialApprovalLevel({
    name: "SoD / Risk Officer",
    approverType: "Governance Group",
    approverRefs: ["gg_sod_risk"],
    slaEnabled: true,
    slaDuration: 24,
    slaDurationUnit: "hours",
    slaTimeoutAction: "Proceed to next step",
  });

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

  const outcomeConditional = defaultNestedConditionalLevel({
    name: "Approval outcome",
    routingAttributes: [APPROVAL_OUTCOME_ATTR],
    globalFallbackType: "Block",
    conditionCount: 3,
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
        name: "No Action / SLA Breached",
        levels: [defaultBranchExitConfig({ name: "Exit" })],
        condition: routingEqualsCondition(
          APPROVAL_OUTCOME_ATTR,
          "No Action / SLA Breached",
        ),
      },
      {
        id: uid("br"),
        name: "Otherwise",
        levels: [defaultBranchExitConfig({ name: "Exit" })],
        condition: { logic: "AND", conditions: [] },
      },
    ],
  });

  const sodDecisionBase = buildSodDecisionData(sodActionId);
  const sodElse = getElseBranch(sodDecisionBase.branches)!;

  const sodDecision: ConditionalBranchData = {
    ...sodDecisionBase,
    conditionCount: 2,
    branchCount: 3,
    branches: [
      {
        id: uid("br"),
        name: "Violation detected",
        levels: [
          violationNotify,
          managerApproval,
          riskOfficerApproval,
          outcomeConditional,
        ],
        condition: routingEqualsCondition(SOD_RESULT_ATTR, "Violation detected"),
      },
      {
        id: uid("br"),
        name: "No violation",
        levels: [],
        condition: routingEqualsCondition(SOD_RESULT_ATTR, "No violation"),
      },
      {
        ...sodElse,
        name: "Out of scope",
        levels: [defaultBranchExitConfig({ name: "Exit" })],
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
          "Attribute-based intern policy: SoD check, then serial Manager → SoD/Risk Officer on violation.",
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
  ];
}
