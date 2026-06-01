import { computeStatus } from "./defaults";
import { APPROVAL_OUTCOME_ATTR } from "./mock-data";
import {
  buildMultisplitDecisionNode,
  isNestedMultisplitLevel,
  syncNestedMultisplitDecisions,
} from "./multisplit-decision";
import type {
  AnyTaskData,
  ApprovalLevelConfig,
  ApprovalSplitData,
  ConditionalBranchData,
  Policy,
  SplitBranchData,
  WorkflowNode,
} from "./types";

const ACCESS_DECISION = "access_decision";

/** A bare conditional sitting below a multisplit that routes the combined
 *  approval outcome — adopt it as the multisplit's decision instead of
 *  creating a fresh one. */
function looksLikeApprovalDecision(cb: ConditionalBranchData): boolean {
  if (cb.decisionKind) return true;
  const attrs = [ACCESS_DECISION, APPROVAL_OUTCOME_ATTR];
  if ((cb.routingAttributes ?? []).some((a) => attrs.includes(a))) return true;
  for (const b of cb.branches) {
    for (const c of b.condition?.conditions ?? []) {
      if (attrs.includes(c.attribute)) return true;
    }
  }
  return false;
}

function stripInlineDecision(level: ApprovalLevelConfig): ApprovalLevelConfig {
  if (level.embeddedConditional?.decisionKind) {
    const next = { ...level };
    delete next.embeddedConditional;
    return next;
  }
  return level;
}

/** A multisplit branch now holds at most one approval level (no inline
 *  outcome, no other blocks). Keep the first approval level, drop the rest. */
function collapseMultisplitBranch(branch: SplitBranchData): SplitBranchData {
  const first = branch.levels.find((l) => l.blockType === "approval_level");
  return { ...branch, levels: first ? [stripInlineDecision(first)] : [] };
}

function collapseLevels(levels: ApprovalLevelConfig[]): ApprovalLevelConfig[] {
  return levels.map((l) => {
    if (!l.embeddedConditional) return l;
    const branches = l.embeddedConditional.branches.map((b) => {
      const inner = { ...b, levels: collapseLevels(b.levels) };
      return isNestedMultisplitLevel(l) || l.blockType === "approval_split"
        ? collapseMultisplitBranch(inner)
        : inner;
    });
    return {
      ...l,
      embeddedConditional: { ...l.embeddedConditional, branches },
    };
  });
}

function collapseSplitBranches(
  branches: SplitBranchData[],
  isMultisplit: boolean,
): SplitBranchData[] {
  const collapsed = branches.map((b) => {
    const inner = { ...b, levels: collapseLevels(b.levels) };
    return isMultisplit ? collapseMultisplitBranch(inner) : inner;
  });
  return syncNestedMultisplitDecisions(collapsed);
}

/** v21: simplify approval multisplits — one approval level per branch, a single
 *  combined outcome decision below the whole multisplit (top-level), and the
 *  inline combined decision for any nested multisplit. */
export function migrateMultisplitDecisionNodes(
  nodes: WorkflowNode[],
): WorkflowNode[] {
  let result = nodes.map((n) => {
    if (n.kind !== "task") return n;
    const tt = (n.data as AnyTaskData).taskType;
    if (tt === "approval_split") {
      const d = n.data as ApprovalSplitData;
      return {
        ...n,
        data: { ...d, branches: collapseSplitBranches(d.branches, true) },
      };
    }
    if (tt === "conditional_branch") {
      const d = n.data as ConditionalBranchData;
      return {
        ...n,
        data: { ...d, branches: collapseSplitBranches(d.branches, false) },
      };
    }
    return n;
  });

  const insertions: { index: number; node: WorkflowNode }[] = [];
  for (let i = 0; i < result.length; i++) {
    const node = result[i];
    if (node.kind !== "task") continue;
    if ((node.data as AnyTaskData).taskType !== "approval_split") continue;
    const sd = node.data as ApprovalSplitData;
    if (sd.decisionNodeId && result.some((n) => n.id === sd.decisionNodeId)) {
      continue;
    }
    const next = result[i + 1];
    if (
      next?.kind === "task" &&
      (next.data as AnyTaskData).taskType === "conditional_branch" &&
      looksLikeApprovalDecision(next.data as ConditionalBranchData)
    ) {
      sd.decisionNodeId = next.id;
      next.data = {
        ...(next.data as ConditionalBranchData),
        decisionKind: "approval",
        sourceActionId: node.id,
        routingAttributes: [APPROVAL_OUTCOME_ATTR],
      };
      next.status = computeStatus(next);
    } else {
      const decisionNode = buildMultisplitDecisionNode(node.id, sd.name);
      sd.decisionNodeId = decisionNode.id;
      decisionNode.status = computeStatus(decisionNode);
      insertions.push({ index: i + 1, node: decisionNode });
    }
  }
  for (const ins of insertions.sort((a, b) => b.index - a.index)) {
    result.splice(ins.index, 0, ins.node);
  }

  return result.map((n) => ({ ...n, status: computeStatus(n) }));
}

export function migratePolicyMultisplitDecisions(policies: Policy[]): Policy[] {
  return policies.map((p) =>
    p.type === "approval"
      ? { ...p, nodes: migrateMultisplitDecisionNodes(p.nodes) }
      : p,
  );
}
