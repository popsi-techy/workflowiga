import type { EventData, WorkflowNode } from "./types";

/** True when nodes belong to a joiner/mover/leaver workflow (not approval policy). */
export function isLifecycleWorkflow(nodes: WorkflowNode[]): boolean {
  const event = nodes.find((n) => n.kind === "event");
  if (!event) return true;
  return (event.data as EventData).type !== "approval_policy";
}

/**
 * Canonical vertical order for lifecycle workflows:
 * Start → Event → User Filter(s) → Task(s) → End
 */
export function normalizeWorkflowNodes(nodes: WorkflowNode[]): WorkflowNode[] {
  if (!isLifecycleWorkflow(nodes)) return nodes;
  const event = nodes.find((n) => n.kind === "event");
  if (!event) return nodes;
  const filters = nodes.filter((n) => n.kind === "filter");
  const tasks = nodes.filter((n) => n.kind === "task");
  return [event, ...filters, ...tasks];
}
