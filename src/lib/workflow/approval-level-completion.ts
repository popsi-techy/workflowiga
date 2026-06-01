import type { ApprovalLevelData, CompletionMode } from "./types";

export const APPROVAL_LEVEL_COMPLETION_OPTIONS: {
  value: CompletionMode;
  label: string;
}[] = [
  { value: "all", label: "All must complete" },
  { value: "any", label: "Any one completes" },
  { value: "threshold", label: "A threshold complete" },
  { value: "majority", label: "Majority completes" },
];

/** How many approvers this level resolves to (for threshold / majority copy). */
export function approvalLevelApproverCount(
  data: Pick<ApprovalLevelData, "approverType" | "approverRefs">,
): number {
  const refs = data.approverRefs?.length ?? 0;
  if (refs > 0) return refs;
  if (data.approverType === "Manager") return 1;
  return 1;
}

export function majorityRequired(count: number): number {
  return Math.floor(Math.max(1, count) / 2) + 1;
}

export function approvalLevelCompletionSummary(
  mode: CompletionMode | undefined,
  approverCount: number,
  threshold?: number,
): string {
  const m = mode ?? "all";
  const n = Math.max(1, approverCount);
  switch (m) {
    case "all":
      return `All ${n} must complete`;
    case "any":
      return "Any one completes";
    case "threshold": {
      const t = Math.min(Math.max(1, threshold ?? 1), n);
      return `${t} of ${n} must complete`;
    }
    case "majority":
      return `${majorityRequired(n)} of ${n} must complete`;
    default:
      return "";
  }
}
