import type {
  ApprovalLevelConfig,
  ApprovalLevelData,
  ApprovalSplitData,
  ApprovalPolicyData,
  AnyTaskData,
  EventData,
  FilterData,
  NodeKind,
  WorkflowNode,
} from "./types";
import {
  normalizeNotificationAudiences,
  notificationAudiencesConfigured,
} from "./notification-audience";
import { SOD_VIOLATION_MESSAGE, defaultBranchExitConfig, isBranchFilterConfigured } from "./branch-blocks";

let counter = 0;
export function uid(prefix = "n"): string {
  counter += 1;
  return `${prefix}_${Date.now().toString(36)}_${counter}`;
}

/** Default config for one approver row (used inside both single and parallel) */
export function defaultApprovalLevelConfig(): ApprovalLevelConfig {
  return {
    id: uid("lvl"),
    blockType: "approval_level",
    approverType: "",
    fallbackType: "",
    fallbackEmail: "",
    slaEnabled: false,
    slaDuration: 48,
    slaDurationUnit: "hours",
    autoApproveOnTimeout: false,
    slaTimeoutAction: "Auto Reject",
    overrideFallback: false,
    overrideSla: false,
    approverRefs: [],
    approverRule: { logic: "AND", conditions: [] },
    fallbackUsers: [],
    skipEnabled: false,
    skip: { logic: "AND", conditions: [] },
    completionMode: "all",
    threshold: 1,
  };
}

export function defaultData(
  kind: NodeKind,
): EventData | FilterData | AnyTaskData | ApprovalPolicyData {
  switch (kind) {
    case "event":
      return { type: "joiner", description: "" };
    case "filter":
      return { logic: "AND", conditions: [] };
    case "task":
      return {
        name: "Assign Entities",
        appIds: [],
        entitlementIds: [],
        techRoleIds: [],
        businessRoleIds: [],
        criteria: { logic: "AND", conditions: [] },
      };
  }
}

export function defaultApprovalLevel(): ApprovalLevelData {
  return {
    taskType: "approval_level",
    name: "Approval Level",
    approverType: "",
    fallbackType: "",
    fallbackEmail: "",
    slaEnabled: false,
    slaDuration: 48,
    slaDurationUnit: "hours",
    autoApproveOnTimeout: false,
    slaTimeoutAction: "Auto Reject",
    approverRefs: [],
    approverRule: { logic: "AND", conditions: [] },
    fallbackUsers: [],
    skipEnabled: false,
    skip: { logic: "AND", conditions: [] },
    completionMode: "all",
    threshold: 1,
  };
}

export function defaultApprovalSplit(): ApprovalSplitData {
  return {
    taskType: "approval_split",
    name: "Multisplit Branch",
    branchCount: 2,
    completionMode: "all",
    threshold: 1,
    branches: [
      { id: uid("br"), name: "Branch 1", levels: [] },
      { id: uid("br"), name: "Branch 2", levels: [] },
    ],
    globalFallbackType: "",
    globalFallbackEmail: "",
    globalFallbackUsers: [],
  };
}

export function defaultConditionalBranch(): import("./types").ConditionalBranchData {
  return {
    taskType: "conditional_branch",
    name: "Conditional Branch",
    conditionCount: 1,
    branchCount: 2,
    branches: [
      {
        id: uid("br"),
        name: "If",
        levels: [],
        condition: { logic: "AND", conditions: [] },
      },
      {
        id: uid("br"),
        name: "No condition matched",
        levels: [defaultBranchExitConfig({ name: "Exit" })],
        condition: { logic: "AND", conditions: [] },
      },
    ],
    globalFallbackType: "",
    globalFallbackEmail: "",
    globalFallbackUsers: [],
  };
}

export function defaultApprovalPolicyRef(): import("./types").ApprovalPolicyRefData {
  return {
    taskType: "approval_policy_ref",
    name: "Approval Policy",
    policyId: undefined,
  };
}

/** A branch entry that provisions entities (used inside workflow-policy branches). */
export function defaultBranchAssignEntities(): ApprovalLevelConfig {
  return {
    ...defaultApprovalLevelConfig(),
    blockType: "assign_entities",
    name: "Assign Entities",
    appIds: [],
    entitlementIds: [],
    techRoleIds: [],
    businessRoleIds: [],
    criteria: { logic: "AND", conditions: [] },
  };
}

export function defaultExit(): import("./types").ExitData {
  return {
    taskType: "exit",
    name: "Exit",
    outcome: "End",
  };
}

export function defaultSkip(): import("./types").SkipData {
  return {
    taskType: "skip",
    name: "Skip",
  };
}

const DEFAULT_NOTIFICATION_MESSAGE = `{{requester.name}}'s request for {{entitlement.name}} on {{application.name}} is {{status}}.

> Requester: {{requester.name}}
> Application: {{application.name}}
> Entitlement: {{entitlement.name}}
> Policy: {{policy.name}}
> Status: {{status}}`;

export function defaultSodCheck(): import("./types").SodCheckData {
  return {
    taskType: "sod_check",
    name: "SoD Check",
    violationAction: "continue",
    violationChannels: ["email", "slack"],
    violationAudiences: ["Requester", "Manager"],
    violationRecipients: [],
    slackMessage: SOD_VIOLATION_MESSAGE,
    emailMessage: SOD_VIOLATION_MESSAGE,
  };
}

export function defaultNotification(): import("./types").NotificationData {
  return {
    taskType: "notification",
    name: "Notification",
    trigger: "completed",
    channels: ["email"],
    audiences: ["Requester"],
    recipients: [],
    slackMessage: DEFAULT_NOTIFICATION_MESSAGE,
    emailMessage: DEFAULT_NOTIFICATION_MESSAGE,
  };
}

export function computeStatus(node: WorkflowNode): WorkflowNode["status"] {
  if (node.kind === "event") {
    const d = node.data as EventData | ApprovalPolicyData;
    return d.type ? "configured" : "incomplete";
  }
  if (node.kind === "filter") {
    const d = node.data as FilterData;
    const valid = d.conditions.some(
      (c) => c.attribute && c.operator && (Array.isArray(c.value) ? c.value.length : c.value),
    );
    return valid ? "configured" : "incomplete";
  }
  // task — inspect taskType
  const d = node.data as AnyTaskData;
  if (d.taskType === "exit" || d.taskType === "skip") {
    // Terminal-style block — always considered configured.
    return "configured";
  }
  if (d.taskType === "notification") {
    const nd = d as import("./types").NotificationData;
    const audiences = normalizeNotificationAudiences(
      nd.audiences ?? nd.audience,
    );
    return nd.channels.length > 0 &&
      notificationAudiencesConfigured(audiences, nd.recipients ?? [])
      ? "configured"
      : "incomplete";
  }
  if (d.taskType === "approval_policy_ref") {
    const rd = d as import("./types").ApprovalPolicyRefData;
    return rd.policyId ? "configured" : "incomplete";
  }
  if (d.taskType === "sod_check") {
    const sd = d as import("./types").SodCheckData;
    if (sd.violationAction === "exit" || sd.violationAction === "continue") {
      return "configured";
    }
    const audiences = normalizeNotificationAudiences(sd.violationAudiences);
    return sd.violationChannels.length > 0 &&
      notificationAudiencesConfigured(audiences, sd.violationRecipients ?? [])
      ? "configured"
      : "incomplete";
  }
  if (d.taskType === "approval_level") {
    const ld = d as ApprovalLevelData;
    return ld.approverType !== "" && ld.fallbackType !== "" ? "configured" : "incomplete";
  }
  if (d.taskType === "approval_split") {
    const sd = d as ApprovalSplitData;
    const splitAttrs =
      sd.branchAttributes?.length
        ? sd.branchAttributes
        : sd.branchAttribute
          ? [sd.branchAttribute]
          : [];
    if (
      splitAttrs.length > 0 &&
      !sd.branches.every((br) => {
        const values =
          br.attributeValues ??
          (br.attributeValue && splitAttrs.length === 1
            ? { [splitAttrs[0]]: br.attributeValue }
            : {});
        return splitAttrs.every((id) => Boolean(values[id]));
      })
    ) {
      return "incomplete";
    }
    const totalLevels = sd.branches.reduce((acc, br) => acc + br.levels.length, 0);
    if (totalLevels === 0) return "incomplete";
    const allConfigured = sd.branches.every((br) =>
      br.levels.every((l) => {
        if (l.blockType === "exit" || l.blockType === "skip") return true;
        if (l.blockType === "filter") return isBranchFilterConfigured(l);
        if (l.blockType === "approval_policy_ref") return !!l.policyId;
        if (l.blockType === "notification") {
          return (l.notificationChannels?.length ?? 0) > 0;
        }
        if (l.blockType === "assign_entities") {
          return (
            (l.appIds?.length ?? 0) +
              (l.entitlementIds?.length ?? 0) +
              (l.techRoleIds?.length ?? 0) +
              (l.businessRoleIds?.length ?? 0) >
            0
          );
        }
        const effectiveFallback = l.overrideFallback ? l.fallbackType : sd.globalFallbackType;
        return l.approverType !== "" && effectiveFallback !== "";
      })
    );
    return allConfigured ? "configured" : "incomplete";
  }
  if (d.taskType === "conditional_branch") {
    const cd = d as import("./types").ConditionalBranchData;
    const hasElse = cd.elseEnabled !== false;
    const conditionCount =
      cd.conditionCount ??
      (hasElse ? Math.max(0, cd.branches.length - 1) : cd.branches.length);
    if (conditionCount < 1) return "incomplete";

    const conditionBranches = hasElse
      ? cd.branches.slice(0, -1)
      : cd.branches;
    const hasCondition = conditionBranches.some((br) =>
      (br.condition?.conditions ?? []).some(
        (c) => c.attribute && (Array.isArray(c.value) ? c.value.length : c.value),
      ),
    );
    if (!hasCondition) return "incomplete";
    const levelConfigured = (l: ApprovalLevelConfig): boolean => {
      if (l.blockType === "exit" || l.blockType === "skip") return true;
      if (l.blockType === "filter") return isBranchFilterConfigured(l);
      if (l.blockType === "approval_policy_ref") return !!l.policyId;
      if (l.blockType === "notification") {
        const audiences = normalizeNotificationAudiences(
          l.notificationAudiences ?? l.notificationAudience,
        );
        return (
          (l.notificationChannels?.length ?? 0) > 0 &&
          notificationAudiencesConfigured(
            audiences,
            l.notificationRecipients ?? [],
          )
        );
      }
      if (l.blockType === "conditional_branch" && l.embeddedConditional) {
        const emb = l.embeddedConditional;
        const embHasElse = emb.elseEnabled !== false;
        const embConditionBranches = embHasElse
          ? emb.branches.slice(0, -1)
          : emb.branches;
        const embHasCondition = embConditionBranches.some((br) =>
          (br.condition?.conditions ?? []).some(
            (c) =>
              c.attribute &&
              (Array.isArray(c.value) ? c.value.length : c.value),
          ),
        );
        const embLevels = emb.branches.reduce(
          (acc, br) => acc + br.levels.length,
          0,
        );
        if (!embHasCondition || embLevels === 0) return false;
        return emb.branches.every((br) =>
          br.levels.every((inner) => levelConfigured(inner)),
        );
      }
      if (l.blockType === "assign_entities") {
        return (
          (l.appIds?.length ?? 0) +
            (l.entitlementIds?.length ?? 0) +
            (l.techRoleIds?.length ?? 0) +
            (l.businessRoleIds?.length ?? 0) >
          0
        );
      }
      const effectiveFallback = l.overrideFallback
        ? l.fallbackType
        : cd.globalFallbackType;
      return l.approverType !== "" && effectiveFallback !== "";
    };
    const allConfigured = cd.branches.every((br) =>
      br.levels.every((l) => levelConfigured(l)),
    );
    return allConfigured ? "configured" : "incomplete";
  }
  // legacy assign_entities
  const td = d as import("./types").TaskData;
  const hasAny =
    (td.appIds?.length ?? 0) > 0 ||
    (td.entitlementIds?.length ?? 0) > 0 ||
    (td.techRoleIds?.length ?? 0) > 0 ||
    (td.businessRoleIds?.length ?? 0) > 0;
  return hasAny ? "configured" : "incomplete";
}
