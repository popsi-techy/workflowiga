import type { DecisionKind, DecisionLike } from "./types";
import {
  addApprovalOutcomeRoute,
  APPROVAL_OUTCOME_CHIP_LABEL,
  separableApprovalOutcomes,
} from "./approval-decision";
import {
  addSodOutcomeRoute,
  SOD_OUTCOME_CHIP_LABEL,
  separableSodOutcomes,
} from "./sod-decision";

/** Outcomes still available to split into their own route, by decision kind. */
export function separableOutcomes(data: DecisionLike): string[] {
  if (data.decisionKind === "sod") return separableSodOutcomes(data);
  return separableApprovalOutcomes(data);
}

/** Promote an outcome into a dedicated ELSE IF route, by decision kind. */
export function addOutcomeRoute<T extends DecisionLike>(
  data: T,
  outcome: string,
): T {
  if (data.decisionKind === "sod") {
    return addSodOutcomeRoute(data, outcome as never);
  }
  return addApprovalOutcomeRoute(data, outcome as never);
}

export function outcomeChipLabel(
  kind: DecisionKind | undefined,
  outcome: string,
): string {
  const map =
    kind === "sod" ? SOD_OUTCOME_CHIP_LABEL : APPROVAL_OUTCOME_CHIP_LABEL;
  return (map as Record<string, string>)[outcome] ?? outcome;
}

export function decisionOutcomesTitle(kind: DecisionKind | undefined): {
  title: string;
  subtitle: string;
} {
  if (kind === "sod") {
    return {
      title: "Outcomes",
      subtitle:
        "Routes the request based on the SoD check result. First match wins.",
    };
  }
  return {
    title: "Outcomes",
    subtitle:
      "Routes the request based on the approval result. First match wins.",
  };
}
