import type {
  ConditionalBranchData,
  EmbeddedConditionalData,
  SplitBranchData,
  WorkflowNode,
} from "./types";
import { defaultBranchExitConfig } from "./branch-blocks";
import { defaultConditionalBranch } from "./defaults";
import {
  applyConditionCount,
  createDefaultElseBranch,
  getConditionBranches,
  getElseBranch,
  resolveConditionCount,
} from "./conditional-branch";

function ensureElseExit(branch: SplitBranchData): SplitBranchData {
  if (branch.levels.length > 0) return branch;
  return {
    ...branch,
    levels: [defaultBranchExitConfig({ name: "Exit" })],
  };
}

export function migrateConditionalBranchData(
  data: ConditionalBranchData,
): ConditionalBranchData {
  if (data.branches.length === 0) {
    return defaultConditionalBranch() as ConditionalBranchData;
  }

  if (data.branches.length === 1) {
    const elseOnly = ensureElseExit(data.branches[0]!);
    return {
      ...data,
      conditionCount: 0,
      branchCount: 1,
      branches: [elseOnly],
    };
  }

  const existingCount = resolveConditionCount(data);
  if (existingCount >= 1) {
    const conditions = getConditionBranches(data.branches);
    const elseBranch = ensureElseExit(getElseBranch(data.branches)!);
    return {
      ...data,
      conditionCount: conditions.length,
      branchCount: conditions.length + 1,
      branches: [...conditions, elseBranch],
    };
  }

  return applyConditionCount(data, data.branches.length - 1) as ConditionalBranchData;
}

export function migrateEmbeddedConditionalData(
  data: EmbeddedConditionalData,
): EmbeddedConditionalData {
  if (data.branches.length <= 1) {
    const elseOnly = ensureElseExit(
      data.branches[0] ?? createDefaultElseBranch(),
    );
    return {
      ...data,
      conditionCount: 0,
      branchCount: 1,
      branches: [elseOnly],
    };
  }

  const existingCount = resolveConditionCount(data);
  if (existingCount >= 1) {
    const conditions = getConditionBranches(data.branches);
    const elseBranch = ensureElseExit(getElseBranch(data.branches)!);
    return {
      ...data,
      conditionCount: conditions.length,
      branchCount: conditions.length + 1,
      branches: [...conditions, elseBranch],
    };
  }

  const migrated = applyConditionCount(data, data.branches.length - 1);
  return { ...data, ...migrated };
}

function migrateLevelEmbedded(
  level: import("./types").ApprovalLevelConfig,
): import("./types").ApprovalLevelConfig {
  if (level.blockType !== "conditional_branch" || !level.embeddedConditional) {
    return level;
  }
  return {
    ...level,
    embeddedConditional: migrateEmbeddedConditionalData(
      level.embeddedConditional,
    ),
  };
}

export function migrateConditionalBranchNodes(
  nodes: WorkflowNode[],
): WorkflowNode[] {
  return nodes.map((n) => {
    if (n.kind !== "task") return n;
    const tt = (n.data as { taskType?: string }).taskType;
    if (tt === "conditional_branch") {
      return {
        ...n,
        data: migrateConditionalBranchData(
          n.data as ConditionalBranchData,
        ),
      };
    }
    if (tt === "approval_split") {
      const sd = n.data as import("./types").ApprovalSplitData;
      return {
        ...n,
        data: {
          ...sd,
          branches: sd.branches.map((b) => ({
            ...b,
            levels: b.levels.map(migrateLevelEmbedded),
          })),
        },
      };
    }
    return n;
  });
}

export function migratePolicyConditionalBranches(
  policies: import("./types").Policy[],
): import("./types").Policy[] {
  return policies.map((p) => ({
    ...p,
    nodes: migrateConditionalBranchNodes(p.nodes),
  }));
}
