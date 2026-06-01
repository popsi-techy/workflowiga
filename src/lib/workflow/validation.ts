import type { NodeKind, WorkflowNode } from "./types";

export interface PlacementResult {
  valid: boolean;
  reason?: string;
}

/**
 * JOINER lifecycle workflow.
 *
 *   Visual order: Start → Event → User Filter (optional) → Task(s) → End
 *
 * The Event must be created first (index 0). Filters and tasks are added
 * below the Event.
 */
export function canPlace(
  kind: NodeKind,
  index: number,
  nodes: WorkflowNode[],
): PlacementResult {
  const hasEvent = nodes.some((n) => n.kind === "event");

  if (kind === "event") {
    if (hasEvent) return { valid: false, reason: "Only one event allowed per workflow" };
    if (nodes.length > 0) return { valid: false, reason: "Event must be the first node added" };
    if (index !== 0) return { valid: false, reason: "Event must be the first node added" };
    return { valid: true };
  }

  if (kind === "filter") {
    if (!hasEvent) return { valid: false, reason: "Create the Event first" };
    // User Filters don't apply to approval policies.
    const isApproval = nodes.some(
      (n) =>
        n.kind === "event" &&
        (n.data as { type?: string }).type === "approval_policy",
    );
    if (isApproval)
      return { valid: false, reason: "Filters aren't used in approval policies" };
    const eventIndex = nodes.findIndex((n) => n.kind === "event");
    if (index <= eventIndex)
      return { valid: false, reason: "Filter must be added below the Event" };
    if (index < 0 || index > nodes.length)
      return { valid: false, reason: "Invalid position" };
    return { valid: true };
  }

  if (kind === "task") {
    if (!hasEvent) return { valid: false, reason: "Create the Event first" };
    const eventIndex = nodes.findIndex((n) => n.kind === "event");
    // Tasks may be inserted at any position below the Event — multiple allowed.
    if (index <= eventIndex)
      return { valid: false, reason: "Task must be added below the Event" };
    if (index > nodes.length) return { valid: false, reason: "Invalid position" };
    return { valid: true };
  }

  return { valid: false, reason: "Unknown node type" };
}

/**
 * The next addable kind+slot in the guided JOINER flow.
 *
 * - Empty canvas: Event is required first.
 * - Once an Event exists: the "Add Task" placeholder stays available at the
 *   tail (multiple tasks are allowed). Filter remains optional.
 */
export function nextExpectedPlacement(
  nodes: WorkflowNode[],
): { kind: NodeKind; index: number } | null {
  if (!nodes.some((n) => n.kind === "event")) return { kind: "event", index: 0 };
  return { kind: "task", index: nodes.length };
}

export function nextExpectedKind(nodes: WorkflowNode[]): NodeKind | null {
  return nextExpectedPlacement(nodes)?.kind ?? null;
}

/**
 * Whether a given kind can be placed *somewhere* in the workflow as it
 * currently stands. Used to disable left-panel cards.
 */
export function canPlaceAnywhere(
  kind: NodeKind,
  nodes: WorkflowNode[],
): PlacementResult {
  for (let i = 0; i <= nodes.length; i++) {
    const res = canPlace(kind, i, nodes);
    if (res.valid) return res;
  }
  return canPlace(kind, nodes.length, nodes);
}
