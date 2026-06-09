import {
  computeStatus,
  defaultApprovalLevelConfig,
  defaultConditionalBranchV2,
  uid,
} from "../defaults";
import { ensureApprovalPolicyEvent } from "../approval-policy";
import { buildApprovalDecisionEmbedded } from "../approval-decision";
import {
  branchIdForAttrCase,
  syncConditionalV2Branches,
  syncEmbeddedConditionalV2Branches,
} from "../boolean-branch";
import { getApprovalV2AttributeLabel } from "../approval-conditional-v2";
import type {
  ApprovalLevelConfig,
  ApproverType,
  ConditionalBranchV2Data,
  EmbeddedConditionalData,
  WorkflowNode,
} from "../types";

/** Shared approval level defaults by display name (reused across branches). */
const APPROVAL_LEVEL_DEFAULTS: Record<string, ApproverType> = {
  "Product Owner": "Owner",
  "Approval Stage 2": "Manager",
  "Governance Group": "Governance Group",
};

function branchApprovalLevel(name: string, approverType: ApproverType): ApprovalLevelConfig {
  const id = uid("lvl");
  return {
    ...defaultApprovalLevelConfig(),
    id,
    blockType: "approval_level",
    name,
    approverType,
    fallbackType: "Block",
    notifyApproverOnAssignment: true,
    assignmentNotifyChannels: ["email", "slack"],
    embeddedConditional: buildApprovalDecisionEmbedded(id, name),
  };
}

const levelTemplateCache = new Map<string, ApprovalLevelConfig>();

/** Reuse configuration for the same named approval level across the ladder. */
export function reuseApprovalLevel(name: string): ApprovalLevelConfig {
  const approverType = APPROVAL_LEVEL_DEFAULTS[name] ?? "Manager";
  if (!levelTemplateCache.has(name)) {
    levelTemplateCache.set(name, branchApprovalLevel(name, approverType));
  }
  const template = levelTemplateCache.get(name)!;
  const id = uid("lvl");
  return {
    ...template,
    id,
    embeddedConditional: buildApprovalDecisionEmbedded(id, name),
  };
}

export function resetApprovalLevelCache(): void {
  levelTemplateCache.clear();
}

function patchEmbeddedBranches(
  data: EmbeddedConditionalData,
  levelPatches: Record<string, ApprovalLevelConfig[]>,
): EmbeddedConditionalData {
  const synced = syncEmbeddedConditionalV2Branches(data);
  return {
    ...synced,
    branches: synced.branches.map((branch) => ({
      ...branch,
      levels: levelPatches[branch.id] ?? branch.levels,
    })),
  };
}

function nestedRelationshipV2(
  title: string,
  attribute: string,
  trueLevelName: string,
  falseChild: ApprovalLevelConfig,
): ApprovalLevelConfig {
  const base: EmbeddedConditionalData = {
    name: title,
    conditionType: "boolean",
    selectedAttributes: [attribute],
    attributeCases: { [attribute]: ["true", "false"] },
    elseEnabled: false,
    branches: [],
  };
  const embedded = patchEmbeddedBranches(base, {
    [branchIdForAttrCase(attribute, "true")]: [reuseApprovalLevel(trueLevelName)],
    [branchIdForAttrCase(attribute, "false")]: [falseChild],
  });
  return {
    id: uid("lvl"),
    blockType: "conditional_branch_v2",
    name: title,
    approverType: "",
    fallbackType: "",
    fallbackEmail: "",
    slaEnabled: false,
    slaDuration: 48,
    slaDurationUnit: "hours",
    autoApproveOnTimeout: false,
    embeddedConditional: embedded,
  };
}

function buildManagerJobTitleStep(): ApprovalLevelConfig {
  const advId = uid("c");
  const base: EmbeddedConditionalData = {
    name: "Manager job title",
    conditionType: "boolean",
    selectedAttributes: [],
    attributeCases: {},
    elseEnabled: true,
    advancedConditions: [
      {
        id: advId,
        name: "Manager job title = DG",
        condition: {
          logic: "AND",
          conditions: [
            {
              id: uid("cond"),
              attribute: "manager_job_title",
              operator: "equals",
              value: "DG",
            },
          ],
        },
      },
    ],
    branches: [],
  };
  const embedded = patchEmbeddedBranches(base, {
    [advId]: [reuseApprovalLevel("Governance Group")],
    br_v2_else: [reuseApprovalLevel("Product Owner")],
  });
  return {
    id: uid("lvl"),
    blockType: "conditional_branch_v2",
    name: "Manager job title",
    approverType: "",
    fallbackType: "",
    fallbackEmail: "",
    slaEnabled: false,
    slaDuration: 48,
    slaDurationUnit: "hours",
    autoApproveOnTimeout: false,
    embeddedConditional: embedded,
  };
}

export const AMAN_TEST_POLICY_NAME = "aman test";

/** Build the nested conditional ladder for the "aman test" approval policy. */
export function buildAmanTestWorkflowNodes(): WorkflowNode[] {
  resetApprovalLevelCache();

  const step4 = buildManagerJobTitleStep();
  const step3 = nestedRelationshipV2(
    getApprovalV2AttributeLabel("isAnyOwnerLineManagerOfSubject"),
    "isAnyOwnerLineManagerOfSubject",
    "Approval Stage 2",
    step4,
  );
  const step2 = nestedRelationshipV2(
    getApprovalV2AttributeLabel("isAnyOwnerSameDeptAsSubject"),
    "isAnyOwnerSameDeptAsSubject",
    "Product Owner",
    step3,
  );

  const topBase: ConditionalBranchV2Data = {
    ...defaultConditionalBranchV2(),
    name: "Access routing ladder",
    selectedAttributes: ["isRequesterItemOwner"],
    attributeCases: { isRequesterItemOwner: ["true", "false"] },
    elseEnabled: false,
  };
  const syncedTop = syncConditionalV2Branches(topBase);
  const topBranches = syncedTop.branches.map((branch) => {
    if (branch.id === branchIdForAttrCase("isRequesterItemOwner", "true")) {
      return { ...branch, levels: [reuseApprovalLevel("Product Owner")] };
    }
    if (branch.id === branchIdForAttrCase("isRequesterItemOwner", "false")) {
      return { ...branch, levels: [step2] };
    }
    return branch;
  });

  const topNode: WorkflowNode = {
    id: uid("task"),
    kind: "task",
    data: {
      ...syncedTop,
      name: "Access routing ladder",
      branches: topBranches,
    },
    status: "incomplete",
  };
  topNode.status = computeStatus(topNode);

  return ensureApprovalPolicyEvent([topNode]).map((n) => ({
    ...n,
    status: computeStatus(n),
  }));
}

export function formatAmanTestPreviewLines(): string[] {
  return [
    "Start",
    "↓",
    `IF ${getApprovalV2AttributeLabel("isRequesterItemOwner")}`,
    "TRUE → Product Owner",
    "FALSE ↓",
    `IF ${getApprovalV2AttributeLabel("isAnyOwnerSameDeptAsSubject")}`,
    "TRUE → Product Owner",
    "FALSE ↓",
    `IF ${getApprovalV2AttributeLabel("isAnyOwnerLineManagerOfSubject")}`,
    "TRUE → Approval Stage 2",
    "FALSE ↓",
    "IF Manager job title = DG",
    "TRUE → Governance Group",
    "FALSE → Product Owner",
    "End",
  ];
}
