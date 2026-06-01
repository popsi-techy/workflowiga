import { uid } from "./defaults";
import { buildApprovalDecisionData, buildApprovalDecisionEmbedded } from "./approval-decision";
import { findBranchLevelContext } from "./branch-level-patch";
import type {
  AnyTaskData,
  ApprovalLevelConfig,
  ApprovalSplitData,
  ConditionalBranchData,
  EmbeddedConditionalData,
  SplitBranchData,
  WorkflowNode,
} from "./types";

/** True when an embedded flow is a parallel multisplit (vs. a conditional). */
export function isMultisplitEmbedded(emb?: EmbeddedConditionalData): boolean {
  return !!emb && emb.splitKind === "multisplit";
}

/** True when a branch level *is* a nested multisplit. */
export function isNestedMultisplitLevel(l: ApprovalLevelConfig): boolean {
  return (
    l.blockType === "approval_split" && isMultisplitEmbedded(l.embeddedConditional)
  );
}

/** True when a branch level is the auto-created combined-outcome decision that
 *  serves a (nested) multisplit. It lives as a sibling right below the
 *  multisplit and carries an approval decision keyed to the multisplit level. */
export function isMultisplitDecisionLevel(l: ApprovalLevelConfig): boolean {
  return (
    l.blockType === "conditional_branch" &&
    l.embeddedConditional?.decisionKind === "approval" &&
    !!l.embeddedConditional?.sourceLevelId
  );
}

/** Build the sibling level that hosts a nested multisplit's combined outcome. */
export function buildMultisplitDecisionLevel(
  sourceLevelId: string,
  name?: string,
): ApprovalLevelConfig {
  return {
    id: uid("lvl"),
    blockType: "conditional_branch",
    approverType: "",
    fallbackType: "",
    fallbackEmail: "",
    slaEnabled: false,
    slaDuration: 48,
    slaDurationUnit: "hours",
    autoApproveOnTimeout: false,
    embeddedConditional: buildApprovalDecisionEmbedded(sourceLevelId, name),
  };
}

/** Build the top-level combined-outcome decision node for an approval multisplit. */
export function buildMultisplitDecisionNode(
  splitId: string,
  name?: string,
): WorkflowNode {
  return {
    id: uid("task"),
    kind: "task",
    data: buildApprovalDecisionData(splitId, name),
    status: "incomplete",
  };
}

function levelsNeedSync(levels: ApprovalLevelConfig[]): boolean {
  for (let i = 0; i < levels.length; i++) {
    const l = levels[i];
    if (isNestedMultisplitLevel(l)) {
      const next = levels[i + 1];
      const ok =
        !!next &&
        isMultisplitDecisionLevel(next) &&
        next.embeddedConditional?.sourceLevelId === l.id;
      if (!ok) return true;
    }
    if (isMultisplitDecisionLevel(l)) {
      const prev = levels[i - 1];
      const ok =
        !!prev &&
        isNestedMultisplitLevel(prev) &&
        l.embeddedConditional?.sourceLevelId === prev.id;
      if (!ok) return true;
    }
    if (l.embeddedConditional) {
      for (const b of l.embeddedConditional.branches) {
        if (levelsNeedSync(b.levels)) return true;
      }
    }
  }
  return false;
}

/** True when any nested multisplit in this tree is missing its combined-outcome
 *  decision (or an orphaned one needs pruning). */
export function needsNestedMultisplitSync(branches: SplitBranchData[]): boolean {
  return branches.some((b) => levelsNeedSync(b.levels));
}

function syncLevels(levels: ApprovalLevelConfig[]): ApprovalLevelConfig[] {
  // 1. Recurse into every embedded flow first (deeper multisplits/conditionals).
  const recursed = levels.map((l) => {
    if (!l.embeddedConditional) return l;
    return {
      ...l,
      embeddedConditional: {
        ...l.embeddedConditional,
        branches: l.embeddedConditional.branches.map((b) => ({
          ...b,
          levels: syncLevels(b.levels),
        })),
      },
    };
  });

  // 2. Remember existing decisions (to preserve user config) then strip them.
  const existingBySource = new Map<string, ApprovalLevelConfig>();
  for (const l of recursed) {
    const src = l.embeddedConditional?.sourceLevelId;
    if (isMultisplitDecisionLevel(l) && src) existingBySource.set(src, l);
  }
  const base = recursed.filter((l) => !isMultisplitDecisionLevel(l));

  // 3. Re-emit, placing each nested multisplit's combined decision right below it.
  const out: ApprovalLevelConfig[] = [];
  for (const l of base) {
    out.push(l);
    if (isNestedMultisplitLevel(l)) {
      out.push(
        existingBySource.get(l.id) ??
          buildMultisplitDecisionLevel(l.id, l.embeddedConditional?.name),
      );
    }
  }
  return out;
}

/** Ensure every nested multisplit is immediately followed by its combined
 *  outcome decision, and drop orphaned decisions. Idempotent. */
export function syncNestedMultisplitDecisions(
  branches: SplitBranchData[],
): SplitBranchData[] {
  if (!needsNestedMultisplitSync(branches)) return branches;
  return branches.map((b) => ({ ...b, levels: syncLevels(b.levels) }));
}

/** True when the branch identified by (nodeId / embeddedHostLevelId, branchId)
 *  belongs to a multisplit (top-level approval_split or a nested multisplit). */
export function branchParentIsMultisplit(
  nodes: WorkflowNode[],
  nodeId: string,
  embeddedHostLevelId?: string,
): boolean {
  if (!embeddedHostLevelId) {
    const node = nodes.find((n) => n.id === nodeId);
    return (
      !!node &&
      node.kind === "task" &&
      (node.data as AnyTaskData).taskType === "approval_split"
    );
  }
  const ctx = findBranchLevelContext(nodes, embeddedHostLevelId);
  return !!ctx && isNestedMultisplitLevel(ctx.level);
}

/** Current levels of the target branch (top-level or nested), or null. */
export function getParentBranchLevels(
  nodes: WorkflowNode[],
  nodeId: string,
  branchId: string,
  embeddedHostLevelId?: string,
): ApprovalLevelConfig[] | null {
  let branches: SplitBranchData[] | undefined;
  if (!embeddedHostLevelId) {
    const node = nodes.find((n) => n.id === nodeId);
    branches = node ? (node.data as ApprovalSplitData).branches : undefined;
  } else {
    branches = findBranchLevelContext(nodes, embeddedHostLevelId)?.level
      .embeddedConditional?.branches;
  }
  return branches?.find((b) => b.id === branchId)?.levels ?? null;
}

/** True when a branch level sits directly inside an approval multisplit branch
 *  (top-level or nested). Conditional branches are excluded. */
export function levelIsInMultisplitBranch(
  nodes: WorkflowNode[],
  levelId: string,
): boolean {
  const ctx = findBranchLevelContext(nodes, levelId);
  if (!ctx) return false;
  if (!ctx.hostLevelId) {
    return (
      ctx.parentNode.kind === "task" &&
      (ctx.parentNode.data as AnyTaskData).taskType === "approval_split"
    );
  }
  const host = findBranchLevelContext(nodes, ctx.hostLevelId);
  return !!host && isNestedMultisplitLevel(host.level);
}

/** The sibling level id that hosts a nested multisplit's combined outcome,
 *  or null when the decision has not been created yet. */
export function findMultisplitDecisionHostId(
  nodes: WorkflowNode[],
  multisplitHostLevelId: string,
): string | null {
  function walk(levels: ApprovalLevelConfig[]): string | null {
    for (let i = 0; i < levels.length; i++) {
      const l = levels[i]!;
      if (l.id === multisplitHostLevelId && isNestedMultisplitLevel(l)) {
        const next = levels[i + 1];
        return next && isMultisplitDecisionLevel(next) ? next.id : null;
      }
      if (l.embeddedConditional) {
        for (const b of l.embeddedConditional.branches) {
          const hit = walk(b.levels);
          if (hit) return hit;
        }
      }
    }
    return null;
  }

  for (const n of nodes) {
    if (n.kind !== "task") continue;
    const d = n.data as ApprovalSplitData;
    if (!d.branches) continue;
    for (const b of d.branches) {
      const hit = walk(b.levels);
      if (hit) return hit;
    }
  }
  return null;
}

/** Re-sync a node's branches (approval split / conditional) in place if needed. */
export function withSyncedMultisplitDecisions(n: WorkflowNode): WorkflowNode {
  if (n.kind !== "task") return n;
  const tt = (n.data as AnyTaskData).taskType;
  if (tt !== "approval_split" && tt !== "conditional_branch") return n;
  const d = n.data as ApprovalSplitData | ConditionalBranchData;
  if (!d.branches || !needsNestedMultisplitSync(d.branches)) return n;
  return {
    ...n,
    data: { ...d, branches: syncNestedMultisplitDecisions(d.branches) },
  };
}
