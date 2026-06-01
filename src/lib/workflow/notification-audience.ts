import type {
  AnyTaskData,
  ApprovalLevelConfig,
  ApprovalSplitData,
  ConditionalBranchData,
  NotificationAudience,
  NotificationData,
  WorkflowNode,
} from "./types";

export const NOTIFICATION_AUDIENCE_OPTIONS: NotificationAudience[] = [
  "Requester",
  "Manager",
  "Owner",
  "Specific users",
];

/** Normalize legacy single `audience` / `notificationAudience` into an array. */
export function normalizeNotificationAudiences(
  value?: NotificationAudience[] | NotificationAudience,
): NotificationAudience[] {
  if (Array.isArray(value)) return value;
  if (value) return [value];
  return ["Requester"];
}

export function formatNotificationAudiences(
  audiences: NotificationAudience[],
): string {
  return audiences.length > 0 ? audiences.join(", ") : "No audience";
}

export function notificationAudiencesConfigured(
  audiences: NotificationAudience[],
  recipients: string[],
): boolean {
  if (audiences.length === 0) return false;
  if (audiences.includes("Specific users") && recipients.length === 0) {
    return false;
  }
  return true;
}

export function migrateLevelNotificationAudiences(
  level: ApprovalLevelConfig,
): ApprovalLevelConfig {
  if (level.blockType !== "notification") return level;
  const audiences = normalizeNotificationAudiences(
    level.notificationAudiences ?? level.notificationAudience,
  );
  const { notificationAudience: _legacy, ...rest } = level;
  return { ...rest, notificationAudiences: audiences };
}

export function migrateWorkflowNotificationAudiences(
  nodes: WorkflowNode[],
): WorkflowNode[] {
  return nodes.map((n) => {
    if (n.kind !== "task") return n;
    const d = n.data as AnyTaskData;
    if (d.taskType === "notification") {
      const nd = d as NotificationData;
      const audiences = normalizeNotificationAudiences(
        nd.audiences ?? nd.audience,
      );
      const { audience: _legacy, ...rest } = nd;
      return { ...n, data: { ...rest, audiences } };
    }
    if (
      d.taskType === "approval_split" ||
      d.taskType === "conditional_branch"
    ) {
      const bd = d as ApprovalSplitData | ConditionalBranchData;
      return {
        ...n,
        data: {
          ...bd,
          branches: bd.branches.map((br) => ({
            ...br,
            levels: br.levels.map(migrateLevelNotificationAudiences),
          })),
        },
      };
    }
    return n;
  });
}
