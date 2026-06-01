import { uid, defaultApprovalLevel } from "./defaults";
import { buildApprovalDecisionData } from "./approval-decision";
import { buildApprovalDecisionEmbedded } from "./approval-decision";
import {
  defaultBranchExitConfig,
  defaultBranchNotificationConfig,
  routingEqualsCondition,
  GRANTED_NOTIFICATION_MESSAGE,
  REJECTED_NOTIFICATION_MESSAGE,
} from "./branch-blocks";
import { getElseBranch } from "./conditional-branch";
import { APPROVAL_OUTCOME_ATTR } from "./mock-data";
import type {
  ApprovalLevelConfig,
  ApprovalLevelData,
  ApprovalPolicyData,
  ConditionalBranchData,
  WorkflowNode,
} from "./types";

/**
 * Manager → linked outcome decision → owner (in approved branch) with its
 * own inline outcome decision for owner approve/reject notifications.
 */
export function buildManagerOwnerAccessApprovalNodes(): WorkflowNode[] {
  const managerActionId = uid("task");
  const managerDecisionId = uid("task");

  const managerLevel: ApprovalLevelData = {
    ...defaultApprovalLevel(),
    name: "Level 1 — Manager approval",
    approverType: "Manager",
    fallbackType: "Block",
    decisionNodeId: managerDecisionId,
    notifyApproverOnAssignment: true,
    assignmentNotifyChannels: ["email", "slack"],
    // SLA lives on the action; the "No Action / SLA Breached" outcome below
    // routes what happens when the deadline elapses.
    slaEnabled: true,
    slaDuration: 48,
    slaDurationUnit: "hours",
    slaTimeoutAction: "Auto Reject",
  };

  const ownerLevelId = uid("lvl");

  const ownerRejectedNotify = defaultBranchNotificationConfig({
    name: "Notify — Owner rejected",
    notificationTrigger: "failed",
    notificationChannels: ["slack", "email"],
    notificationAudiences: ["Requester"],
    slackMessage: REJECTED_NOTIFICATION_MESSAGE,
    emailMessage: REJECTED_NOTIFICATION_MESSAGE,
  });

  const ownerGrantedNotify = defaultBranchNotificationConfig({
    name: "Notify — Access granted",
    notificationTrigger: "completed",
    notificationChannels: ["slack", "email"],
    notificationAudiences: ["Requester", "Manager"],
    slackMessage: GRANTED_NOTIFICATION_MESSAGE,
    emailMessage: GRANTED_NOTIFICATION_MESSAGE,
  });

  const ownerDecisionEmbedded = {
    ...buildApprovalDecisionEmbedded(ownerLevelId, "Entitlement owner"),
    conditionCount: 2,
    branchCount: 3,
    branches: [
      {
        id: uid("br"),
        name: "Rejected",
        levels: [ownerRejectedNotify],
        condition: routingEqualsCondition(APPROVAL_OUTCOME_ATTR, "Rejected"),
      },
      {
        id: uid("br"),
        name: "Approved",
        levels: [ownerGrantedNotify],
        condition: routingEqualsCondition(APPROVAL_OUTCOME_ATTR, "Approved"),
      },
      {
        id: uid("br"),
        name: "Otherwise",
        levels: [defaultBranchExitConfig({ name: "Exit" })],
        condition: { logic: "AND" as const, conditions: [] },
      },
    ],
  };

  const ownerLevel: ApprovalLevelConfig = {
    id: ownerLevelId,
    blockType: "approval_level",
    name: "Level 2 — Entitlement owner",
    approverType: "Owner",
    fallbackType: "Block",
    fallbackEmail: "",
    slaEnabled: false,
    slaDuration: 48,
    slaDurationUnit: "hours",
    autoApproveOnTimeout: false,
    notifyApproverOnAssignment: true,
    assignmentNotifyChannels: ["email", "slack"],
    approverRefs: [],
    approverRule: { logic: "AND", conditions: [] },
    fallbackUsers: [],
    skipEnabled: false,
    skip: { logic: "AND", conditions: [] },
    embeddedConditional: ownerDecisionEmbedded,
  };

  const managerRejectedNotify = defaultBranchNotificationConfig({
    name: "Notify — Manager rejected",
    notificationTrigger: "failed",
    notificationChannels: ["slack", "email"],
    notificationAudiences: ["Requester"],
    slackMessage: REJECTED_NOTIFICATION_MESSAGE,
    emailMessage: REJECTED_NOTIFICATION_MESSAGE,
  });

  const managerDecisionBase = buildApprovalDecisionData(
    managerActionId,
    "Manager approval",
  );
  const managerElse = getElseBranch(managerDecisionBase.branches)!;

  const managerDecision: ConditionalBranchData = {
    ...managerDecisionBase,
    conditionCount: 3,
    branchCount: 4,
    branches: [
      {
        ...managerDecisionBase.branches[0]!,
        name: "Approved",
        levels: [ownerLevel],
      },
      {
        id: uid("br"),
        name: "Rejected",
        levels: [managerRejectedNotify],
        condition: routingEqualsCondition(APPROVAL_OUTCOME_ATTR, "Rejected"),
      },
      {
        id: uid("br"),
        name: "No Action / SLA Breached",
        levels: [],
        condition: routingEqualsCondition(
          APPROVAL_OUTCOME_ATTR,
          "No Action / SLA Breached",
        ),
      },
      managerElse,
    ],
  };

  return [
    {
      id: uid("event"),
      kind: "event",
      data: {
        type: "approval_policy",
        description:
          "Manager then owner; owner routing lives under the approved branch.",
      } as ApprovalPolicyData,
      status: "configured",
    },
    {
      id: managerActionId,
      kind: "task",
      data: managerLevel,
      status: "configured",
    },
    {
      id: managerDecisionId,
      kind: "task",
      data: managerDecision,
      status: "configured",
    },
  ];
}
