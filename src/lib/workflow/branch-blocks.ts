import { uid } from "./defaults";
import { buildConditionalBranches } from "./conditional-branch";
import {
  formatNotificationAudiences,
  normalizeNotificationAudiences,
  notificationAudiencesConfigured,
} from "./notification-audience";
import type {
  ApprovalLevelConfig,
  EmbeddedConditionalData,
  ExitOutcome,
  FilterData,
  NotificationAudience,
  NotificationChannel,
  NotificationTrigger,
  Operator,
  SkipRule,
} from "./types";

export const GRANTED_NOTIFICATION_MESSAGE = `Good news — your access request for {{entitlement.name}} on {{application.name}} was approved.

> Requester: {{requester.name}}
> Application: {{application.name}}
> Entitlement: {{entitlement.name}}
> Policy: {{policy.name}}
> Status: Approved`;

export const REJECTED_NOTIFICATION_MESSAGE = `Your access request for {{entitlement.name}} on {{application.name}} was not approved.

> Requester: {{requester.name}}
> Application: {{application.name}}
> Entitlement: {{entitlement.name}}
> Policy: {{policy.name}}
> Status: Rejected`;

export const SOD_VIOLATION_MESSAGE = `A Segregation of Duties violation was detected for this request.

> Requester: {{requester.name}}
> Application: {{application.name}}
> Entitlement: {{entitlement.name}}
> Policy: {{policy.name}}
> Action: Review required before continuing`;

export const MANAGER_ASSIGNMENT_MESSAGE = `You have a new access request waiting for your approval.

> Requester: {{requester.name}}
> Application: {{application.name}}
> Entitlement: {{entitlement.name}}
> Policy: {{policy.name}}
> Action: Review and approve or reject`;

export function routingEqualsCondition(
  attribute: string,
  value: string,
): SkipRule {
  return {
    logic: "AND",
    conditions: [
      {
        id: uid("c"),
        attribute,
        operator: "equals" as Operator,
        value,
      },
    ],
  };
}

export function defaultBranchExitConfig(
  overrides?: Partial<ApprovalLevelConfig>,
): ApprovalLevelConfig {
  return {
    id: uid("lvl"),
    blockType: "exit",
    name: "End",
    exitOutcome: "End" as ExitOutcome,
    approverType: "",
    fallbackType: "",
    fallbackEmail: "",
    slaEnabled: false,
    slaDuration: 48,
    slaDurationUnit: "hours",
    autoApproveOnTimeout: false,
    ...overrides,
  };
}

/** Conditional branch nested inside a parent branch column (same UI as top-level). */
export function defaultNestedConditionalLevel(
  overrides: Partial<EmbeddedConditionalData> & { name: string },
): ApprovalLevelConfig {
  return {
    id: uid("lvl"),
    blockType: "conditional_branch",
    name: overrides.name,
    approverType: "",
    fallbackType: "",
    fallbackEmail: "",
    slaEnabled: false,
    slaDuration: 48,
    slaDurationUnit: "hours",
    autoApproveOnTimeout: false,
    embeddedConditional: defaultEmbeddedConditional(overrides),
  };
}

export function defaultEmbeddedConditional(
  overrides: Partial<EmbeddedConditionalData> & { name: string },
): EmbeddedConditionalData {
  const { name, branches, conditionCount, branchCount, ...rest } = overrides;
  const resolvedBranches =
    branches ??
    buildConditionalBranches(
      typeof conditionCount === "number" && conditionCount >= 1
        ? conditionCount
        : 1,
    );
  const resolvedConditionCount =
    conditionCount ??
    (resolvedBranches.length > 1 ? resolvedBranches.length - 1 : 0);
  return {
    name,
    routingAttributes: rest.routingAttributes ?? [],
    globalFallbackType: rest.globalFallbackType ?? "Block",
    conditionCount: resolvedConditionCount,
    branchCount: resolvedConditionCount + 1,
    branches: resolvedBranches,
    ...rest,
  };
}

/** Parallel multisplit nested inside a parent branch column. */
export function defaultEmbeddedMultisplit(
  overrides: Partial<EmbeddedConditionalData> & { name: string },
): EmbeddedConditionalData {
  const { name, branches, ...rest } = overrides;
  const resolvedBranches =
    branches ??
    [1, 2].map((n) => ({
      id: uid("br"),
      name: `Branch ${n}`,
      levels: [],
    }));
  return {
    name,
    splitKind: "multisplit",
    routingAttributes: rest.routingAttributes ?? [],
    globalFallbackType: rest.globalFallbackType ?? "",
    completionMode: rest.completionMode ?? "all",
    threshold: rest.threshold ?? 1,
    branchAttributes: rest.branchAttributes ?? [],
    conditionCount: resolvedBranches.length,
    branchCount: resolvedBranches.length,
    branches: resolvedBranches,
    ...rest,
  };
}

export function defaultNestedMultisplitLevel(
  overrides: Partial<EmbeddedConditionalData> & { name: string },
): ApprovalLevelConfig {
  return {
    id: uid("lvl"),
    blockType: "approval_split",
    name: overrides.name,
    approverType: "",
    fallbackType: "",
    fallbackEmail: "",
    slaEnabled: false,
    slaDuration: 48,
    slaDurationUnit: "hours",
    autoApproveOnTimeout: false,
    embeddedConditional: defaultEmbeddedMultisplit(overrides),
  };
}

export function defaultBranchNotificationConfig(
  overrides?: Partial<ApprovalLevelConfig>,
): ApprovalLevelConfig {
  return {
    id: uid("lvl"),
    blockType: "notification",
    name: "Notification",
    approverType: "",
    fallbackType: "",
    fallbackEmail: "",
    slaEnabled: false,
    slaDuration: 48,
    slaDurationUnit: "hours",
    autoApproveOnTimeout: false,
    notificationTrigger: "completed",
    notificationChannels: ["slack", "email"],
    notificationAudiences: ["Requester"],
    notificationRecipients: [],
    slackMessage: GRANTED_NOTIFICATION_MESSAGE,
    emailMessage: GRANTED_NOTIFICATION_MESSAGE,
    ...overrides,
  };
}

/** User filter nested inside a workflow multisplit branch column. */
export function defaultBranchFilterConfig(
  overrides?: Partial<ApprovalLevelConfig>,
): ApprovalLevelConfig {
  return {
    id: uid("lvl"),
    blockType: "filter",
    name: "User Filter",
    approverType: "",
    fallbackType: "",
    fallbackEmail: "",
    slaEnabled: false,
    slaDuration: 48,
    slaDurationUnit: "hours",
    autoApproveOnTimeout: false,
    criteria: { logic: "AND", conditions: [] },
    ...overrides,
  };
}

/** Approval-policy module nested inside a workflow multisplit branch column. */
export function defaultBranchModuleConfig(
  overrides?: Partial<ApprovalLevelConfig>,
): ApprovalLevelConfig {
  return {
    id: uid("lvl"),
    blockType: "approval_policy_ref",
    name: "Approval Policy",
    approverType: "",
    fallbackType: "",
    fallbackEmail: "",
    slaEnabled: false,
    slaDuration: 48,
    slaDurationUnit: "hours",
    autoApproveOnTimeout: false,
    policyId: undefined,
    ...overrides,
  };
}

export function isBranchFilterLevel(level: ApprovalLevelConfig): boolean {
  return level.blockType === "filter";
}

export function isBranchFilterConfigured(level: ApprovalLevelConfig): boolean {
  return (level.criteria?.conditions ?? []).some(
    (c) => c.attribute && c.value,
  );
}

export function isBranchModuleLevel(level: ApprovalLevelConfig): boolean {
  return level.blockType === "approval_policy_ref";
}

export function levelToFilterNode(level: ApprovalLevelConfig): {
  id: string;
  kind: "filter";
  status: "configured" | "incomplete";
  data: FilterData;
} {
  const data: FilterData = level.criteria ?? { logic: "AND", conditions: [] };
  return {
    id: level.id,
    kind: "filter",
    status: isBranchFilterConfigured(level) ? "configured" : "incomplete",
    data,
  };
}

export function filterPatchToLevel(
  fields: Partial<FilterData>,
): Partial<ApprovalLevelConfig> {
  return {
    blockType: "filter",
    criteria: {
      logic: fields.logic ?? "AND",
      conditions: fields.conditions ?? [],
    },
  };
}

export function levelToModuleNode(level: ApprovalLevelConfig): {
  id: string;
  kind: "task";
  status: "configured" | "incomplete";
  data: {
    taskType: "approval_policy_ref";
    name: string;
    policyId?: string;
  };
} {
  return {
    id: level.id,
    kind: "task",
    status: level.policyId ? "configured" : "incomplete",
    data: {
      taskType: "approval_policy_ref",
      name: level.name ?? "Approval Policy",
      policyId: level.policyId,
    },
  };
}

export function modulePatchToLevel(
  fields: Partial<{ name: string; policyId?: string }>,
): Partial<ApprovalLevelConfig> {
  return {
    blockType: "approval_policy_ref",
    ...(fields.name !== undefined ? { name: fields.name } : {}),
    ...(fields.policyId !== undefined ? { policyId: fields.policyId } : {}),
  };
}

export function isBranchNotificationLevel(
  level: ApprovalLevelConfig,
): boolean {
  return level.blockType === "notification";
}

export function isBranchNotificationConfigured(
  level: ApprovalLevelConfig,
): boolean {
  const audiences = normalizeNotificationAudiences(
    level.notificationAudiences ?? level.notificationAudience,
  );
  return (
    (level.notificationChannels?.length ?? 0) > 0 &&
    notificationAudiencesConfigured(
      audiences,
      level.notificationRecipients ?? [],
    )
  );
}

export function branchNotificationSummary(
  level: ApprovalLevelConfig,
): string {
  const channels = (level.notificationChannels ?? [])
    .map((c) => (c === "slack" ? "Slack" : "Email"))
    .join(" + ");
  const audiences = normalizeNotificationAudiences(
    level.notificationAudiences ?? level.notificationAudience,
  );
  const trigger = level.notificationTrigger ?? "completed";
  const triggerLabel =
    trigger === "started"
      ? "On start"
      : trigger === "failed"
        ? "On failure"
        : "On complete";
  return [
    channels || "No channel",
    formatNotificationAudiences(audiences),
    triggerLabel,
  ]
    .filter(Boolean)
    .join(" · ");
}

export function levelToNotificationNode(level: ApprovalLevelConfig): {
  id: string;
  kind: "task";
  status: "configured" | "incomplete";
  data: {
    taskType: "notification";
    name: string;
    trigger: NotificationTrigger;
    channels: NotificationChannel[];
    audiences: NotificationAudience[];
    recipients: string[];
    slackMessage?: string;
    emailMessage?: string;
  };
} {
  const audiences = normalizeNotificationAudiences(
    level.notificationAudiences ?? level.notificationAudience,
  );
  return {
    id: level.id,
    kind: "task",
    status: isBranchNotificationConfigured(level) ? "configured" : "incomplete",
    data: {
      taskType: "notification",
      name: level.name ?? "Notification",
      trigger: level.notificationTrigger ?? "completed",
      channels: level.notificationChannels ?? [],
      audiences,
      recipients: level.notificationRecipients ?? [],
      slackMessage: level.slackMessage,
      emailMessage: level.emailMessage,
    },
  };
}

export function notificationPatchToLevel(
  fields: Partial<{
    name: string;
    trigger: NotificationTrigger;
    channels: NotificationChannel[];
    audiences: NotificationAudience[];
    recipients: string[];
    slackMessage?: string;
    emailMessage?: string;
  }>,
): Partial<ApprovalLevelConfig> {
  return {
    blockType: "notification",
    ...(fields.name !== undefined ? { name: fields.name } : {}),
    ...(fields.trigger !== undefined
      ? { notificationTrigger: fields.trigger }
      : {}),
    ...(fields.channels !== undefined
      ? { notificationChannels: fields.channels }
      : {}),
    ...(fields.audiences !== undefined
      ? { notificationAudiences: fields.audiences }
      : {}),
    ...(fields.recipients !== undefined
      ? { notificationRecipients: fields.recipients }
      : {}),
    ...(fields.slackMessage !== undefined
      ? { slackMessage: fields.slackMessage }
      : {}),
    ...(fields.emailMessage !== undefined
      ? { emailMessage: fields.emailMessage }
      : {}),
  };
}
