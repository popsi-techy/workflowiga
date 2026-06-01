import { computeStatus, uid } from "./defaults";
import type { ApprovalPolicyData, WorkflowNode } from "./types";

export const APPROVAL_POLICY_EVENT_NAME = "Approval Policy";

export function isApprovalPolicyEvent(node: WorkflowNode): boolean {
  return (
    node.kind === "event" &&
    (node.data as ApprovalPolicyData).type === "approval_policy"
  );
}

/** Fixed approval-policy trigger — always first on the canvas below Start. */
export function createApprovalPolicyEventNode(): WorkflowNode {
  const node: WorkflowNode = {
    id: uid("event"),
    kind: "event",
    data: {
      type: "approval_policy",
      name: APPROVAL_POLICY_EVENT_NAME,
      description: "",
    } satisfies ApprovalPolicyData,
    status: "incomplete",
  };
  node.status = computeStatus(node);
  return node;
}

/** Ensures the single approval-policy event exists at index 0. */
export function ensureApprovalPolicyEvent(
  nodes: WorkflowNode[],
): WorkflowNode[] {
  const existing = nodes.find(isApprovalPolicyEvent);
  const withoutEvents = nodes.filter((n) => n.kind !== "event");
  const event = existing ?? createApprovalPolicyEventNode();
  const next = [event, ...withoutEvents];
  return next.map((n) => ({ ...n, status: computeStatus(n) }));
}
