import type {
  AnyTaskData,
  ApprovalLevelConfig,
  ApprovalLevelData,
  ApprovalSplitData,
  ConditionalBranchV2Data,
  SplitBranchData,
  WorkflowNode,
} from "../types";
import { linkedDecisionIds } from "./workflow-summary";

export type AssistantInsertTarget =
  | { kind: "root"; index: number }
  | {
      kind: "branch";
      parentNodeId: string;
      branchId: string;
      index: number;
      embeddedHostLevelId?: string;
    };

export interface AssistantInsertTargetOption {
  id: string;
  label: string;
  target: AssistantInsertTarget;
}

function levelLabel(level: ApprovalLevelConfig): string {
  if (level.name?.trim()) return level.name.trim();
  switch (level.blockType) {
    case "approval_level":
      return level.approverType ? `${level.approverType} approval` : "Approval level";
    case "skip":
      return "Skip";
    case "notification":
      return "Notification";
    case "exit":
      return "Exit";
    case "sod_check":
      return "SoD check";
    case "conditional_branch_v2":
      return level.name || "Conditional Type 2";
    case "conditional_branch":
      return level.name || "Conditional branch";
    case "approval_split":
      return level.name || "Multisplit branch";
    default:
      return "Step";
  }
}

function taskNodeLabel(node: WorkflowNode): string {
  if (node.kind !== "task") return "Step";
  const data = node.data as AnyTaskData;
  return data.name?.trim() || data.taskType?.replace(/_/g, " ") || "Step";
}

function branchTarget(
  parentNodeId: string,
  branchId: string,
  index: number,
  embeddedHostLevelId?: string,
): AssistantInsertTarget {
  return { kind: "branch", parentNodeId, branchId, index, embeddedHostLevelId };
}

function walkBranchLevels(
  parentNodeId: string,
  branch: SplitBranchData,
  parentLabel: string,
  embeddedHostLevelId: string | undefined,
  out: AssistantInsertTargetOption[],
) {
  const branchLabel = `${parentLabel} › ${branch.name}`;

  out.push({
    id: `br-${parentNodeId}-${embeddedHostLevelId ?? "root"}-${branch.id}-0`,
    label: `${branchLabel} — at start`,
    target: branchTarget(parentNodeId, branch.id, 0, embeddedHostLevelId),
  });

  branch.levels.forEach((level, i) => {
    out.push({
      id: `br-${parentNodeId}-${embeddedHostLevelId ?? "root"}-${branch.id}-${i + 1}`,
      label: `${branchLabel} — after ${levelLabel(level)}`,
      target: branchTarget(parentNodeId, branch.id, i + 1, embeddedHostLevelId),
    });

    if (level.embeddedConditional?.branches?.length) {
      const nestedLabel = `${branchLabel} › ${levelLabel(level)}`;
      for (const nested of level.embeddedConditional.branches) {
        walkBranchLevels(
          parentNodeId,
          nested,
          nestedLabel,
          level.id,
          out,
        );
      }
    }
  });
}

function walkSplitNode(node: WorkflowNode, out: AssistantInsertTargetOption[]) {
  if (node.kind !== "task") return;
  const data = node.data as ApprovalSplitData;
  if (!("branches" in data) || !Array.isArray(data.branches)) return;

  const parentLabel = taskNodeLabel(node);
  for (const branch of data.branches) {
    walkBranchLevels(node.id, branch, parentLabel, undefined, out);
  }
}

/** All places the assistant can insert a block. */
export function listAssistantInsertTargets(
  nodes: WorkflowNode[],
): AssistantInsertTargetOption[] {
  const out: AssistantInsertTargetOption[] = [];
  const decisionIds = linkedDecisionIds(nodes);

  let index = 0;
  for (const node of nodes) {
    if (node.kind === "event") {
      index += 1;
      continue;
    }

    if (node.kind === "task" && !decisionIds.has(node.id)) {
      out.push({
        id: `root-${index}`,
        label: `Before ${taskNodeLabel(node)}`,
        target: { kind: "root", index },
      });
    }
    index += 1;
  }

  out.push({
    id: `root-${nodes.length}`,
    label: "End of flow",
    target: { kind: "root", index: nodes.length },
  });

  for (const node of nodes) {
    if (node.kind !== "task") continue;
    const tt = (node.data as AnyTaskData).taskType;
    if (
      tt === "conditional_branch_v2" ||
      tt === "conditional_branch" ||
      tt === "approval_split"
    ) {
      walkSplitNode(node, out);
    }
  }

  return out;
}

export function formatInsertTargetLabel(
  nodes: WorkflowNode[],
  target: AssistantInsertTarget,
): string {
  const match = listAssistantInsertTargets(nodes).find((o) =>
    targetsEqual(o.target, target),
  );
  if (match) return match.label;

  if (target.kind === "root") {
    return target.index >= nodes.length
      ? "Main flow — at end"
      : `Main flow — position ${target.index + 1}`;
  }

  const parent = nodes.find((n) => n.id === target.parentNodeId);
  const branches =
    parent?.kind === "task" && "branches" in (parent.data as object)
      ? ((parent.data as ApprovalSplitData).branches ?? [])
      : [];
  const branch = branches.find((b) => b.id === target.branchId);
  return branch
    ? `${taskNodeLabel(parent!)} › ${branch.name}`
    : "Selected branch";
}

/** Turn a verbose branch name ("Attr label · True") into "True path". */
function shortBranchLabel(branchName: string): string {
  const segments = branchName.split("·").map((s) => s.trim());
  const last = segments[segments.length - 1];
  if (["True", "False", "Any", "None"].includes(last)) {
    return `${last} path`;
  }
  return branchName;
}

function findBranchInTree(
  branches: SplitBranchData[],
  branchId: string,
  hostLevelId: string | undefined,
): SplitBranchData | undefined {
  for (const b of branches) {
    if (!hostLevelId && b.id === branchId) return b;
    for (const level of b.levels) {
      if (!level.embeddedConditional) continue;
      if (hostLevelId && level.id === hostLevelId) {
        const hit = level.embeddedConditional.branches.find(
          (nb) => nb.id === branchId,
        );
        if (hit) return hit;
      }
      const deeper = findBranchInTree(
        level.embeddedConditional.branches,
        branchId,
        hostLevelId,
      );
      if (deeper) return deeper;
    }
  }
  return undefined;
}

export interface InsertTargetDescription {
  /** Short action phrase, e.g. "After Manager approval". */
  primary: string;
  /** Branch / context, e.g. "True path". */
  secondary?: string;
  /** True when adding to the very end of the main flow. */
  atEnd: boolean;
}

/** Compact, human description for the assistant location bar. */
export function describeInsertTarget(
  nodes: WorkflowNode[],
  target: AssistantInsertTarget,
): InsertTargetDescription {
  if (target.kind === "root") {
    if (target.index >= nodes.length) {
      return { primary: "End of flow", atEnd: true };
    }
    const node = nodes[target.index];
    const name =
      node && node.kind === "task" ? taskNodeLabel(node) : "next step";
    return { primary: `Before ${name}`, atEnd: false };
  }

  const parent = nodes.find((n) => n.id === target.parentNodeId);
  if (!parent || parent.kind !== "task" || !("branches" in (parent.data as object))) {
    return { primary: "Selected branch", atEnd: false };
  }
  const branches = (parent.data as ApprovalSplitData).branches ?? [];
  const branch = findBranchInTree(
    branches,
    target.branchId,
    target.embeddedHostLevelId,
  );
  if (!branch) {
    return { primary: "Selected branch", atEnd: false };
  }

  const primary =
    target.index <= 0
      ? "Start of branch"
      : `After ${levelLabel(branch.levels[target.index - 1]!)}`;
  return { primary, secondary: shortBranchLabel(branch.name), atEnd: false };
}

export function targetsEqual(
  a: AssistantInsertTarget,
  b: AssistantInsertTarget,
): boolean {
  if (a.kind !== b.kind) return false;
  if (a.kind === "root" && b.kind === "root") return a.index === b.index;
  if (a.kind === "branch" && b.kind === "branch") {
    return (
      a.parentNodeId === b.parentNodeId &&
      a.branchId === b.branchId &&
      a.index === b.index &&
      a.embeddedHostLevelId === b.embeddedHostLevelId
    );
  }
  return false;
}

/** Location of a branch level in the tree (for resolving canvas selection). */
export function findLevelLocation(
  nodes: WorkflowNode[],
  levelId: string,
): {
  parentNodeId: string;
  branchId: string;
  levelIndex: number;
  embeddedHostLevelId?: string;
} | null {
  function walkBranches(
    parentNodeId: string,
    branches: SplitBranchData[],
    hostLevelId?: string,
  ): ReturnType<typeof findLevelLocation> {
    for (const branch of branches) {
      for (let i = 0; i < branch.levels.length; i++) {
        const level = branch.levels[i]!;
        if (level.id === levelId) {
          return {
            parentNodeId,
            branchId: branch.id,
            levelIndex: i,
            embeddedHostLevelId: hostLevelId,
          };
        }
        if (level.embeddedConditional?.branches) {
          const deeper = walkBranches(
            parentNodeId,
            level.embeddedConditional.branches,
            level.id,
          );
          if (deeper) return deeper;
        }
      }
    }
    return null;
  }

  for (const n of nodes) {
    if (n.kind !== "task") continue;
    const data = n.data as ApprovalSplitData;
    if (!("branches" in data)) continue;
    const hit = walkBranches(n.id, data.branches);
    if (hit) return hit;
  }
  return null;
}

/** Insert after the selected canvas node (branch level or main-flow task). */
export function resolveTargetFromSelection(
  nodes: WorkflowNode[],
  selectedId: string | null,
): AssistantInsertTarget | null {
  if (!selectedId) return null;

  const levelLoc = findLevelLocation(nodes, selectedId);
  if (levelLoc) {
    return {
      kind: "branch",
      parentNodeId: levelLoc.parentNodeId,
      branchId: levelLoc.branchId,
      index: levelLoc.levelIndex + 1,
      embeddedHostLevelId: levelLoc.embeddedHostLevelId,
    };
  }

  const decisionIds = linkedDecisionIds(nodes);
  const nodeIndex = nodes.findIndex((n) => n.id === selectedId);
  if (nodeIndex < 0) return null;

  const node = nodes[nodeIndex]!;
  if (node.kind !== "task" || decisionIds.has(node.id)) return null;

  let insertIndex = nodeIndex + 1;
  const data = node.data as AnyTaskData;
  if (data.taskType === "approval_level") {
    const decisionId = (data as ApprovalLevelData).decisionNodeId;
    if (decisionId) {
      const decisionIdx = nodes.findIndex((n) => n.id === decisionId);
      if (decisionIdx >= 0) insertIndex = decisionIdx + 1;
    }
  }

  return { kind: "root", index: insertIndex };
}

/** Default insert point: the end of the main flow.
 *  Predictable — the user explicitly targets a branch by clicking it on the
 *  canvas or picking it from the location list. */
export function inferDefaultInsertTarget(
  nodes: WorkflowNode[],
): AssistantInsertTarget {
  return { kind: "root", index: nodes.length };
}

export function branchEndTarget(
  nodes: WorkflowNode[],
  parentNodeId: string,
  branchId: string,
  embeddedHostLevelId?: string,
): AssistantInsertTarget | null {
  const parent = nodes.find((n) => n.id === parentNodeId);
  if (!parent || parent.kind !== "task") return null;

  function findBranch(
    branches: SplitBranchData[],
  ): SplitBranchData | undefined {
    for (const b of branches) {
      if (b.id === branchId) return b;
      for (const level of b.levels) {
        if (
          level.embeddedConditional &&
          embeddedHostLevelId === level.id
        ) {
          const hit = findBranch(level.embeddedConditional.branches);
          if (hit) return hit;
        }
      }
    }
    return undefined;
  }

  const data = parent.data as ApprovalSplitData;
  if (!("branches" in data)) return null;

  let branch: SplitBranchData | undefined;
  if (embeddedHostLevelId) {
    branch = findBranch(data.branches);
  } else {
    branch = data.branches.find((b) => b.id === branchId);
  }
  if (!branch) return null;

  return {
    kind: "branch",
    parentNodeId,
    branchId,
    index: branch.levels.length,
    embeddedHostLevelId,
  };
}

/** After adding a conditional with configured paths, prefer the true branch tail. */
export function targetAfterConditionalDraft(
  nodes: WorkflowNode[],
  conditionalNodeId: string,
  attribute: string,
  path: "true" | "false" = "true",
): AssistantInsertTarget | null {
  const parent = nodes.find((n) => n.id === conditionalNodeId);
  if (!parent || parent.kind !== "task") return null;
  const data = parent.data as ConditionalBranchV2Data;
  if (data.taskType !== "conditional_branch_v2") return null;

  const branchId = `br_v2_${attribute}_${path}`;
  return branchEndTarget(nodes, conditionalNodeId, branchId);
}
