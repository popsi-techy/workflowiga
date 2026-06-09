import { buildApprovalDecisionEmbedded } from "../approval-decision";
import {
  defaultBranchNotificationConfig,
  defaultNestedConditionalV2Level,
} from "../branch-blocks";
import { insertIntoBranches, insertIntoEmbeddedBranches } from "../branch-level-patch";
import { computeStatus, defaultApprovalLevelConfig, uid } from "../defaults";
import { syncNestedMultisplitDecisions } from "../multisplit-decision";
import type {
  AnyTaskData,
  ApprovalLevelConfig,
  ApprovalLevelData,
  ApprovalSplitData,
  ConditionalBranchV2Data,
  NotificationData,
  SkipData,
  WorkflowNode,
} from "../types";
import type { AssistantInsertTarget } from "./insert-target";

function createBranchLevel(
  preset: Partial<ApprovalLevelConfig>,
  parentMultisplit: boolean,
): ApprovalLevelConfig {
  const lvl: ApprovalLevelConfig = {
    ...defaultApprovalLevelConfig(),
    ...preset,
  };
  if (
    !lvl.embeddedConditional &&
    !parentMultisplit &&
    (lvl.blockType === "approval_level" || lvl.blockType === "sod_check")
  ) {
    if (lvl.blockType === "approval_level") {
      lvl.embeddedConditional = buildApprovalDecisionEmbedded(lvl.id);
    }
  }
  return lvl;
}

export function workflowNodesToBranchPresets(
  nodes: WorkflowNode[],
): Partial<ApprovalLevelConfig>[] {
  const presets: Partial<ApprovalLevelConfig>[] = [];

  for (const node of nodes) {
    if (node.kind !== "task") continue;
    const data = node.data as AnyTaskData;

    switch (data.taskType) {
      case "skip": {
        const skip = data as SkipData;
        presets.push({ blockType: "skip", name: skip.name || "Skip approval" });
        break;
      }
      case "notification": {
        const n = data as NotificationData;
        presets.push(
          defaultBranchNotificationConfig({
            name: n.name || "Notification",
            notificationTrigger: n.trigger,
            notificationChannels: n.channels,
            notificationAudiences: n.audiences,
            notificationRecipients: n.recipients,
          }),
        );
        break;
      }
      case "approval_level": {
        const a = data as ApprovalLevelData;
        const id = uid("lvl");
        presets.push({
          id,
          blockType: "approval_level",
          name: a.name || "Approval level",
          approverType: a.approverType,
          fallbackType: a.fallbackType || "Block",
          notifyApproverOnAssignment: a.notifyApproverOnAssignment,
          assignmentNotifyChannels: a.assignmentNotifyChannels,
          embeddedConditional: buildApprovalDecisionEmbedded(id),
        });
        break;
      }
      case "conditional_branch_v2": {
        const v2 = data as ConditionalBranchV2Data;
        presets.push(
          defaultNestedConditionalV2Level({
            name: v2.name,
            conditionType: v2.conditionType,
            selectedAttributes: v2.selectedAttributes,
            attributeCases: v2.attributeCases,
            elseEnabled: v2.elseEnabled,
            branches: v2.branches,
            advancedConditions: v2.advancedConditions,
            globalFallbackType: v2.globalFallbackType,
          }),
        );
        break;
      }
      default:
        break;
    }
  }

  return presets;
}

export function insertAssistantNodesAtTarget(
  nodes: WorkflowNode[],
  target: AssistantInsertTarget,
  newNodes: WorkflowNode[],
  editorContext: "approval" | "workflow",
): {
  nodes: WorkflowNode[];
  selectedId: string | null;
  nextTarget: AssistantInsertTarget;
} {
  if (!newNodes.length) {
    return {
      nodes,
      selectedId: null,
      nextTarget: target,
    };
  }

  if (target.kind === "root") {
    const prepared = newNodes.map((n) => ({
      ...n,
      status: computeStatus(n),
    }));
    const nextNodes = [...nodes];
    nextNodes.splice(target.index, 0, ...prepared);
    return {
      nodes: nextNodes,
      selectedId: prepared[0]?.id ?? null,
      nextTarget: {
        kind: "root",
        index: target.index + prepared.length,
      },
    };
  }

  const presets = workflowNodesToBranchPresets(newNodes);
  if (!presets.length) {
    return { nodes, selectedId: null, nextTarget: target };
  }

  let selectedId: string | null = null;
  let insertIndex = target.index;

  const updated = nodes.map((n) => {
    if (n.id !== target.parentNodeId) return n;
    const splitData = n.data as ApprovalSplitData;
    let branches = splitData.branches;
    let workingIndex = insertIndex;

    for (const preset of presets) {
      const createLevel = () => createBranchLevel(preset, false);
      const res = target.embeddedHostLevelId
        ? insertIntoEmbeddedBranches(
            branches,
            target.embeddedHostLevelId,
            target.branchId,
            workingIndex,
            preset,
            createLevel,
          )
        : insertIntoBranches(
            branches,
            target.branchId,
            workingIndex,
            preset,
            createLevel,
          );
      if (!res.inserted) continue;
      branches =
        editorContext === "approval"
          ? syncNestedMultisplitDecisions(res.branches)
          : res.branches;
      const insertedLevel = findInsertedLevel(
        branches,
        target.branchId,
        workingIndex,
        target.embeddedHostLevelId,
      );
      if (insertedLevel && !selectedId) selectedId = insertedLevel.id;
      workingIndex += 1;
    }

    insertIndex = workingIndex;
    const merged: WorkflowNode = {
      ...n,
      data: { ...splitData, branches },
    };
    merged.status = computeStatus(merged);
    return merged;
  });

  return {
    nodes: updated,
    selectedId,
    nextTarget: {
      ...target,
      index: insertIndex,
    },
  };
}

function findInsertedLevel(
  branches: ApprovalSplitData["branches"],
  branchId: string,
  index: number,
  embeddedHostLevelId?: string,
): ApprovalLevelConfig | undefined {
  if (embeddedHostLevelId) {
    for (const b of branches) {
      for (const level of b.levels) {
        if (level.id !== embeddedHostLevelId || !level.embeddedConditional) continue;
        const nested = level.embeddedConditional.branches.find(
          (nb) => nb.id === branchId,
        );
        return nested?.levels[index];
      }
    }
    return undefined;
  }
  const branch = branches.find((b) => b.id === branchId);
  return branch?.levels[index];
}
