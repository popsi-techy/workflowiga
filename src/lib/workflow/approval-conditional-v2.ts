import type { AttributeDef, BooleanCaseValue, Condition, Operator } from "./types";

const departmentOptions = [
  "Engineering",
  "Product",
  "Finance",
  "HR",
  "Sales",
  "Marketing",
  "Operations",
];
const locationOptions = [
  "Pune",
  "Bangalore",
  "Hyderabad",
  "San Francisco",
  "London",
  "Singapore",
  "Shanghai",
];
const jobTitleOptions = [
  "SDE Intern",
  "Software Engineer",
  "Senior Engineer",
  "Staff Engineer",
  "Engineering Manager",
  "Product Manager",
  "Finance Analyst",
  "HR Business Partner",
  "DG",
];

const OPERATOR_LABELS: Record<Operator, string> = {
  equals: "equals",
  not_equals: "does not equal",
  contains: "contains",
  starts_with: "starts with",
  in: "is one of",
  not_in: "is not one of",
  greater_than: "greater than",
  less_than: "less than",
  gte: "at least (≥)",
  lte: "at most (≤)",
};

/** Stable IAM relationship keys — unchanged for backward compatibility. */
export const RELATIONSHIP_ATTR_LABELS: Record<string, string> = {
  isRequesterManagerOfSubject: "Request initiator is target user's manager",
  isAnyOwnerLineManagerOfSubject: "Item owner is target user's manager",
  isRequesterItemOwner: "Request initiator owns requested item",
  isAnyOwnerSameDeptAsSubject: "Item owner is in target user's department",
  isLineManagerSameDeptAsSubject: "Target user's manager is in target user's department",
  isRequesterSameDeptAsSubject: "Request initiator is in target user's department",
  isRequesterSameCompanyAsSubject: "Request initiator is in target user's company",
  isAnyOwnerSameCompanyAsSubject: "Item owner is in target user's company",
};

export const RELATIONSHIP_BOOLEAN_OPTIONS = ["true", "false", "any", "none"] as const;

export const RELATIONSHIP_BOOLEAN_ATTRIBUTES: AttributeDef[] = Object.entries(
  RELATIONSHIP_ATTR_LABELS,
).map(([value, label]) => ({
  value,
  label,
  type: "select" as const,
  options: [...RELATIONSHIP_BOOLEAN_OPTIONS],
}));

function entityAttribute(
  prefix: string,
  field: string,
  label: string,
  options: string[],
): AttributeDef {
  return {
    value: `${prefix}_${field}`,
    label,
    type: "select",
    options,
  };
}

export const REQUEST_INITIATOR_V2_ATTRIBUTES: AttributeDef[] = [
  entityAttribute("request_initiator", "department", "Department", departmentOptions),
  entityAttribute("request_initiator", "location", "Location", locationOptions),
  entityAttribute("request_initiator", "job_title", "Job title", jobTitleOptions),
];

export const TARGET_USER_V2_ATTRIBUTES: AttributeDef[] = [
  entityAttribute("target_user", "department", "Department", departmentOptions),
  entityAttribute("target_user", "location", "Location", locationOptions),
  entityAttribute("target_user", "job_title", "Job title", jobTitleOptions),
];

export const MANAGER_V2_ATTRIBUTES: AttributeDef[] = [
  entityAttribute("manager", "department", "Department", departmentOptions),
  entityAttribute("manager", "location", "Location", locationOptions),
  entityAttribute("manager", "job_title", "Job title", jobTitleOptions),
];

export interface ApprovalV2AttributeGroup {
  id: string;
  label: string;
  attributes: AttributeDef[];
}

export const APPROVAL_V2_ATTRIBUTE_GROUPS: ApprovalV2AttributeGroup[] = [
  {
    id: "request_initiator",
    label: "Request initiator attributes",
    attributes: REQUEST_INITIATOR_V2_ATTRIBUTES,
  },
  {
    id: "target_user",
    label: "Target user attributes",
    attributes: TARGET_USER_V2_ATTRIBUTES,
  },
  {
    id: "manager",
    label: "Manager attributes",
    attributes: MANAGER_V2_ATTRIBUTES,
  },
];

export const APPROVAL_V2_ATTRIBUTES: AttributeDef[] =
  APPROVAL_V2_ATTRIBUTE_GROUPS.flatMap((g) => g.attributes);

const APPROVAL_V2_ATTR_LOOKUP = new Map(
  [
    ...RELATIONSHIP_BOOLEAN_ATTRIBUTES,
    ...APPROVAL_V2_ATTRIBUTES,
  ].map((a) => [a.value, a.label]),
);

export const RELATIONSHIP_VALUE_LABELS: Record<string, string> = {
  true: "True",
  false: "False",
  any: "Any",
  anyone: "Any",
  none: "None",
};

/** Human-readable label for relationship case chips and summaries. */
export const BOOLEAN_CASE_LABELS: Record<BooleanCaseValue, string> = {
  true: "True",
  false: "False",
  any: "Any",
  none: "None",
};

export function getApprovalV2AttributeLabel(attrId: string): string {
  return APPROVAL_V2_ATTR_LOOKUP.get(attrId) ?? attrId;
}

export function getApprovalV2AttributeDef(attrId: string): AttributeDef | undefined {
  return (
    RELATIONSHIP_BOOLEAN_ATTRIBUTES.find((a) => a.value === attrId) ??
    APPROVAL_V2_ATTRIBUTES.find((a) => a.value === attrId)
  );
}

export function approvalV2AttributeGroupId(attrId: string): string | null {
  if (attrId.startsWith("request_initiator_")) return "request_initiator";
  if (attrId.startsWith("target_user_")) return "target_user";
  if (attrId.startsWith("manager_")) return "manager";
  return null;
}

export function normalizeBooleanCaseValue(val: string): BooleanCaseValue | null {
  if (val === "anyone") return "any";
  if (val === "true" || val === "false" || val === "any" || val === "none") {
    return val;
  }
  return null;
}

export function normalizeAttributeCases(
  cases: Record<string, BooleanCaseValue[]>,
): Record<string, BooleanCaseValue[]> {
  const next: Record<string, BooleanCaseValue[]> = {};
  for (const [attr, vals] of Object.entries(cases)) {
    const normalized = vals
      .map((v) => normalizeBooleanCaseValue(v))
      .filter((v): v is BooleanCaseValue => v !== null);
    if (normalized.length > 0) next[attr] = normalized;
  }
  return next;
}

export function formatConditionValue(
  attrId: string,
  value: string | string[],
): string {
  if (Array.isArray(value)) return value.join(", ");
  if (RELATIONSHIP_ATTR_LABELS[attrId]) {
    return RELATIONSHIP_VALUE_LABELS[value] ?? value;
  }
  return value;
}

export function formatApprovalConditionRule(c: Condition): string {
  if (!c.attribute) return "Incomplete rule";
  const attrLabel = getApprovalV2AttributeLabel(c.attribute);
  const opLabel = OPERATOR_LABELS[c.operator] ?? c.operator;
  const valStr = formatConditionValue(c.attribute, c.value);
  return `${attrLabel} ${opLabel} ${valStr}`;
}
