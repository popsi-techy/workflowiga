import {
  computeStatus,
  defaultApprovalLevel,
  defaultApprovalLevelConfig,
  defaultConditionalBranchV2,
  defaultNotification,
  defaultSkip,
  uid,
} from "../defaults";
import { ensureApprovalPolicyEvent } from "../approval-policy";
import { buildApprovalDecisionData } from "../approval-decision";
import {
  branchIdForAttrCase,
  syncConditionalV2Branches,
} from "../boolean-branch";
import { getApprovalV2AttributeLabel, RELATIONSHIP_ATTR_LABELS } from "../approval-conditional-v2";
import type {
  ApprovalLevelConfig,
  ApprovalLevelData,
  ApproverType,
  BooleanCaseValue,
  ConditionalBranchV2Data,
  NotificationData,
  SkipData,
  WorkflowNode,
} from "../types";
import type { ApproverChoice, ConditionDraft } from "./types";

export const RELATIONSHIP_OPTIONS = Object.entries(RELATIONSHIP_ATTR_LABELS).map(
  ([value, label]) => ({ value, label }),
);

export const ASSISTANT_CONDITION_VALUES: {
  value: BooleanCaseValue | "not_configured";
  label: string;
}[] = [
  { value: "true", label: "True" },
  { value: "false", label: "False" },
  { value: "none", label: "Not configured" },
];

function branchLevel(
  blockType: "skip" | "approval_level",
  name: string,
  approverType?: ApproverType,
): ApprovalLevelConfig {
  const base = defaultApprovalLevelConfig();
  if (blockType === "skip") {
    return { ...base, blockType: "skip", name };
  }
  return {
    ...base,
    blockType: "approval_level",
    name,
    approverType: approverType ?? "Manager",
    fallbackType: "Block",
    notifyApproverOnAssignment: true,
    assignmentNotifyChannels: ["email"],
  };
}

export function approverTypeFromChoice(choice: ApproverChoice): ApproverType {
  switch (choice) {
    case "Owner":
      return "Owner";
    case "Department Head":
      return "Governance Group";
    case "Specific User":
      return "User";
    case "Custom":
      return "Custom attribute";
    default:
      return "Manager";
  }
}

function approvalLevelNode(
  name: string,
  approverType: ApproverType,
): { action: WorkflowNode; decision: WorkflowNode } {
  const actionId = uid("task");
  const decisionId = uid("task");
  const data: ApprovalLevelData = {
    ...defaultApprovalLevel(),
    name,
    approverType,
    fallbackType: "Block",
    notifyApproverOnAssignment: true,
    assignmentNotifyChannels: ["email", "slack"],
    decisionNodeId: decisionId,
  };
  const action: WorkflowNode = {
    id: actionId,
    kind: "task",
    data,
    status: "incomplete",
  };
  const decision: WorkflowNode = {
    id: decisionId,
    kind: "task",
    data: buildApprovalDecisionData(actionId, name),
    status: "incomplete",
  };
  action.status = computeStatus(action);
  decision.status = computeStatus(decision);
  return { action, decision };
}

function taskNode(data: Parameters<typeof computeStatus>[0]["data"]): WorkflowNode {
  const node: WorkflowNode = {
    id: uid("task"),
    kind: "task",
    data,
    status: "incomplete",
  };
  node.status = computeStatus(node);
  return node;
}

export function buildApprovalNodes(
  approverType: ApproverType,
  name?: string,
): WorkflowNode[] {
  const label = name ?? `${approverType} approval`;
  const { action, decision } = approvalLevelNode(label, approverType);
  return [action, decision];
}

export function buildNotificationNode(name = "Notify requester"): WorkflowNode {
  const data: NotificationData = {
    ...defaultNotification(),
    name,
    trigger: "completed",
    channels: ["email", "slack"],
    audiences: ["Requester"],
  };
  return taskNode(data);
}

export function buildSkipNode(name = "Skip approval"): WorkflowNode {
  const data: SkipData = {
    ...defaultSkip(),
    name,
  };
  return taskNode(data);
}

export function buildRelationshipConditionalV2(
  draft: ConditionDraft,
): ConditionalBranchV2Data {
  const cases: BooleanCaseValue[] = [];
  if (draft.value !== "not_configured") {
    cases.push(draft.value);
  }
  if (draft.truePath && draft.falsePath) {
    if (!cases.includes("true")) cases.push("true");
    if (!cases.includes("false")) cases.push("false");
  }

  const base: ConditionalBranchV2Data = {
    ...defaultConditionalBranchV2(),
    name: draft.attributeLabel,
    selectedAttributes: [draft.attribute],
    attributeCases: {
      [draft.attribute]:
        cases.length > 0 ? cases : ["true", "false"],
    },
    elseEnabled: false,
  };

  let synced = syncConditionalV2Branches(base);

  if (draft.truePath || draft.falsePath) {
    synced = {
      ...synced,
      branches: synced.branches.map((b) => {
        if (b.id === branchIdForAttrCase(draft.attribute, "true") && draft.truePath) {
          const level =
            draft.truePath === "skip"
              ? branchLevel("skip", "Skip approval")
              : branchLevel(
                  "approval_level",
                  `${approverTypeFromChoice(draft.trueApprover ?? "Manager")} approval (true)`,
                  approverTypeFromChoice(draft.trueApprover ?? "Manager"),
                );
          return { ...b, levels: [level] };
        }
        if (b.id === branchIdForAttrCase(draft.attribute, "false") && draft.falsePath) {
          const level =
            draft.falsePath === "skip"
              ? branchLevel("skip", "Skip approval")
              : branchLevel(
                  "approval_level",
                  `${approverTypeFromChoice(draft.falseApprover ?? "Manager")} approval (false)`,
                  approverTypeFromChoice(draft.falseApprover ?? "Manager"),
                );
          return { ...b, levels: [level] };
        }
        return b;
      }),
    };
  }

  return synced;
}

export function buildConditionalV2Node(draft: ConditionDraft): WorkflowNode {
  return taskNode(buildRelationshipConditionalV2(draft));
}

export function buildFinanceDepartmentConditional(): WorkflowNode {
  return buildConditionalV2Node({
    attribute: "isRequesterSameDeptAsSubject",
    attributeLabel: "Request initiator is in target user's department",
    value: "true",
    truePath: "approval",
    trueApprover: "Department Head",
    falsePath: "approval",
    falseApprover: "Manager",
  });
}

export function buildManagerSkipConditional(): WorkflowNode {
  return buildConditionalV2Node({
    attribute: "isRequesterManagerOfSubject",
    attributeLabel: getApprovalV2AttributeLabel("isRequesterManagerOfSubject"),
    value: "true",
    truePath: "skip",
    falsePath: "approval",
    falseApprover: "Manager",
  });
}

export function formatConditionPreview(draft: ConditionDraft): string[] {
  const valLabel =
    draft.value === "none" || draft.value === "not_configured"
      ? "Not configured"
      : draft.value === "true"
        ? "True"
        : "False";

  const lines = [`IF ${draft.attributeLabel}`, `[${valLabel}]`];

  if (draft.truePath) {
    lines.push(
      `TRUE → ${draft.truePath === "skip" ? "Skip approval" : `${approverTypeFromChoice(draft.trueApprover ?? "Manager")} approval`}`,
    );
  }
  if (draft.falsePath) {
    lines.push(
      `FALSE → ${draft.falsePath === "skip" ? "Skip approval" : `${approverTypeFromChoice(draft.falseApprover ?? "Manager")} approval`}`,
    );
  }

  return lines;
}

export function finalizeNodes(nodes: WorkflowNode[]): WorkflowNode[] {
  return ensureApprovalPolicyEvent(nodes).map((n) => ({
    ...n,
    status: computeStatus(n),
  }));
}

export function buildEmergencyAccessNodes(): WorkflowNode[] {
  const { action, decision } = approvalLevelNode("Emergency manager approval", "Manager");
  (action.data as ApprovalLevelData).slaEnabled = true;
  (action.data as ApprovalLevelData).slaDuration = 4;
  (action.data as ApprovalLevelData).slaDurationUnit = "hours";
  const notify = buildNotificationNode("Emergency access notification");
  return finalizeNodes([action, decision, notify]);
}
