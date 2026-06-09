import { buildManagerOwnerAccessApprovalNodes } from "../approval-flow-seed";
import { buildSodDualApprovalNodes } from "../sod-policy-seeds";
import {
  approverTypeFromChoice,
  buildApprovalNodes,
  buildEmergencyAccessNodes,
  buildManagerSkipConditional,
  finalizeNodes,
} from "./actions";
import { buildAmanTestWorkflowNodes } from "./ladder-workflow";
import type { WorkflowNode } from "../types";

export interface WorkflowTemplate {
  id: string;
  name: string;
  description: string;
  tags: string[];
  build: () => WorkflowNode[];
}

export const WORKFLOW_TEMPLATES: WorkflowTemplate[] = [
  {
    id: "standard_manager",
    name: "Standard manager approval",
    description: "Single manager approval with outcome routing for approved and rejected paths.",
    tags: ["Simple", "Manager"],
    build: () => finalizeNodes(buildApprovalNodes("Manager", "Manager approval")),
  },
  {
    id: "multi_level",
    name: "Multi-level approval",
    description: "Manager approval followed by entitlement owner approval with notifications.",
    tags: ["Manager", "Owner"],
    build: () => finalizeNodes(buildManagerOwnerAccessApprovalNodes()),
  },
  {
    id: "manager_dept_head",
    name: "Manager then department head",
    description: "Two sequential approvals — manager first, then department head.",
    tags: ["Manager", "Department Head"],
    build: () => {
      const manager = buildApprovalNodes("Manager", "Manager approval");
      const deptHead = buildApprovalNodes(
        approverTypeFromChoice("Department Head"),
        "Department head approval",
      );
      return finalizeNodes([...manager, ...deptHead]);
    },
  },
  {
    id: "manager_owner",
    name: "Manager then application owner",
    description: "Manager gates access; application owner approves in the approved branch.",
    tags: ["Manager", "Owner"],
    build: () => finalizeNodes(buildManagerOwnerAccessApprovalNodes()),
  },
  {
    id: "emergency_access",
    name: "Emergency access approval",
    description: "Fast-track manager approval with 4-hour SLA and completion notification.",
    tags: ["Emergency", "SLA"],
    build: () => buildEmergencyAccessNodes(),
  },
  {
    id: "manager_skip",
    name: "Skip when requester is manager",
    description: "Skip approval when the request initiator is the target user's manager.",
    tags: ["Conditional", "Skip"],
    build: () => finalizeNodes([buildManagerSkipConditional()]),
  },
  {
    id: "aman_test",
    name: "Aman test routing ladder",
    description:
      "Four nested conditions: item ownership, department, manager relationship, and manager job title (DG).",
    tags: ["Ladder", "Product Owner", "Governance"],
    build: () => buildAmanTestWorkflowNodes(),
  },
  {
    id: "parallel_dual",
    name: "Parallel manager & owner",
    description: "Manager and owner approve in parallel via multisplit branch.",
    tags: ["Parallel", "SoD"],
    build: () => finalizeNodes(buildSodDualApprovalNodes()),
  },
];

export function getTemplateById(id: string): WorkflowTemplate | undefined {
  return WORKFLOW_TEMPLATES.find((t) => t.id === id);
}
