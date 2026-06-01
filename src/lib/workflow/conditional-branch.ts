import { uid } from "./defaults";
import type { ApprovalLevelConfig, SplitBranchData } from "./types";

export const MIN_CONDITION_BRANCHES = 1;
export const MAX_CONDITION_BRANCHES = 7;

export const ELSE_BRANCH_DEFAULT_NAME = "No condition matched";

function defaultExitLevel(
  overrides?: Partial<ApprovalLevelConfig>,
): ApprovalLevelConfig {
  return {
    id: uid("lvl"),
    blockType: "exit",
    name: "Exit",
    exitOutcome: "End",
    approverType: "",
    fallbackType: "",
    fallbackEmail: "",
    slaEnabled: false,
    slaDuration: 48,
    slaDurationUnit: "hours",
    autoApproveOnTimeout: false,
    ...overrides,
  };
}

export type BranchContainer = {
  branches: SplitBranchData[];
  conditionCount?: number;
  branchCount?: number;
  /** When false, no trailing else / catch-all route. Defaults to true. */
  elseEnabled?: boolean;
};

export function resolveElseEnabled(data: BranchContainer): boolean {
  return data.elseEnabled !== false;
}

/** Last branch is the else / catch-all route when else is enabled. */
export function getElseBranch(
  branches: SplitBranchData[],
  elseEnabled = true,
): SplitBranchData | undefined {
  if (!elseEnabled || branches.length === 0) return undefined;
  return branches[branches.length - 1];
}

export function getElseBranchFromContainer(
  data: BranchContainer,
): SplitBranchData | undefined {
  return getElseBranch(data.branches, resolveElseEnabled(data));
}

export function getConditionBranches(
  branches: SplitBranchData[],
  elseEnabled = true,
): SplitBranchData[] {
  if (branches.length === 0) return [];
  if (!elseEnabled) return branches;
  if (branches.length <= 1) return [];
  return branches.slice(0, -1);
}

export function getConditionBranchesFromContainer(
  data: BranchContainer,
): SplitBranchData[] {
  return getConditionBranches(data.branches, resolveElseEnabled(data));
}

export function createDefaultElseBranch(): SplitBranchData {
  return {
    id: uid("br"),
    name: ELSE_BRANCH_DEFAULT_NAME,
    levels: [defaultExitLevel({ name: "Exit" })],
    condition: { logic: "AND", conditions: [] },
  };
}

function conditionBranchName(index: number): string {
  if (index === 0) return "If";
  return `Else if ${index}`;
}

export function createConditionBranch(index: number): SplitBranchData {
  return {
    id: uid("br"),
    name: conditionBranchName(index),
    levels: [],
    condition: { logic: "AND", conditions: [] },
  };
}

/** Build IF / ELSE IF branches plus an optional trailing else route. */
export function buildConditionalBranches(
  conditionCount: number,
  existingElse?: SplitBranchData,
  elseEnabled = true,
): SplitBranchData[] {
  const count = Math.max(
    MIN_CONDITION_BRANCHES,
    Math.min(MAX_CONDITION_BRANCHES, conditionCount),
  );
  const conditionBranches = Array.from({ length: count }, (_, i) =>
    createConditionBranch(i),
  );
  if (!elseEnabled) return conditionBranches;
  const elseBranch = existingElse ?? createDefaultElseBranch();
  return [...conditionBranches, elseBranch];
}

export function resolveConditionCount(data: BranchContainer): number {
  if (typeof data.conditionCount === "number") return data.conditionCount;
  const hasElse = resolveElseEnabled(data);
  const fromBranches = hasElse
    ? Math.max(0, data.branches.length - 1)
    : data.branches.length;
  if (fromBranches > 0) return fromBranches;
  return typeof data.branchCount === "number"
    ? Math.max(0, data.branchCount - (hasElse ? 1 : 0))
    : 0;
}

export function isConditionalSetupComplete(data: BranchContainer): boolean {
  return getConditionBranchesFromContainer(data).length >= MIN_CONDITION_BRANCHES;
}

export function syncConditionalBranchMeta(
  conditionCount: number,
  branches: SplitBranchData[],
  elseEnabled = true,
): {
  conditionCount: number;
  branchCount: number;
  branches: SplitBranchData[];
  elseEnabled: boolean;
} {
  return {
    conditionCount,
    branchCount: elseEnabled ? conditionCount + 1 : conditionCount,
    branches,
    elseEnabled,
  };
}

export function applyConditionCount(
  data: BranchContainer,
  nextCount: number,
): ReturnType<typeof syncConditionalBranchMeta> {
  const count = Math.max(
    MIN_CONDITION_BRANCHES,
    Math.min(MAX_CONDITION_BRANCHES, nextCount),
  );
  const hasElse = resolveElseEnabled(data);
  const existingElse = getElseBranch(data.branches, hasElse);
  const existingConditions = getConditionBranches(data.branches, hasElse);

  const conditionBranches: SplitBranchData[] = [];
  for (let i = 0; i < count; i++) {
    conditionBranches.push(
      existingConditions[i] ?? createConditionBranch(i),
    );
  }

  if (!hasElse) {
    return syncConditionalBranchMeta(count, conditionBranches, false);
  }

  const elseBranch = existingElse ?? createDefaultElseBranch();

  if (elseBranch.levels.length === 0) {
    elseBranch.levels = [defaultExitLevel({ name: "Exit" })];
  }

  return syncConditionalBranchMeta(count, [...conditionBranches, elseBranch], true);
}

export function addElseIfBranch(data: BranchContainer): ReturnType<
  typeof syncConditionalBranchMeta
> {
  const current = resolveConditionCount(data);
  if (current >= MAX_CONDITION_BRANCHES) {
    return {
      conditionCount: current,
      branchCount: data.branches.length,
      branches: data.branches,
      elseEnabled: resolveElseEnabled(data),
    };
  }
  return applyConditionCount(data, current + 1);
}

export function removeConditionBranch(
  data: BranchContainer,
  branchId: string,
): ReturnType<typeof syncConditionalBranchMeta> | null {
  const hasElse = resolveElseEnabled(data);
  const conditions = getConditionBranches(data.branches, hasElse);
  if (conditions.length <= MIN_CONDITION_BRANCHES) return null;
  if (!conditions.some((b) => b.id === branchId)) return null;
  const nextConditions = conditions.filter((b) => b.id !== branchId);
  const count = nextConditions.length;
  if (!hasElse) {
    return syncConditionalBranchMeta(count, nextConditions, false);
  }
  const elseBranch = getElseBranch(data.branches, true)!;
  return syncConditionalBranchMeta(count, [...nextConditions, elseBranch], true);
}

export function removeElseBranch(
  data: BranchContainer,
): ReturnType<typeof syncConditionalBranchMeta> | null {
  if (!resolveElseEnabled(data)) return null;
  const conditions = getConditionBranches(data.branches, true);
  if (conditions.length < MIN_CONDITION_BRANCHES) return null;
  const count = conditions.length;
  return syncConditionalBranchMeta(count, conditions, false);
}

export function addElseBranch(
  data: BranchContainer,
): ReturnType<typeof syncConditionalBranchMeta> {
  if (resolveElseEnabled(data)) {
    return {
      conditionCount: resolveConditionCount(data),
      branchCount: data.branches.length,
      branches: data.branches,
      elseEnabled: true,
    };
  }
  const count = resolveConditionCount(data);
  const elseBranch = createDefaultElseBranch();
  return syncConditionalBranchMeta(
    count,
    [...getConditionBranches(data.branches, false), elseBranch],
    true,
  );
}

export function defaultUnconfiguredConditionalBranches(): SplitBranchData[] {
  return [createDefaultElseBranch()];
}
