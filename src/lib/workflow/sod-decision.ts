import { uid, defaultConditionalBranch } from "./defaults";
import { defaultBranchExitConfig, routingEqualsCondition } from "./branch-blocks";
import { SOD_RESULT_ATTR, type SodResult } from "./mock-data";
import { getConditionBranches, getElseBranch } from "./conditional-branch";
import type {
  ConditionalBranchData,
  DecisionLike,
  EmbeddedConditionalData,
  SplitBranchData,
} from "./types";

/** Outcomes the user can split out of the catch-all into dedicated routes. */
export const SEPARABLE_SOD_OUTCOMES: SodResult[] = [
  "No violation",
  "Risk: Low",
  "Risk: Medium",
  "Risk: High",
];

export const SOD_OUTCOME_CHIP_LABEL: Record<string, string> = {
  "No violation": "Add SoD no violation rule",
  "Risk: Low": "Add low-risk rule",
  "Risk: Medium": "Add medium-risk rule",
  "Risk: High": "Add high-risk rule",
};

function outcomeBranch(outcome: SodResult, levels: SplitBranchData["levels"] = []): SplitBranchData {
  return {
    id: uid("br"),
    name: outcome,
    levels,
    condition: routingEqualsCondition(SOD_RESULT_ATTR, outcome),
  };
}

export function configuredSodOutcomes(data: DecisionLike): SodResult[] {
  const outcomes: SodResult[] = [];
  for (const b of getConditionBranches(data.branches)) {
    for (const c of b.condition?.conditions ?? []) {
      if (c.attribute === SOD_RESULT_ATTR && !Array.isArray(c.value)) {
        outcomes.push(c.value as SodResult);
      }
    }
  }
  return outcomes;
}

export function separableSodOutcomes(data: DecisionLike): SodResult[] {
  const taken = new Set(configuredSodOutcomes(data));
  return SEPARABLE_SOD_OUTCOMES.filter((o) => !taken.has(o));
}

/** Promote a risk-level outcome into its own ELSE IF route. */
export function addSodOutcomeRoute<T extends DecisionLike>(
  data: T,
  outcome: SodResult,
): T {
  if (configuredSodOutcomes(data).includes(outcome)) return data;
  const conditions = getConditionBranches(data.branches);
  const elseBranch = getElseBranch(data.branches)!;
  const nextConditions = [...conditions, outcomeBranch(outcome)];
  return {
    ...data,
    conditionCount: nextConditions.length,
    branchCount: nextConditions.length + 1,
    branches: [...nextConditions, elseBranch],
  };
}

/** Build the default decision for a SoD check: a "Violation detected" route
 *  (defaults to Exit/block) and a generic catch-all else that continues to the
 *  next step. "No violation" and risk levels are added via outcome chips. */
export function buildSodDecisionData(
  sourceActionId: string,
): ConditionalBranchData {
  const base = defaultConditionalBranch();
  const violation = outcomeBranch("Violation detected", [
    defaultBranchExitConfig({ name: "Exit" }),
  ]);
  const elseBranch: SplitBranchData = {
    ...getElseBranch(base.branches)!,
    levels: [],
  };
  return {
    ...base,
    name: "SoD result",
    decisionKind: "sod",
    sourceActionId,
    routingAttributes: [SOD_RESULT_ATTR],
    conditionCount: 1,
    branchCount: 2,
    branches: [violation, elseBranch],
  };
}

/** Inline-decision variant for a SoD check living inside a branch. */
export function buildSodDecisionEmbedded(
  sourceLevelId: string,
): EmbeddedConditionalData {
  const node = buildSodDecisionData(sourceLevelId);
  return {
    name: node.name,
    splitKind: "conditional",
    decisionKind: "sod",
    sourceLevelId,
    routingAttributes: node.routingAttributes,
    conditionCount: node.conditionCount,
    branchCount: node.branchCount,
    branches: node.branches,
    globalFallbackType: "",
  };
}
