import type {
  AnyTaskData,
  ApprovalLevelData,
  ApprovalSplitData,
  SodCheckData,
  WorkflowNode,
} from "../types";
import { APPROVAL_POLICY_EVENT_NAME } from "../approval-policy";
import { getApprovalV2AttributeLabel } from "../approval-conditional-v2";

export function linkedDecisionIds(nodes: WorkflowNode[]): Set<string> {
  const ids = new Set<string>();
  for (const n of nodes) {
    if (n.kind !== "task") continue;
    const d = n.data as AnyTaskData;
    if (d.taskType === "approval_level") {
      const lid = (d as ApprovalLevelData).decisionNodeId;
      if (lid) ids.add(lid);
    } else if (d.taskType === "approval_split") {
      const sid = (d as ApprovalSplitData).decisionNodeId;
      if (sid) ids.add(sid);
    } else if (d.taskType === "sod_check") {
      const sid = (d as SodCheckData).decisionNodeId;
      if (sid) ids.add(sid);
    }
  }
  return ids;
}

function taskLabel(data: AnyTaskData): string {
  switch (data.taskType) {
    case "approval_level":
      return data.name || (data.approverType ? `${data.approverType} approval` : "Approval level");
    case "conditional_branch":
      return data.name || "Conditional branch";
    case "conditional_branch_v2":
      return data.name || "Conditional branch";
    case "approval_split":
      return data.name || "Multisplit branch";
    case "notification":
      return data.name || "Notification";
    case "skip":
      return data.name || "Skip";
    case "exit":
      return data.name || "End";
    case "sod_check":
      return data.name || "SoD check";
    default:
      return data.name || "Step";
  }
}

/** Linear summary of top-level approval policy steps (skips linked decision nodes). */
export function buildWorkflowSummary(nodes: WorkflowNode[]): string[] {
  const lines: string[] = ["Start"];
  const decisionIds = linkedDecisionIds(nodes);

  const event = nodes.find((n) => n.kind === "event");
  if (event) {
    const name = (event.data as { name?: string }).name ?? APPROVAL_POLICY_EVENT_NAME;
    lines.push(name);
  }

  for (const node of nodes) {
    if (node.kind !== "task") continue;
    if (decisionIds.has(node.id)) continue;
    const data = node.data as AnyTaskData;

    if (data.taskType === "conditional_branch_v2") {
      const attrs = data.selectedAttributes ?? [];
      if (attrs.length > 0) {
        const label = getApprovalV2AttributeLabel(attrs[0]);
        lines.push(`IF ${label}`);
      } else {
        lines.push(taskLabel(data));
      }
    } else {
      lines.push(taskLabel(data));
    }
  }

  lines.push("End");
  return lines;
}
