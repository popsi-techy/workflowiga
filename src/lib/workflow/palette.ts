import {
  UserPlus,
  ArrowRightLeft,
  UserMinus,
  ShieldCheck,
  Filter as FilterIcon,
  ListChecks,
  Layers,
  ShieldHalf,
  GitFork,
  Split,
  LogOut,
  Bell,
  SkipForward,
  Scale,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import type { EditorContext, EventType, NodeKind, WorkflowNode } from "./types";

export interface PaletteItem {
  /** Stable id for dnd-kit and React keys */
  dragId: string;
  /** Underlying node kind that will be inserted */
  kind: NodeKind;
  /** Optional preset values folded into the new node's data on drop */
  preset?: Record<string, unknown>;
  icon: LucideIcon;
  label: string;
  description: string;
  comingSoon?: boolean;
}

/** Workflow policy events: Joiner, Mover, Leaver */
export const WORKFLOW_EVENT_ITEMS: PaletteItem[] = [
  {
    dragId: "palette-event-joiner",
    kind: "event",
    preset: { type: "joiner" satisfies EventType },
    icon: UserPlus,
    label: "Joiner",
    description: "Triggered when a new identity is created",
  },
  {
    dragId: "palette-event-mover",
    kind: "event",
    preset: { type: "mover" satisfies EventType },
    icon: ArrowRightLeft,
    label: "Mover",
    description: "Triggered when an identity's attributes change",
    comingSoon: true,
  },
  {
    dragId: "palette-event-leaver",
    kind: "event",
    preset: { type: "leaver" satisfies EventType },
    icon: UserMinus,
    label: "Leaver",
    description: "Triggered when an identity is deactivated",
    comingSoon: true,
  },
];

/** Approval policy events */
export const APPROVAL_EVENT_ITEMS: PaletteItem[] = [
  {
    dragId: "palette-event-approval-policy",
    kind: "event",
    preset: { type: "approval_policy" satisfies EventType },
    icon: ShieldCheck,
    label: "Approval Policy",
    description: "Multi-level approver chain with SLA and fallback rules",
  },
];

/** All events — kept for backward compatibility */
export const EVENT_ITEMS: PaletteItem[] = [
  ...WORKFLOW_EVENT_ITEMS,
  ...APPROVAL_EVENT_ITEMS,
];

export const FILTER_ITEMS: PaletteItem[] = [
  {
    dragId: "palette-filter-overall",
    kind: "filter",
    icon: FilterIcon,
    label: "User Filter",
    description: "Scope the workflow to a user segment",
  },
];

/** Notification block — available in both editor contexts. */
export const NOTIFICATION_ITEM: PaletteItem = {
  dragId: "palette-task-notification",
  kind: "task",
  preset: { taskType: "notification" },
  icon: Bell,
  label: "Notification",
  description: "Notify people on Slack or email when a step completes or fails",
};

/** Skip block — bypasses a branch route while letting the flow continue. */
export const SKIP_ITEM: PaletteItem = {
  dragId: "palette-task-skip",
  kind: "task",
  preset: { taskType: "skip" },
  icon: SkipForward,
  label: "Skip",
  description: "Bypass this branch — the flow continues after",
};

/** Terminal Exit block — available in both editor contexts. */
export const EXIT_ITEM: PaletteItem = {
  dragId: "palette-task-exit",
  kind: "task",
  preset: { taskType: "exit" },
  icon: LogOut,
  label: "Exit",
  description: "Ends the flow — no further steps run",
};

/** Default tasks — shown when event is joiner / mover / leaver */
export const TASK_ITEMS: PaletteItem[] = [
  {
    dragId: "palette-task-assign",
    kind: "task",
    preset: { taskType: "assign_entities" },
    icon: ListChecks,
    label: "Assign Entities",
    description: "Provision apps, entitlements and roles",
  },
  NOTIFICATION_ITEM,
];

/** Workflow MODULES — reusable blocks that embed another policy. */
export const WORKFLOW_MODULE_ITEMS: PaletteItem[] = [
  {
    dragId: "palette-task-approval-policy-ref",
    kind: "task",
    preset: { taskType: "approval_policy_ref" },
    icon: ShieldCheck,
    label: "Approval Policy",
    description: "Require sign-off using a saved approval policy",
  },
];

/** Approval-specific TASKS — a single approver step. */
export const APPROVAL_TASK_ITEMS: PaletteItem[] = [
  {
    dragId: "palette-task-approval-level",
    kind: "task",
    preset: { taskType: "approval_level" },
    icon: ShieldHalf,
    label: "Approval Level",
    description: "Single approver step — configure approver, fallback and SLA",
  },
  {
    dragId: "palette-task-sod-check",
    kind: "task",
    preset: { taskType: "sod_check" },
    icon: Scale,
    label: "SoD Check",
    description: "Pre-check for Segregation of Duties violations before continuing",
  },
  NOTIFICATION_ITEM,
];

/** Approval-specific RULES — flow-control blocks like parallel branching. */
export const APPROVAL_RULE_ITEMS: PaletteItem[] = [
  {
    dragId: "palette-task-approval-split",
    kind: "task",
    preset: { taskType: "approval_split" },
    icon: GitFork,
    label: "Multisplit Branch",
    description: "Split workflow into multiple parallel approval branches",
  },
  {
    dragId: "palette-task-conditional-branch",
    kind: "task",
    preset: { taskType: "conditional_branch" },
    icon: Split,
    label: "Conditional Branch",
    description: "Route the request down the first matching branch",
  },
  SKIP_ITEM,
  EXIT_ITEM,
];

/** Combined approval task palette (tasks + rules) for flat/legacy callers. */
export const APPROVAL_ALL_TASK_ITEMS: PaletteItem[] = [
  ...APPROVAL_TASK_ITEMS,
  ...APPROVAL_RULE_ITEMS,
];

/** Combined workflow task palette (tasks + modules + rules) for flat callers. */
export const WORKFLOW_ALL_TASK_ITEMS: PaletteItem[] = [
  ...TASK_ITEMS,
  ...WORKFLOW_MODULE_ITEMS,
  ...APPROVAL_RULE_ITEMS,
];

export interface PaletteSection {
  /** Section heading; null renders an ungrouped list. */
  label: string | null;
  items: PaletteItem[];
}

/** Grouped task palette for the Tasks tab, split into Tasks / Rules for
 *  approval policies and a single ungrouped list elsewhere. */
export function taskSectionsForEditorContext(
  context: EditorContext,
  nodes: WorkflowNode[],
): PaletteSection[] {
  const eventNode = nodes.find((n) => n.kind === "event");
  const evType = eventNode
    ? (eventNode.data as { type?: string }).type
    : undefined;
  const isApproval = eventNode
    ? evType === "approval_policy"
    : context === "approval";

  if (isApproval) {
    return [
      { label: "Tasks", items: APPROVAL_TASK_ITEMS },
      { label: "Rules", items: APPROVAL_RULE_ITEMS },
    ];
  }
  return [
    { label: "Filters", items: FILTER_ITEMS },
    { label: "Tasks", items: TASK_ITEMS },
    { label: "Modules", items: WORKFLOW_MODULE_ITEMS },
    { label: "Rules", items: APPROVAL_RULE_ITEMS },
  ];
}

/** Returns the correct event palette based on editor context */
export function eventItemsForContext(context: EditorContext): PaletteItem[] {
  return context === "approval" ? APPROVAL_EVENT_ITEMS : WORKFLOW_EVENT_ITEMS;
}

/** Returns the correct task palette for the current canvas state and editor context */
export function taskItemsForEditorContext(context: EditorContext, nodes: WorkflowNode[]): PaletteItem[] {
  // If nodes exist with an event, use the actual event type to decide
  const eventNode = nodes.find((n) => n.kind === "event");
  if (eventNode) {
    const evType = (eventNode.data as { type?: string }).type;
    return evType === "approval_policy" ? APPROVAL_ALL_TASK_ITEMS : WORKFLOW_ALL_TASK_ITEMS;
  }
  // Otherwise, use the editor context to decide
  return context === "approval" ? APPROVAL_ALL_TASK_ITEMS : WORKFLOW_ALL_TASK_ITEMS;
}

/** Legacy context-unaware helper — kept for backward compatibility */
export function taskItemsForContext(nodes: WorkflowNode[]): PaletteItem[] {
  const eventNode = nodes.find((n) => n.kind === "event");
  if (!eventNode) return TASK_ITEMS;
  const evType = (eventNode.data as { type?: string }).type;
  return evType === "approval_policy" ? APPROVAL_ALL_TASK_ITEMS : TASK_ITEMS;
}

export function itemsForKind(kind: NodeKind): PaletteItem[] {
  switch (kind) {
    case "event":
      return EVENT_ITEMS;
    case "filter":
      return FILTER_ITEMS;
    case "task":
      return TASK_ITEMS; // fallback — context-unaware callers
  }
}
