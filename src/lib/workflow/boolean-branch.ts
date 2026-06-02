import type {
  AttributeDef,
  BooleanCaseValue,
  ConditionalBranchV2Data,
  SplitBranchData,
  EmbeddedConditionalData,
} from "./types";
import { defaultBranchExitConfig } from "./branch-blocks";
import { uid } from "./defaults";

/** The 8 IAM relationship boolean attributes available in Conditional Type 2. */
export const BOOLEAN_ATTRIBUTES: AttributeDef[] = [
  { value: "isRequesterManagerOfSubject", label: "isRequesterManagerOfSubject", type: "select", options: ["true", "false", "any", "none"] },
  { value: "isAnyOwnerLineManagerOfSubject", label: "isAnyOwnerLineManagerOfSubject", type: "select", options: ["true", "false", "any", "none"] },
  { value: "isRequesterItemOwner", label: "isRequesterItemOwner", type: "select", options: ["true", "false", "any", "none"] },
  { value: "isAnyOwnerSameDeptAsSubject", label: "isAnyOwnerSameDeptAsSubject", type: "select", options: ["true", "false", "any", "none"] },
  { value: "isLineManagerSameDeptAsSubject", label: "isLineManagerSameDeptAsSubject", type: "select", options: ["true", "false", "any", "none"] },
  { value: "isRequesterSameDeptAsSubject", label: "isRequesterSameDeptAsSubject", type: "select", options: ["true", "false", "any", "none"] },
  { value: "isRequesterSameCompanyAsSubject", label: "isRequesterSameCompanyAsSubject", type: "select", options: ["true", "false", "any", "none"] },
  { value: "isAnyOwnerSameCompanyAsSubject", label: "isAnyOwnerSameCompanyAsSubject", type: "select", options: ["true", "false", "any", "none"] },
];

/** Human-readable label for each case chip. */
export const BOOLEAN_CASE_LABELS: Record<BooleanCaseValue, string> = {
  true: "True",
  false: "False",
  any: "Any",
  none: "None",
};

/** Ordered case values as they appear in the UI row. */
export const BOOLEAN_CASE_ORDER: BooleanCaseValue[] = ["true", "false", "any", "none"];

/** Stable deterministic branch id for a given {attribute, case} pair.
 *  Keeps levels alive when the user deselects and re-selects an attribute. */
export function branchIdForAttrCase(attr: string, val: BooleanCaseValue): string {
  return `br_v2_${attr}_${val}`;
}

/** Display name for an auto-generated branch. */
export function branchNameForAttrCase(attr: string, val: BooleanCaseValue): string {
  return `${attr} · ${BOOLEAN_CASE_LABELS[val]}`;
}

/** Rebuilds the `branches` array from the current selections.
 *  Preserves existing branch levels so any blocks dropped inside survive a patch. */
export function syncConditionalV2Branches(
  data: ConditionalBranchV2Data,
  previousBranches: SplitBranchData[] = [],
): ConditionalBranchV2Data {
  // Build a lookup of previous branches by stable id.
  const prev = new Map<string, SplitBranchData>(
    previousBranches.map((b) => [b.id, b]),
  );

  const conditionBranches: SplitBranchData[] = [];

  // Check if we have any active cases selected across all selected attributes
  let hasAnyCases = false;
  for (const attr of data.selectedAttributes) {
    const cases = data.attributeCases[attr] ?? [];
    if (cases.length > 0) {
      hasAnyCases = true;
      break;
    }
  }

  if (data.selectedAttributes.length === 0 || !hasAnyCases) {
    const emptyId = "br_v2_empty_if";
    const existingEmpty = prev.get(emptyId);
    conditionBranches.push({
      id: emptyId,
      name: "IF Set condition",
      levels: existingEmpty?.levels ?? [],
      condition: { logic: "AND", conditions: [] },
    });
  } else {
    for (const attr of data.selectedAttributes) {
      const cases = data.attributeCases[attr] ?? [];
      for (const val of BOOLEAN_CASE_ORDER.filter((v) => cases.includes(v))) {
        const id = branchIdForAttrCase(attr, val);
        const name = branchNameForAttrCase(attr, val);
        const existing = prev.get(id);
        conditionBranches.push({
          id,
          name,
          levels: existing?.levels ?? [],
          condition: {
            logic: "AND",
            conditions: [
              {
                id: uid("c"),
                attribute: attr,
                operator: "equals",
                value: val,
              },
            ],
          },
        });
      }
    }
  }

  const advancedBranches: SplitBranchData[] = (data.advancedConditions ?? []).map(adv => {
    const existing = prev.get(adv.id);
    return {
      id: adv.id,
      name: adv.name || "Advanced condition",
      levels: existing?.levels ?? [],
      condition: adv.condition,
    };
  });

  let elseBranch: SplitBranchData | null = null;
  if (data.elseEnabled) {
    const elseId = "br_v2_else";
    const existingElse = prev.get(elseId);
    elseBranch = {
      id: elseId,
      name: "No condition matched",
      levels: existingElse?.levels ?? [defaultBranchExitConfig({ name: "Exit" })],
      condition: { logic: "AND", conditions: [] },
    };
  }

  return {
    ...data,
    branches: elseBranch
      ? [...conditionBranches, ...advancedBranches, elseBranch]
      : [...conditionBranches, ...advancedBranches],
  };
}

export function syncEmbeddedConditionalV2Branches(
  data: EmbeddedConditionalData,
  previousBranches: SplitBranchData[] = [],
): EmbeddedConditionalData {
  const dummy: ConditionalBranchV2Data = {
    taskType: "conditional_branch_v2",
    name: data.name,
    conditionType: data.conditionType ?? "boolean",
    selectedAttributes: data.selectedAttributes ?? [],
    attributeCases: data.attributeCases ?? {},
    elseEnabled: data.elseEnabled !== false,
    branches: data.branches ?? [],
    globalFallbackType: data.globalFallbackType ?? "",
    globalFallbackEmail: "",
    globalFallbackUsers: [],
    advancedConditions: data.advancedConditions ?? [],
  };
  const synced = syncConditionalV2Branches(dummy, previousBranches);
  return {
    ...data,
    selectedAttributes: synced.selectedAttributes,
    attributeCases: synced.attributeCases,
    advancedConditions: synced.advancedConditions,
    elseEnabled: synced.elseEnabled,
    branches: synced.branches,
  };
}
