import type { AnyTaskData, WorkflowNode } from "./types";
import { maxSplitNodeWidth, maxConditionalNodeWidth } from "./branch-column-layout";

const BASE_CANVAS_WIDTH = 720;

/** Minimum inner canvas width so wide multisplit trees can scroll horizontally. */
export function computeCanvasMinWidth(nodes: WorkflowNode[]): number {
  let max = BASE_CANVAS_WIDTH;
  for (const n of nodes) {
    if (n.kind !== "task") continue;
    const tt = (n.data as AnyTaskData).taskType;
    if (tt !== "approval_split" && tt !== "conditional_branch") continue;
    const branches =
      (n.data as { branches?: import("./types").SplitBranchData[] }).branches ??
      [];
    max =
      tt === "conditional_branch"
        ? Math.max(max, maxConditionalNodeWidth(branches) + 160)
        : Math.max(max, maxSplitNodeWidth(branches) + 160);
  }
  return max;
}
