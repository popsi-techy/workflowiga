import { ATTRIBUTES, ACCESS_CONTEXT_ATTRIBUTES, ROUTING_SIGNAL_ATTRIBUTES } from "./mock-data";
import type { ApprovalSplitData, SplitBranchData } from "./types";

export function getSplitAttributeIds(data: ApprovalSplitData): string[] {
  if (data.branchAttributes?.length) return data.branchAttributes;
  if (data.branchAttribute) return [data.branchAttribute];
  return [];
}

export function getAttributeDef(attrId: string) {
  return (
    ATTRIBUTES.find((a) => a.value === attrId) ??
    ACCESS_CONTEXT_ATTRIBUTES.find((a) => a.value === attrId) ??
    ROUTING_SIGNAL_ATTRIBUTES.find((a) => a.value === attrId)
  );
}

export function getBranchAttributeValues(
  branch: SplitBranchData,
  attrIds: string[],
): Record<string, string> {
  if (branch.attributeValues && Object.keys(branch.attributeValues).length > 0) {
    const out: Record<string, string> = {};
    for (const id of attrIds) {
      out[id] = branch.attributeValues[id] ?? "";
    }
    return out;
  }
  if (branch.attributeValue && attrIds.length === 1) {
    return { [attrIds[0]]: branch.attributeValue };
  }
  return Object.fromEntries(attrIds.map((id) => [id, ""]));
}

export function branchSplitName(
  attrIds: string[],
  values: Record<string, string>,
): string {
  const parts = attrIds.map((id) => values[id]).filter(Boolean);
  return parts.length > 0 ? parts.join(" · ") : "Branch";
}

export function formatBranchSplitSummary(
  attrIds: string[],
  values: Record<string, string>,
): string {
  const parts = attrIds
    .map((id) => {
      const v = values[id];
      if (!v) return null;
      const label = getAttributeDef(id)?.label ?? id;
      return `${label}: ${v}`;
    })
    .filter((p): p is string => Boolean(p));
  return parts.length > 0 ? parts.join(" · ") : "Pick values";
}

export function branchSplitValuesComplete(
  branch: SplitBranchData,
  attrIds: string[],
): boolean {
  if (attrIds.length === 0) return true;
  const values = getBranchAttributeValues(branch, attrIds);
  return attrIds.every((id) => Boolean(values[id]));
}

export function syncBranchSplitFields(
  branch: SplitBranchData,
  attrIds: string[],
): SplitBranchData {
  if (attrIds.length === 0) {
    return {
      ...branch,
      attributeValue: undefined,
      attributeValues: undefined,
    };
  }
  const values = getBranchAttributeValues(branch, attrIds);
  const attributeValues = Object.fromEntries(
    attrIds.map((id) => [id, values[id] ?? ""]),
  );
  return {
    ...branch,
    attributeValues,
    attributeValue: attrIds.length === 1 ? attributeValues[attrIds[0]] : undefined,
    name: branchSplitName(attrIds, attributeValues),
  };
}

export function syncApprovalSplitAttributes(
  data: ApprovalSplitData,
): ApprovalSplitData {
  const attrIds = getSplitAttributeIds(data);
  if (attrIds.length === 0) {
    return {
      ...data,
      branchAttributes: undefined,
      branchAttribute: undefined,
      branches: data.branches.map((b, i) => ({
        ...b,
        attributeValue: undefined,
        attributeValues: undefined,
        name: b.name.startsWith("Branch") ? `Branch ${i + 1}` : b.name,
      })),
    };
  }
  const branches = data.branches.map((b) => syncBranchSplitFields(b, attrIds));
  return {
    ...data,
    branchAttributes: attrIds,
    branchAttribute: attrIds.length === 1 ? attrIds[0] : undefined,
    branchCount: branches.length,
    branches,
  };
}
