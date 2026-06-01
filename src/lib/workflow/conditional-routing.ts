import { uid } from "./defaults";
import { CONDITIONAL_ATTRIBUTES, APPROVAL_CONDITIONAL_ATTRIBUTES, OPERATORS } from "./mock-data";
import type {
  AttributeDef,
  ConditionalBranchData,
  Condition,
  Operator,
  SplitBranchData,
} from "./types";

export function getRoutingAttributeDef(
  attrId: string,
  context: "workflow" | "approval" = "workflow",
): AttributeDef | undefined {
  const set =
    context === "approval" ? APPROVAL_CONDITIONAL_ATTRIBUTES : CONDITIONAL_ATTRIBUTES;
  return set.find((a) => a.value === attrId);
}

export function getRoutingAttributeIds(data: ConditionalBranchData): string[] {
  if (data.routingAttributes?.length) return data.routingAttributes;
  return inferRoutingAttributeIds(data);
}

export function inferRoutingAttributeIds(data: ConditionalBranchData): string[] {
  const perBranch = data.branches
    .map((b) =>
      (b.condition?.conditions ?? [])
        .map((c) => c.attribute)
        .filter(Boolean),
    )
    .filter((ids) => ids.length > 0);

  if (perBranch.length === 0) return [];

  const signature = (ids: string[]) => [...new Set(ids)].sort().join("\0");
  const firstSig = signature(perBranch[0]);
  if (perBranch.every((ids) => signature(ids) === firstSig)) {
    return [...new Set(perBranch[0])];
  }

  const all = perBranch.flat();
  const uniq = [...new Set(all)];
  return uniq.length === 1 ? uniq : [];
}

export function getBranchRoutingValues(
  branch: SplitBranchData,
  attrIds: string[],
): Record<string, string> {
  const out = Object.fromEntries(attrIds.map((id) => [id, ""]));
  for (const c of branch.condition?.conditions ?? []) {
    if (!attrIds.includes(c.attribute)) continue;
    if (typeof c.value === "string") out[c.attribute] = c.value;
  }
  return out;
}

export function getBranchRoutingOperators(
  branch: SplitBranchData,
  attrIds: string[],
): Record<string, Operator> {
  const out = Object.fromEntries(
    attrIds.map((id) => {
      const def = getRoutingAttributeDef(id);
      return [id, def?.type === "number" ? "greater_than" : "equals"];
    }),
  ) as Record<string, Operator>;
  for (const c of branch.condition?.conditions ?? []) {
    if (attrIds.includes(c.attribute) && c.operator) {
      out[c.attribute] = c.operator;
    }
  }
  return out;
}

export function formatBranchRoutingSummary(
  attrIds: string[],
  values: Record<string, string>,
  operators?: Record<string, Operator>,
): string | null {
  const parts = attrIds
    .map((id) => {
      const v = values[id];
      if (!v) return null;
      const label = getRoutingAttributeDef(id)?.label ?? id;
      const def = getRoutingAttributeDef(id);
      const op = operators?.[id] ?? (def?.type === "number" ? "greater_than" : "equals");
      if (op !== "equals") {
        const opLabel =
          OPERATORS.find((o) => o.value === op)?.label ?? op;
        const unit = def?.unit ?? "";
        return `${label} ${opLabel} ${unit}${v}`;
      }
      return `${label} = ${v}`;
    })
    .filter((p): p is string => Boolean(p));
  return parts.length > 0 ? parts.join(" · ") : null;
}

export function syncBranchRoutingConditions(
  branch: SplitBranchData,
  attrIds: string[],
  values?: Record<string, string>,
  operators?: Record<string, Operator>,
): SplitBranchData {
  if (attrIds.length === 0) return branch;

  const vals = values ?? getBranchRoutingValues(branch, attrIds);
  const ops = operators ?? getBranchRoutingOperators(branch, attrIds);
  const existing = branch.condition?.conditions ?? [];

  const conditions: Condition[] = attrIds
    .filter((id) => vals[id])
    .map((id) => {
      const prev = existing.find((c) => c.attribute === id);
      const def = getRoutingAttributeDef(id);
      const defaultOp: Operator =
        def?.type === "number" ? "greater_than" : "equals";
      return {
        id: prev?.id ?? uid("c"),
        attribute: id,
        operator: ops[id] ?? defaultOp,
        value: vals[id],
      };
    });

  return {
    ...branch,
    condition: { logic: "AND", conditions },
  };
}

export function syncConditionalRoutingAttributes(
  data: ConditionalBranchData,
  nextAttrIds: string[],
): ConditionalBranchData {
  if (nextAttrIds.length === 0) {
    return { ...data, routingAttributes: undefined };
  }

  const branches = data.branches.map((b) =>
    syncBranchRoutingConditions(
      b,
      nextAttrIds,
      Object.fromEntries(nextAttrIds.map((id) => [id, ""])),
      Object.fromEntries(
        nextAttrIds.map((id) => {
          const def = getRoutingAttributeDef(id);
          return [
            id,
            def?.type === "number" ? ("greater_than" as Operator) : "equals",
          ];
        }),
      ),
    ),
  );

  return {
    ...data,
    routingAttributes: nextAttrIds,
    branches,
  };
}

export function setBranchRoutingField(
  branch: SplitBranchData,
  attrIds: string[],
  attrId: string,
  patch: { value?: string; operator?: Operator },
): SplitBranchData {
  const values = getBranchRoutingValues(branch, attrIds);
  const operators = getBranchRoutingOperators(branch, attrIds);
  if (patch.value !== undefined) values[attrId] = patch.value;
  if (patch.operator !== undefined) operators[attrId] = patch.operator;
  return syncBranchRoutingConditions(branch, attrIds, values, operators);
}
