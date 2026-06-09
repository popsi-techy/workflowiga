import type { AnyTaskData, WorkflowNode } from "../types";
import type { AssistantOption } from "./types";
import { linkedDecisionIds } from "./workflow-summary";
import type { AssistantInsertTarget } from "./insert-target";

function lastTaskType(nodes: WorkflowNode[]): AnyTaskData["taskType"] | null {
  const decisionIds = linkedDecisionIds(nodes);
  for (let i = nodes.length - 1; i >= 0; i--) {
    const n = nodes[i];
    if (n.kind !== "task" || decisionIds.has(n.id)) continue;
    const d = n.data as AnyTaskData;
    return d.taskType ?? null;
  }
  return null;
}

export function getSuggestedNextSteps(
  nodes: WorkflowNode[],
  target?: AssistantInsertTarget,
): AssistantOption[] {
  const inBranch = target?.kind === "branch";
  const last = lastTaskType(nodes);
  const hasApproval = nodes.some(
    (n) => n.kind === "task" && (n.data as AnyTaskData).taskType === "approval_level",
  );

  if (inBranch) {
    return [
      { id: "s1", label: "Add notification here", value: "add_notification" },
      { id: "s2", label: "Add approval here", value: "add_approval" },
      { id: "s3", label: "Add skip step here", value: "add_skip" },
    ];
  }

  if (!last || nodes.filter((n) => n.kind === "task").length <= 1) {
    return [
      { id: "s1", label: "Add manager approval", value: "manager_approval" },
      { id: "s2", label: "Add conditional branch", value: "add_condition" },
      { id: "s3", label: "Use a template", value: "open_templates" },
    ];
  }

  if (last === "approval_level") {
    return [
      { id: "s1", label: "Add notification", value: "add_notification" },
      { id: "s2", label: "Add conditional branch", value: "add_condition" },
      { id: "s3", label: "Add another approval level", value: "add_approval" },
    ];
  }

  if (last === "conditional_branch_v2" || last === "conditional_branch") {
    return [
      { id: "s1", label: "Add approval", value: "add_approval" },
      { id: "s2", label: "Add notification", value: "add_notification" },
      { id: "s3", label: "Add skip step", value: "add_skip" },
    ];
  }

  if (last === "notification") {
    return [
      { id: "s1", label: "Add approval", value: "add_approval" },
      { id: "s2", label: "Add skip step", value: "add_skip" },
    ];
  }

  if (!hasApproval) {
    return [
      { id: "s1", label: "Add manager approval", value: "manager_approval" },
      { id: "s2", label: "Add conditional branch", value: "add_condition" },
    ];
  }

  return [
    { id: "s1", label: "Add notification", value: "add_notification" },
    { id: "s2", label: "Add conditional branch", value: "add_condition" },
    { id: "s3", label: "Add skip step", value: "add_skip" },
  ];
}

export const WELCOME_SUGGESTIONS: AssistantOption[] = [
  {
    id: "w1",
    label: "Manager approval for all requests",
    value: "manager_all",
    description: "Single manager approval step",
  },
  {
    id: "w2",
    label: "Skip approval when requester is target user's manager",
    value: "manager_skip",
    description: "Conditional skip for managers",
  },
  {
    id: "w3",
    label: "Route Finance department requests to Finance approvers",
    value: "finance_route",
    description: "Department-based routing",
  },
  {
    id: "w4",
    label: "Create two-level approval workflow",
    value: "two_level",
    description: "Manager then owner",
  },
  {
    id: "w5",
    label: "Add notification after approval",
    value: "add_notification",
    description: "Notify requester when complete",
  },
  {
    id: "w6",
    label: "Build aman test routing ladder",
    value: "aman_test",
    description: "4-step conditional ladder with Product Owner paths",
  },
];
