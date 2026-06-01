import type { PolicyType } from "./types";

/** URL path segment per policy table. */
const SEGMENT: Record<PolicyType, string> = {
  workflow: "workflow-policies",
  approval: "approval-policies",
};

const SEGMENT_TO_TYPE: Record<string, PolicyType> = {
  "workflow-policies": "workflow",
  "approval-policies": "approval",
};

/** `/automation/workflow-policies` */
export function listPath(type: PolicyType): string {
  return `/automation/${SEGMENT[type]}`;
}

/** `/automation/workflow-policies/<id>` */
export function policyPath(type: PolicyType, id: string): string {
  return `/automation/${SEGMENT[type]}/${id}`;
}

export interface ParsedRoute {
  screen: "list" | "editor";
  type: PolicyType;
  policyId?: string;
}

/** Parse a `/automation/...` pathname into screen + type + optional policy id. */
export function parseAutomationPath(pathname: string): ParsedRoute | null {
  const parts = pathname.split("/").filter(Boolean); // ["automation", seg?, id?]
  if (parts[0] !== "automation") return null;
  const seg = parts[1];
  const type = seg ? SEGMENT_TO_TYPE[seg] : undefined;
  if (!type) return { screen: "list", type: "workflow" }; // bare /automation
  if (parts[2]) return { screen: "editor", type, policyId: parts[2] };
  return { screen: "list", type };
}
