import type { SplitBranchData } from "./types";

export type RoutingBranchKeyword = "IF" | "ELSE IF" | "ELSE";

export function branchHasRoutingCondition(branch: SplitBranchData): boolean {
  return (branch.condition?.conditions ?? []).some(
    (c) => c.attribute && (Array.isArray(c.value) ? c.value.length : c.value),
  );
}

/** Label for a conditional routing branch (evaluated top → bottom).
 *  When the ladder excludes the else path, every branch is IF / ELSE IF.
 *  When the full branch list includes the trailing else route, the last
 *  branch is always ELSE. */
export function routingBranchKeyword(
  index: number,
  total: number,
  options?: { hasElseBranch?: boolean },
): RoutingBranchKeyword {
  const hasElse = options?.hasElseBranch !== false;
  if (index === 0) return "IF";
  if (hasElse && index === total - 1) return "ELSE";
  return "ELSE IF";
}

export function routingBranchKeywordDescription(
  keyword: RoutingBranchKeyword,
): string {
  switch (keyword) {
    case "IF":
      return "Checked first";
    case "ELSE IF":
      return "Checked if nothing above matched";
    case "ELSE":
      return "Runs when nothing above matched";
  }
}
