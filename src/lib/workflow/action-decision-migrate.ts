import { uid, computeStatus } from "./defaults";
import { buildApprovalDecisionEmbedded } from "./approval-decision";
import { buildSodDecisionEmbedded, buildSodDecisionData } from "./sod-decision";
import {
  migrateConditionalBranchData,
  migrateEmbeddedConditionalData,
} from "./conditional-branch-migrate";
import {
  APPROVAL_OUTCOME_ATTR,
  SOD_RESULT_ATTR,
} from "./mock-data";
import type {
  AnyTaskData,
  ApprovalLevelConfig,
  ApprovalLevelData,
  ApprovalSplitData,
  ConditionalBranchData,
  EmbeddedConditionalData,
  Policy,
  SodCheckData,
  SplitBranchData,
  WorkflowNode,
} from "./types";

const ACCESS_DECISION = "access_decision";
const SOD_VIOLATION = "sod_violation";

function routesOnAttributes(
  data: ConditionalBranchData | EmbeddedConditionalData,
  attrs: string[],
): boolean {
  const routing = data.routingAttributes ?? [];
  if (routing.some((a) => attrs.includes(a))) return true;
  for (const b of data.branches) {
    for (const c of b.condition?.conditions ?? []) {
      if (attrs.includes(c.attribute)) return true;
    }
  }
  return false;
}

function looksLikeApprovalDecision(cb: ConditionalBranchData): boolean {
  if (cb.decisionKind) return false;
  return routesOnAttributes(cb, [ACCESS_DECISION, APPROVAL_OUTCOME_ATTR]);
}

function looksLikeSodDecision(cb: ConditionalBranchData): boolean {
  if (cb.decisionKind) return false;
  return routesOnAttributes(cb, [SOD_RESULT_ATTR, SOD_VIOLATION]);
}

function remapConditionAttribute(
  attribute: string,
  value: string | string[],
): { attribute: string; value: string | string[] } {
  if (attribute === ACCESS_DECISION) {
    return { attribute: APPROVAL_OUTCOME_ATTR, value };
  }
  if (attribute === SOD_VIOLATION && !Array.isArray(value)) {
    if (value === "Detected") {
      return { attribute: SOD_RESULT_ATTR, value: "Violation detected" };
    }
    if (value === "Not detected") {
      return { attribute: SOD_RESULT_ATTR, value: "No violation" };
    }
  }
  return { attribute, value };
}

function migrateBranchConditions(
  branches: SplitBranchData[],
): SplitBranchData[] {
  return branches.map((b) => ({
    ...b,
    condition: b.condition
      ? {
          ...b.condition,
          conditions: b.condition.conditions.map((c) => {
            const remapped = remapConditionAttribute(c.attribute, c.value);
            return { ...c, ...remapped };
          }),
        }
      : b.condition,
    levels: b.levels.map(migrateBranchLevel),
  }));
}

function migrateConditionalToDecision(
  data: ConditionalBranchData,
  kind: "approval" | "sod",
  sourceActionId: string,
): ConditionalBranchData {
  const migrated = migrateConditionalBranchData({
    ...data,
    branches: migrateBranchConditions(data.branches),
    routingAttributes:
      kind === "approval"
        ? [APPROVAL_OUTCOME_ATTR]
        : [SOD_RESULT_ATTR],
    decisionKind: kind,
    sourceActionId,
  });
  return migrated;
}

function migrateBranchLevel(level: ApprovalLevelConfig): ApprovalLevelConfig {
  let l = { ...level };

  if (l.embeddedConditional) {
    const emb = l.embeddedConditional;
    if (emb.decisionKind) {
      l = {
        ...l,
        embeddedConditional: {
          ...migrateEmbeddedConditionalData(emb),
          branches: migrateBranchConditions(emb.branches),
        },
      };
    } else if (l.blockType === "conditional_branch") {
      l = {
        ...l,
        embeddedConditional: {
          ...migrateEmbeddedConditionalData(emb),
          splitKind: emb.splitKind ?? "conditional",
          branches: migrateBranchConditions(emb.branches),
        },
      };
    } else if (l.blockType === "approval_split") {
      l = {
        ...l,
        embeddedConditional: {
          ...migrateEmbeddedConditionalData(emb),
          splitKind: emb.splitKind ?? "multisplit",
          branches: migrateBranchConditions(emb.branches),
        },
      };
    } else {
      l = {
        ...l,
        embeddedConditional: migrateEmbeddedConditionalData(emb),
      };
    }
  }

  if (
    l.blockType === "approval_level" &&
    !l.embeddedConditional?.decisionKind
  ) {
    l = {
      ...l,
      embeddedConditional: buildApprovalDecisionEmbedded(l.id, l.name),
    };
  }

  if (l.blockType === "sod_check" && !l.embeddedConditional?.decisionKind) {
    l = {
      ...l,
      embeddedConditional: buildSodDecisionEmbedded(l.id),
    };
  }

  return l;
}

function migrateSplitLikeNode(
  n: WorkflowNode,
): WorkflowNode {
  const tt = (n.data as AnyTaskData).taskType;
  if (tt === "approval_split") {
    const sd = n.data as ApprovalSplitData;
    return {
      ...n,
      data: {
        ...sd,
        branches: sd.branches.map((b) => ({
          ...b,
          levels: b.levels.map(migrateBranchLevel),
        })),
      },
    };
  }
  if (tt === "conditional_branch") {
    const cb = n.data as ConditionalBranchData;
    if (cb.decisionKind) {
      return {
        ...n,
        data: {
          ...cb,
          branches: migrateBranchConditions(cb.branches),
        },
      };
    }
    return {
      ...n,
      data: {
        ...migrateConditionalBranchData(cb),
        branches: migrateBranchConditions(cb.branches),
      },
    };
  }
  return n;
}

/** v20: link legacy action→sibling-decision pairs, attach inline branch
 *  decisions, and remap access_decision / sod_violation routing attrs. */
export function migrateActionDecisionNodes(
  nodes: WorkflowNode[],
): WorkflowNode[] {
  let result = nodes.map(migrateSplitLikeNode);
  const insertions: { index: number; node: WorkflowNode }[] = [];

  for (let i = 0; i < result.length; i++) {
    const node = result[i];
    if (node.kind !== "task") continue;
    const data = node.data as AnyTaskData;

    if (data.taskType === "approval_level") {
      const al = node.data as ApprovalLevelData;
      if (al.decisionNodeId) continue;
      const next = result[i + 1];
      if (
        next?.kind === "task" &&
        (next.data as AnyTaskData).taskType === "conditional_branch" &&
        looksLikeApprovalDecision(next.data as ConditionalBranchData)
      ) {
        al.decisionNodeId = next.id;
        next.data = migrateConditionalToDecision(
          next.data as ConditionalBranchData,
          "approval",
          node.id,
        );
        next.status = computeStatus(next);
      }
    }

    if (data.taskType === "sod_check") {
      const sod = node.data as SodCheckData;
      if (sod.decisionNodeId) continue;
      const next = result[i + 1];
      if (
        next?.kind === "task" &&
        (next.data as AnyTaskData).taskType === "conditional_branch" &&
        looksLikeSodDecision(next.data as ConditionalBranchData)
      ) {
        sod.decisionNodeId = next.id;
        next.data = migrateConditionalToDecision(
          next.data as ConditionalBranchData,
          "sod",
          node.id,
        );
        next.status = computeStatus(next);
      } else {
        const decisionId = uid("task");
        sod.decisionNodeId = decisionId;
        const decisionNode: WorkflowNode = {
          id: decisionId,
          kind: "task",
          data: buildSodDecisionData(node.id),
          status: "incomplete",
        };
        decisionNode.status = computeStatus(decisionNode);
        insertions.push({ index: i + 1, node: decisionNode });
      }
    }
  }

  for (const ins of insertions.sort((a, b) => b.index - a.index)) {
    result.splice(ins.index, 0, ins.node);
  }

  return result.map((n) => ({ ...n, status: computeStatus(n) }));
}

export function migratePolicyActionDecisions(
  policies: Policy[],
): Policy[] {
  return policies.map((p) => ({
    ...p,
    nodes: migrateActionDecisionNodes(p.nodes),
  }));
}

/** Stable ids for seeded policies refreshed on v20 (must match seed builders). */
export const ACTION_DECISION_SEED_POLICY_IDS = [
  "pol_ap_access_notify",
  "pol_ap_sod_dual",
  "pol_ap_sod_intern_risk",
] as const;
