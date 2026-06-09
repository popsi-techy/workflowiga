"use client";

import { useMemo, type ReactNode } from "react";
import { ChevronsRight, CheckCircle2, AlertCircle } from "lucide-react";
import { cn } from "@/lib/cn";
import { useWorkflowStore } from "@/lib/workflow/store";
import { NODE_META } from "@/lib/workflow/icons";
import {
  paletteCategoryForNode,
  paletteIconTileClass,
} from "@/lib/workflow/palette-tones";
import type {
  AnyTaskData,
  ApprovalPolicyData,
  ApprovalSplitData,
  ConditionalBranchData,
  EventData,
  EventType,
  TaskType,
  WorkflowNode,
} from "@/lib/workflow/types";
import { EditableName } from "./config/EditableName";
import { APPROVAL_POLICY_EVENT_NAME } from "@/lib/workflow/approval-policy";
import { ConfigInfoTip } from "./config/config-layout";
import { EventConfig } from "./config/EventConfig";
import { FilterConfig } from "./config/FilterConfig";
import { AssignEntitiesConfig } from "./config/AssignEntitiesConfig";
import { ApprovalPolicyConfig } from "./config/ApprovalPolicyConfig";
import { ApprovalLevelConfig } from "./config/ApprovalLevelConfig";
import { ApprovalSplitConfig } from "./config/ApprovalSplitConfig";
import { ConditionalBranchConfig } from "./config/ConditionalBranchConfig";
import { ConditionalBranchV2Config } from "./config/ConditionalBranchV2Config";
import { ApprovalDecisionConfig } from "./config/ApprovalDecisionConfig";
import { DecisionOutcomesSection } from "./config/ApprovalOutcomes";
import { ConfigBody } from "./config/config-layout";
import { EmbeddedConditionalConfig } from "./config/EmbeddedConditionalConfig";
import { ApprovalPolicyRefConfig } from "./config/ApprovalPolicyRefConfig";
import { ExitConfig } from "./config/ExitConfig";
import { SkipConfig } from "./config/SkipConfig";
import { NotificationConfig } from "./config/NotificationConfig";
import { SodCheckConfig } from "./config/SodCheckConfig";
import {
  isBranchNotificationLevel,
  isBranchFilterLevel,
  isBranchModuleLevel,
  levelToFilterNode,
  levelToModuleNode,
  levelToNotificationNode,
  notificationPatchToLevel,
  filterPatchToLevel,
  modulePatchToLevel,
} from "@/lib/workflow/branch-blocks";
import { findBranchLevelContext } from "@/lib/workflow/branch-level-patch";
import { isNestedFlowLevel } from "@/lib/workflow/branch-decision";
import { EmbeddedMultisplitConfig } from "./config/EmbeddedMultisplitConfig";

export function ConfigPanel() {
  const open = useWorkflowStore((s) => s.rightPanelOpen);
  const selectedId = useWorkflowStore((s) => s.selectedId);
  const nodes = useWorkflowStore((s) => s.nodes);
  const setRightPanelOpen = useWorkflowStore((s) => s.setRightPanelOpen);
  const updateNode = useWorkflowStore((s) => s.updateNode);

  function resolveBranchLevel(level: import("@/lib/workflow/types").ApprovalLevelConfig): {
    node: WorkflowNode;
    embeddedBranchNotification: boolean;
    embeddedBranchAssign: boolean;
    embeddedBranchFilter: boolean;
    embeddedBranchModule: boolean;
  } | null {
    if (level.blockType === "exit") {
      return {
        node: {
          id: level.id,
          kind: "task",
          status: "configured",
          data: {
            taskType: "exit",
            name: "Exit",
            outcome: level.exitOutcome ?? "End",
          },
        } as unknown as WorkflowNode,
        embeddedBranchNotification: false,
        embeddedBranchAssign: false,
        embeddedBranchFilter: false,
        embeddedBranchModule: false,
      };
    }
    if (level.blockType === "skip") {
      return {
        node: {
          id: level.id,
          kind: "task",
          status: "configured",
          data: { taskType: "skip", name: "Skip" },
        } as unknown as WorkflowNode,
        embeddedBranchNotification: false,
        embeddedBranchAssign: false,
        embeddedBranchFilter: false,
        embeddedBranchModule: false,
      };
    }
    if (isBranchFilterLevel(level)) {
      return {
        node: levelToFilterNode(level),
        embeddedBranchNotification: false,
        embeddedBranchAssign: false,
        embeddedBranchFilter: true,
        embeddedBranchModule: false,
      };
    }
    if (isBranchModuleLevel(level)) {
      return {
        node: levelToModuleNode(level),
        embeddedBranchNotification: false,
        embeddedBranchAssign: false,
        embeddedBranchFilter: false,
        embeddedBranchModule: true,
      };
    }
    if (isBranchNotificationLevel(level)) {
      return {
        node: levelToNotificationNode(level),
        embeddedBranchNotification: true,
        embeddedBranchAssign: false,
        embeddedBranchFilter: false,
        embeddedBranchModule: false,
      };
    }
    if (level.blockType === "sod_check") {
      return {
        node: {
          id: level.id,
          kind: "task",
          status: "configured",
          data: {
            taskType: "sod_check",
            name: level.name ?? "SoD Check",
            violationAction: "exit",
            violationChannels: [],
            violationAudiences: [],
            violationRecipients: [],
            // Carry the inline decision so SodCheckConfig can edit outcomes.
            embeddedConditional: level.embeddedConditional,
          },
        } as unknown as WorkflowNode,
        embeddedBranchNotification: false,
        embeddedBranchAssign: false,
        embeddedBranchFilter: false,
        embeddedBranchModule: false,
      };
    }
    if (level.blockType === "assign_entities") {
      const assignCount =
        (level.appIds?.length ?? 0) +
        (level.entitlementIds?.length ?? 0) +
        (level.techRoleIds?.length ?? 0) +
        (level.businessRoleIds?.length ?? 0);
      return {
        node: {
          id: level.id,
          kind: "task",
          status: assignCount > 0 ? "configured" : "incomplete",
          data: {
            taskType: "assign_entities",
            name: level.name ?? "Assign Entities",
            appIds: level.appIds ?? [],
            entitlementIds: level.entitlementIds ?? [],
            techRoleIds: level.techRoleIds ?? [],
            businessRoleIds: level.businessRoleIds ?? [],
            criteria: { logic: "AND", conditions: [] },
          },
        } as unknown as WorkflowNode,
        embeddedBranchNotification: false,
        embeddedBranchAssign: true,
        embeddedBranchFilter: false,
        embeddedBranchModule: false,
      };
    }
    return {
      node: {
        id: level.id,
        kind: "task",
        status:
          level.approverType !== "" && level.fallbackType !== ""
            ? "configured"
            : "incomplete",
        data: {
          taskType: "approval_level",
          name: "Approval Level",
          ...level,
        },
      } as WorkflowNode,
      embeddedBranchNotification: false,
      embeddedBranchAssign: false,
      embeddedBranchFilter: false,
      embeddedBranchModule: false,
    };
  }

  const { node, embeddedBranchNotification, embeddedBranchAssign, embeddedBranchFilter, embeddedBranchModule, embeddedConditional, embeddedDecision } = useMemo(() => {
      const empty = {
        node: undefined as WorkflowNode | undefined,
        embeddedBranchNotification: false,
        embeddedBranchAssign: false,
        embeddedBranchFilter: false,
        embeddedBranchModule: false,
        embeddedConditional: null as null | {
          hostLevelId: string;
          data: import("@/lib/workflow/types").EmbeddedConditionalData;
        },
        embeddedDecision: null as null | { hostLevelId: string },
      };

      const topNode = nodes.find((n) => n.id === selectedId);
      if (topNode) {
        return { ...empty, node: topNode };
      }
      if (!selectedId) return empty;

      const ctx = findBranchLevelContext(nodes, selectedId);
      if (!ctx) return empty;
      const level = ctx.level;

      // A level that *is* a nested flow (conditional or multisplit) → its
      // embedded config panel.
      if (isNestedFlowLevel(level) && level.embeddedConditional) {
        // The combined-outcome decision below a nested multisplit edits
        // outcomes (not generic conditional routing).
        if (level.embeddedConditional.decisionKind) {
          return {
            ...empty,
            node: {
              id: level.id,
              kind: "task",
              status: "configured",
              data: {
                taskType: "conditional_branch",
                name: level.embeddedConditional.name,
              },
            } as WorkflowNode,
            embeddedDecision: { hostLevelId: level.id },
          };
        }
        return {
          ...empty,
          node: {
            id: level.id,
            kind: "task",
            status: "configured",
            data: {
              taskType:
                level.blockType === "conditional_branch_v2"
                  ? "conditional_branch_v2"
                  : level.embeddedConditional.splitKind === "multisplit"
                    ? "approval_split"
                    : "conditional_branch",
              name: level.embeddedConditional.name,
              ...(level.blockType === "conditional_branch_v2"
                ? {
                    conditionType: level.embeddedConditional.conditionType ?? "boolean",
                    selectedAttributes: level.embeddedConditional.selectedAttributes ?? [],
                    attributeCases: level.embeddedConditional.attributeCases ?? {},
                    elseEnabled: level.embeddedConditional.elseEnabled !== false,
                    branches: level.embeddedConditional.branches ?? [],
                  }
                : {}),
            },
          } as WorkflowNode,
          embeddedConditional: {
            hostLevelId: level.id,
            data: level.embeddedConditional,
          },
        };
      }

      // Plain branch level (incl. approval/SoD actions with an inline decision,
      // which their own config renders via the host level id).
      const resolved = resolveBranchLevel(level);
      if (resolved) return { ...empty, ...resolved };
      return empty;
    },
    [nodes, selectedId],
  );

  if (!open || !node) return null;

  const meta = NODE_META[node.kind];
  const Icon = meta.icon;
  const category = paletteCategoryForNode(node);

  // Resolve which config panel to render for a task node
  const taskType = node.kind === "task"
    ? (node.data as AnyTaskData).taskType
    : null;

  const header = embeddedConditional
    ? {
        title: (
          <EditableName
            value={embeddedConditional.data.name || "Conditional Branch"}
            onChange={(v) =>
              updateNode(embeddedConditional.hostLevelId, {
                embeddedConditional: {
                  ...embeddedConditional.data,
                  name: v,
                },
              } as never)
            }
            placeholder={
              embeddedConditional.data.splitKind === "multisplit"
                ? "Multisplit Branch"
                : "Conditional Branch"
            }
          />
        ),
        subtitle:
          embeddedConditional.data.splitKind === "multisplit"
            ? TASK_HINTS.approval_split
            : TASK_HINTS.conditional_branch,
      }
    : panelHeader(node, taskType ?? null, updateNode);

  return (
    <aside className="flex h-full w-[400px] flex-col border-l border-[var(--border)] bg-white shadow-[var(--shadow-panel)]">
      <header className="flex shrink-0 items-center gap-2 border-b border-[var(--border)] px-3 py-2">
        <span
          className={cn(
            "flex h-7 w-7 shrink-0 items-center justify-center rounded-md",
            paletteIconTileClass(category),
          )}
        >
          <Icon className="h-3.5 w-3.5" />
        </span>
        <div className="flex min-w-0 flex-1 items-center gap-1">
          <div className="min-w-0 flex-1">{header.title}</div>
          {header.subtitle && <ConfigInfoTip text={header.subtitle} />}
        </div>
        <StatusChip status={node.status} />
        <button
          onClick={() => setRightPanelOpen(false)}
          className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md text-[var(--muted-fg)] hover:bg-[var(--muted)]"
          aria-label="Close panel"
        >
          <ChevronsRight className="h-4 w-4" />
        </button>
      </header>

      <div className="flex-1 overflow-y-auto scrollbar-thin">
        {embeddedDecision && (
          <div className="flex h-full flex-col">
            <ConfigBody>
              <DecisionOutcomesSection hostLevelId={embeddedDecision.hostLevelId} />
            </ConfigBody>
          </div>
        )}

        {embeddedConditional &&
          (taskType === "conditional_branch_v2" ? (
            <ConditionalBranchV2Config
              node={node}
              onPatch={(fields) =>
                updateNode(embeddedConditional.hostLevelId, {
                  embeddedConditional: fields,
                } as unknown as Partial<WorkflowNode["data"]>)
              }
            />
          ) : embeddedConditional.data.splitKind === "multisplit" ? (
            <EmbeddedMultisplitConfig
              hostLevelId={embeddedConditional.hostLevelId}
              data={embeddedConditional.data}
            />
          ) : (
            <EmbeddedConditionalConfig
              hostLevelId={embeddedConditional.hostLevelId}
              data={embeddedConditional.data}
            />
          ))}

        {!embeddedConditional && !embeddedDecision && node.kind === "event" &&
          (node.data as EventData | ApprovalPolicyData).type === "approval_policy" ? (
          <ApprovalPolicyConfig node={node} />
        ) : !embeddedConditional && !embeddedDecision && node.kind === "event" ? (
          <EventConfig node={node} />
        ) : null}

        {/* ── Filter ────────────────────────────────────────────────── */}
        {!embeddedConditional && !embeddedDecision && node.kind === "filter" && (
          <FilterConfig
            node={node}
            onPatch={
              embeddedBranchFilter
                ? (fields) =>
                    updateNode(
                      node.id,
                      filterPatchToLevel(fields) as Partial<WorkflowNode["data"]>,
                    )
                : undefined
            }
          />
        )}

        {/* ── Task (context-aware) ──────────────────────────────────── */}
        {!embeddedConditional && !embeddedDecision && node.kind === "task" && taskType === "approval_level" && (
          <ApprovalLevelConfig node={node} />
        )}
        {!embeddedConditional && !embeddedDecision && node.kind === "task" && taskType === "approval_split" && (
          <ApprovalSplitConfig node={node} />
        )}
        {!embeddedConditional && !embeddedDecision && node.kind === "task" && taskType === "conditional_branch" && (
          (node.data as ConditionalBranchData).decisionKind ? (
            <ApprovalDecisionConfig node={node} />
          ) : (
            <ConditionalBranchConfig node={node} />
          )
        )}
        {!embeddedConditional && !embeddedDecision && node.kind === "task" && taskType === "conditional_branch_v2" && (
          <ConditionalBranchV2Config node={node} />
        )}
        {!embeddedConditional && !embeddedDecision && node.kind === "task" && taskType === "approval_policy_ref" && (
          <ApprovalPolicyRefConfig
            node={node}
            onPatch={
              embeddedBranchModule
                ? (fields) =>
                    updateNode(
                      node.id,
                      modulePatchToLevel(fields) as Partial<WorkflowNode["data"]>,
                    )
                : undefined
            }
          />
        )}
        {!embeddedConditional && !embeddedDecision && node.kind === "task" && taskType === "exit" && (
          <ExitConfig node={node} />
        )}
        {!embeddedConditional && !embeddedDecision && node.kind === "task" && taskType === "skip" && (
          <SkipConfig node={node} />
        )}
        {!embeddedConditional && !embeddedDecision && node.kind === "task" && taskType === "notification" && (
          <NotificationConfig
            node={node}
            embedded={embeddedBranchNotification}
            onPatch={
              embeddedBranchNotification
                ? (fields) =>
                    updateNode(
                      node.id,
                      notificationPatchToLevel(
                        fields,
                      ) as Partial<WorkflowNode["data"]>,
                    )
                : undefined
            }
          />
        )}
        {!embeddedConditional && !embeddedDecision && node.kind === "task" && taskType === "sod_check" && (
          <SodCheckConfig node={node} />
        )}
        {!embeddedConditional && !embeddedDecision && node.kind === "task" &&
          taskType !== "approval_level" &&
          taskType !== "approval_split" &&
          taskType !== "conditional_branch" &&
          taskType !== "conditional_branch_v2" &&
          taskType !== "approval_policy_ref" &&
          taskType !== "exit" &&
          taskType !== "skip" &&
          taskType !== "notification" &&
          taskType !== "sod_check" && (
            <AssignEntitiesConfig node={node} embedded={embeddedBranchAssign} />
          )}
      </div>
    </aside>
  );
}

const EVENT_TITLES: Record<EventType, string> = {
  joiner: "Joiner Event",
  mover: "Mover Event",
  leaver: "Leaver Event",
  approval_policy: "Approval Policy",
};

const TASK_HINTS: Partial<Record<TaskType, string>> = {
  approval_split: "Parallel branches",
  conditional_branch: "First matching branch wins",
  conditional_branch_v2: "Relationship and attribute routing with True, False, Any, or None branches",
  approval_level: "Approver, fallback & SLA",
  assign_entities: "Apps, entitlements & roles",
  approval_policy_ref: "Linked approval policy",
  notification: "Email notification",
  sod_check: "Segregation of Duties pre-check",
  exit: "End workflow path",
  skip: "Skip this step",
};

function panelHeader(
  node: WorkflowNode,
  taskType: TaskType | null,
  updateNode: (id: string, data: Partial<WorkflowNode["data"]>) => void,
): { title: ReactNode; subtitle?: string } {
  if (node.kind === "event") {
    const type = (node.data as EventData | ApprovalPolicyData).type;
    if (type === "approval_policy") {
      const data = node.data as ApprovalPolicyData;
      return {
        title: (
          <EditableName
            value={data.name ?? APPROVAL_POLICY_EVENT_NAME}
            onChange={(v) =>
              updateNode(node.id, { name: v } as Partial<ApprovalPolicyData>)
            }
            placeholder={APPROVAL_POLICY_EVENT_NAME}
          />
        ),
        subtitle: "Lifecycle trigger for this approval policy",
      };
    }
    return {
      title: (
        <h2 className="truncate text-[13px] font-semibold leading-tight text-[var(--foreground)]">
          {EVENT_TITLES[type]}
        </h2>
      ),
      subtitle: "Lifecycle trigger for this workflow",
    };
  }
  if (node.kind === "filter") {
    return {
      title: (
        <h2 className="truncate text-[13px] font-semibold leading-tight text-[var(--foreground)]">
          User Filter
        </h2>
      ),
      subtitle: "Scope users for this workflow",
    };
  }
  if (node.kind === "task" && "name" in node.data) {
    const data = node.data as { name: string };
    return {
      title: (
        <EditableName
          value={data.name}
          onChange={(v) => updateNode(node.id, { name: v } as Partial<typeof node.data>)}
          placeholder="Block name"
        />
      ),
      subtitle: taskType ? TASK_HINTS[taskType] : undefined,
    };
  }
  return {
    title: (
      <h2 className="truncate text-[13px] font-semibold leading-tight text-[var(--foreground)]">
        {NODE_META[node.kind].label}
      </h2>
    ),
  };
}

function StatusChip({ status }: { status: WorkflowNode["status"] }) {
  const cfg =
    status === "configured"
      ? {
          icon: CheckCircle2,
          cls: "bg-emerald-50 text-emerald-700 ring-emerald-200",
          label: "Configured",
        }
      : status === "warning"
        ? {
            icon: AlertCircle,
            cls: "bg-red-50 text-red-700 ring-red-200",
            label: "Warning",
          }
        : {
            icon: AlertCircle,
            cls: "bg-amber-50 text-amber-700 ring-amber-200",
            label: "Incomplete",
          };
  const Icon = cfg.icon;
  return (
    <span
      className={cn(
        "inline-flex h-5 shrink-0 items-center gap-0.5 rounded-md px-1.5 text-[10px] font-medium ring-1",
        cfg.cls,
      )}
    >
      <Icon className="h-3 w-3" /> {cfg.label}
    </span>
  );
}
