import type { ApprovalLevelConfig, SplitBranchData } from "./types";

export const BRANCH_COLUMN_SPACING = 480;

/** @deprecated Prefer splitBranchLayout() — kept as a floor for shallow estimates. */
export const NESTED_CONDITIONAL_BRANCH_SPACING = BRANCH_COLUMN_SPACING;

export function maxConditionalNodeWidth(
  branches: SplitBranchData[],
): number {
  return splitBranchLayout(branches).total;
}

export function nestedConditionalWidth(
  level: ApprovalLevelConfig,
): number {
  const emb = level.embeddedConditional;
  if (!emb?.branches.length) return 0;
  return splitBranchLayout(emb.branches).total;
}

/** Width of one branch column — expands when it contains a nested conditional. */
export function branchColumnWidth(branch: SplitBranchData): number {
  let width = BRANCH_COLUMN_SPACING;
  for (const level of branch.levels) {
    width = Math.max(width, nestedConditionalWidth(level));
  }
  return width;
}

export function splitBranchLayout(
  branches: SplitBranchData[],
  /** When set, every column uses this width (nested conditional inside a branch). */
  uniformColumnWidth?: number,
) {
  const widths = uniformColumnWidth
    ? branches.map(() => uniformColumnWidth)
    : branches.map((b) => branchColumnWidth(b));
  const total = widths.reduce((sum, w) => sum + w, 0);
  const centers = widths.map((w, i) => {
    const left = widths.slice(0, i).reduce((sum, x) => sum + x, 0);
    return left + w / 2;
  });
  return {
    widths,
    total,
    centers,
    centerX: total / 2,
  };
}

export function maxSplitNodeWidth(
  branches: SplitBranchData[],
): number {
  return splitBranchLayout(branches).total;
}
