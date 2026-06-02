export type NodeKind = "event" | "filter" | "task";
export type EventType = "joiner" | "mover" | "leaver" | "approval_policy";
export type TaskType =
  | "assign_entities"
  | "approval_level"
  | "approval_split"
  | "conditional_branch"
  | "conditional_branch_v2"
  | "approval_policy_ref"
  | "exit"
  | "skip"
  | "notification"
  | "sod_check";

/** Case values selectable per boolean attribute in a Conditional Type 2 block. */
export type BooleanCaseValue = "true" | "false" | "any" | "none";

/** Condition category for Conditional Type 2 — extensible for future types. */
export type ConditionalV2ConditionType = "boolean";

/** What happens when a Segregation of Duties violation is detected. */
export type SodViolationAction = "notify" | "continue" | "exit";

/** Terminal outcome for an Exit block. */
export type ExitOutcome = "Approve" | "Reject" | "End";

/** When a Notification block fires, relative to the preceding step. */
export type NotificationTrigger = "completed" | "failed" | "started";
/** Delivery channels for a Notification block. */
export type NotificationChannel = "email" | "slack";
/** Who receives the notification. */
export type NotificationAudience = "Requester" | "Manager" | "Owner" | "Specific users";
export type CompletionMode = "all" | "any" | "threshold" | "majority";

export type ApproverType = "Manager" | "Owner" | "Governance Group" | "User" | "Custom attribute";
export type FallbackType = "Skip" | "Block" | "Add fallback email";

/** What happens to a request when its SLA deadline elapses. */
export type SlaTimeoutAction =
  | "Auto-escalate to manager"
  | "Notify Only"
  | "Auto Approve"
  | "Auto Reject"
  | "Proceed to next step";

/** A conditional rule that bypasses an approval step when it matches. */
export interface SkipRule {
  logic: Logic;
  conditions: Condition[];
}

/** Shared approval level config — used both as a standalone task and embedded inside parallel levels */
export interface ApprovalLevelConfig {
  id: string;
  /** Which kind of block this branch entry is. Defaults to an approval level. */
  blockType?:
    | "approval_level"
    | "exit"
    | "assign_entities"
    | "skip"
    | "notification"
    | "conditional_branch"
    | "conditional_branch_v2"
    | "approval_split"
    | "sod_check"
    | "filter"
    | "approval_policy_ref";
  /** Embedded nested flow inside a branch. Its role depends on `blockType`:
   *  - `conditional_branch` / `approval_split`: this level *is* the nested flow.
   *  - `approval_level` / `sod_check`: the inline decision block that routes
   *    this action's outcomes (rendered directly below the action card). */
  embeddedConditional?: EmbeddedConditionalData;
  /** Outcome when blockType is "exit". */
  exitOutcome?: ExitOutcome;
  /** Linked approval policy when blockType is "approval_policy_ref". */
  policyId?: string;
  /** Assign-entities fields (when blockType is "assign_entities" — workflow branches). */
  name?: string;
  appIds?: string[];
  entitlementIds?: string[];
  techRoleIds?: string[];
  businessRoleIds?: string[];
  criteria?: { logic: Logic; conditions: Condition[] };
  approverType: ApproverType | "";
  fallbackType: FallbackType | "";
  fallbackEmail: string;
  slaEnabled: boolean;
  slaDuration: number;
  slaDurationUnit: "hours" | "days";
  autoApproveOnTimeout: boolean;
  /** Action taken when the SLA deadline elapses. */
  slaTimeoutAction?: SlaTimeoutAction;
  overrideFallback?: boolean;
  overrideSla?: boolean;
  /** Selected approver entities (governance group / user / custom-attribute ids)
   *  when approverType is one of those entity kinds. */
  approverRefs?: string[];
  /** Attribute rule resolving the approver when approverType is "Custom attribute". */
  approverRule?: SkipRule;
  /** Fallback approver user ids when fallbackType is "Add fallback email". */
  fallbackUsers?: string[];
  /** Conditional skip — bypass this approver when the rule matches. */
  skipEnabled?: boolean;
  skip?: SkipRule;
  /** Embedded notification step (conditional / multisplit branches). */
  notificationTrigger?: NotificationTrigger;
  notificationChannels?: NotificationChannel[];
  notificationAudiences?: NotificationAudience[];
  /** @deprecated Migrated to `notificationAudiences`. */
  notificationAudience?: NotificationAudience;
  notificationRecipients?: string[];
  slackMessage?: string;
  emailMessage?: string;
  /** Email / Slack when a new request is assigned to this approver. */
  notifyApproverOnAssignment?: boolean;
  assignmentNotifyChannels?: NotificationChannel[];
  /** When multiple approvers resolve at this level (e.g. several owners). */
  completionMode?: CompletionMode;
  threshold?: number;
}

export type Logic = "AND" | "OR";
export type NodeStatus = "configured" | "incomplete" | "warning";
export type Operator =
  | "equals"
  | "not_equals"
  | "contains"
  | "starts_with"
  | "in"
  | "not_in"
  | "greater_than"
  | "less_than"
  | "gte"
  | "lte";
export type RiskLevel = "Low" | "Medium" | "High";

export interface Condition {
  id: string;
  attribute: string;
  operator: Operator;
  value: string | string[];
}

export interface EventData {
  type: EventType;
  description?: string;
}

export interface ApprovalPolicyData {
  type: "approval_policy";
  /** Display name on canvas and in the config panel header. */
  name?: string;
  description?: string;
}

export interface FilterData {
  logic: Logic;
  conditions: Condition[];
}

export interface EntitlementRef {
  id: string;
  appId: string;
}

/** Legacy assign-entities task */
export interface TaskData {
  taskType?: "assign_entities";
  name: string;
  appIds: string[];
  entitlementIds: string[];
  techRoleIds: string[];
  businessRoleIds: string[];
  criteria: {
    logic: Logic;
    conditions: Condition[];
  };
}

export interface ApprovalLevelData {
  taskType: "approval_level";
  name: string;
  approverType: ApproverType | "";
  fallbackType: FallbackType | "";
  fallbackEmail: string;
  slaEnabled: boolean;
  slaDuration: number;
  slaDurationUnit: "hours" | "days";
  autoApproveOnTimeout: boolean;
  /** Action taken when the SLA deadline elapses. */
  slaTimeoutAction?: SlaTimeoutAction;
  /** Override flags when embedded inside a multisplit branch. */
  overrideFallback?: boolean;
  overrideSla?: boolean;
  /** Selected approver entities when approverType is an entity kind. */
  approverRefs?: string[];
  /** Attribute rule resolving the approver when approverType is "Custom attribute". */
  approverRule?: SkipRule;
  /** Fallback approver user ids when fallbackType is "Add fallback email". */
  fallbackUsers?: string[];
  /** Conditional skip — bypass this approver when the rule matches. */
  skipEnabled?: boolean;
  skip?: SkipRule;
  /** Email / Slack when a new request is assigned to this approver. */
  notifyApproverOnAssignment?: boolean;
  assignmentNotifyChannels?: NotificationChannel[];
  slackMessage?: string;
  emailMessage?: string;
  /** Id of the auto-created conditional decision block that routes this
   *  approver's outcome (Approved / Rejected / Delegated / No Action). */
  decisionNodeId?: string;
  /** When multiple approvers resolve at this level (e.g. several owners). */
  completionMode?: CompletionMode;
  threshold?: number;
}

/** A nested flow embedded inside a branch column — either a conditional
 *  router, a parallel multisplit, or an action's inline decision block. */
export interface EmbeddedConditionalData {
  name: string;
  /** Whether this nested flow routes by condition (default) or runs parallel
   *  branches. Decision blocks (decisionKind set) are always conditional. */
  splitKind?: "conditional" | "multisplit";
  /** When set, this embedded flow is an action's inline decision block. */
  decisionKind?: DecisionKind;
  /** Id of the host branch level (approval/SoD) this decision serves. */
  sourceLevelId?: string;
  routingAttributes?: string[];
  /** Number of IF / ELSE IF routes (excluding the trailing else path). */
  conditionCount?: number;
  /** @deprecated Use conditionCount + 1 (includes else). */
  branchCount?: number;
  /** When false, no trailing else / catch-all route. Defaults to true. */
  elseEnabled?: boolean;
  branches: SplitBranchData[];
  globalFallbackType?: FallbackType | "";
  /** Multisplit-only: how branches complete and the split attribute(s). */
  completionMode?: CompletionMode;
  threshold?: number;
  branchAttributes?: string[];
  /** V2 fields */
  conditionType?: ConditionalV2ConditionType;
  selectedAttributes?: string[];
  attributeCases?: Record<string, BooleanCaseValue[]>;
  advancedConditions?: AdvancedCondition[];
}

export interface SplitBranchData {
  id: string;
  name: string;
  levels: ApprovalLevelConfig[];
  /** Routing condition — only used by conditional branches. */
  condition?: SkipRule;
  /** @deprecated Single-value split — use attributeValues. */
  attributeValue?: string;
  /** Per-branch values when the parent multisplit splits by attribute(s). */
  attributeValues?: Record<string, string>;
}

export interface ApprovalSplitData {
  taskType: "approval_split";
  name: string;
  branchCount: number;
  completionMode: CompletionMode;
  threshold: number;
  branches: SplitBranchData[];
  /** @deprecated Single-attribute split — use branchAttributes. */
  branchAttribute?: string;
  /** Split branches by one or more attributes (e.g. location + department). */
  branchAttributes?: string[];
  globalFallbackType: FallbackType | "";
  globalFallbackEmail: string;
  /** Fallback approver user ids (when globalFallbackType = "Add fallback email"). */
  globalFallbackUsers?: string[];
  /** Id of the auto-created conditional decision block that routes this
   *  multisplit's combined outcome (Approved / Rejected / …). Approval
   *  multisplits behave like an action: a single decision lives below them. */
  decisionNodeId?: string;
  /** @deprecated Global SLA was removed — SLA is now per-approver via its
   *  "No Action / SLA Breached" outcome. Optional only for legacy data. */
  globalSlaEnabled?: boolean;
  globalSlaDuration?: number;
  globalSlaDurationUnit?: "hours" | "days";
  globalAutoApproveOnTimeout?: boolean;
  globalSlaTimeoutAction?: SlaTimeoutAction;
}

/** Condition-routed branching: the first branch whose condition matches runs.
 *  Shares the branch + global-rule shape with ApprovalSplitData so the same
 *  branch-level machinery (inheritance, inline level cards) is reused. */
/** Kind of action a conditional decision block reacts to (drives its outcome
 *  preset + progressive-disclosure chips). Plain conditionals leave it unset. */
export type DecisionKind = "approval" | "sod";

/** Minimal shape shared by a decision conditional whether it lives as a
 *  top-level node (`ConditionalBranchData`) or inline inside a branch
 *  (`EmbeddedConditionalData`). Lets the outcome helpers serve both. */
export interface DecisionLike {
  decisionKind?: DecisionKind;
  conditionCount?: number;
  branchCount?: number;
  /** When false, no catch-all else route for unrouted outcomes. */
  elseEnabled?: boolean;
  branches: SplitBranchData[];
}

export interface ConditionalBranchData {
  taskType: "conditional_branch";
  name: string;
  /** When set, this conditional was auto-created to handle an action block's
   *  outcomes and is rendered as a linked "decision" block. */
  decisionKind?: DecisionKind;
  /** Id of the action block (approval level / SoD check) this decision serves. */
  sourceActionId?: string;
  /** Number of IF / ELSE IF routes (excluding the trailing else path). 0 = setup pending. */
  conditionCount?: number;
  /** @deprecated Total routes including else — prefer conditionCount. */
  branchCount: number;
  /** When false, no trailing else / catch-all route. Defaults to true. */
  elseEnabled?: boolean;
  branches: SplitBranchData[];
  /** Attribute(s) compared on each routing rule (if / else if). */
  routingAttributes?: string[];
  globalFallbackType: FallbackType | "";
  globalFallbackEmail: string;
  /** Fallback approver user ids (when globalFallbackType = "Add fallback email"). */
  globalFallbackUsers?: string[];
  /** @deprecated Global SLA was removed — SLA is now per-approver via its
   *  "No Action / SLA Breached" outcome. Optional only for legacy data. */
  globalSlaEnabled?: boolean;
  globalSlaDuration?: number;
  globalSlaDurationUnit?: "hours" | "days";
  globalAutoApproveOnTimeout?: boolean;
  globalSlaTimeoutAction?: SlaTimeoutAction;
}

/** Workflow "module" block that references a saved Approval Policy. */
export interface ApprovalPolicyRefData {
  taskType: "approval_policy_ref";
  name: string;
  /** Id of the referenced approval policy (see Policy). */
  policyId?: string;
}

/** Terminal block that ends the flow (or a branch route) with an outcome. */
export interface ExitData {
  taskType: "exit";
  name: string;
  outcome: ExitOutcome;
}

/** Branch route that bypasses its steps — the flow continues after the branch. */
export interface SkipData {
  taskType: "skip";
  name: string;
}

/** Pre-check that evaluates Segregation of Duties rules before continuing. */
export interface SodCheckData {
  taskType: "sod_check";
  name: string;
  /** Action when a SoD violation is detected. */
  violationAction: SodViolationAction;
  /** Delivery channels when violationAction is "notify". */
  violationChannels: NotificationChannel[];
  /** Who receives the violation notification. */
  violationAudiences: NotificationAudience[];
  /** User ids when "Specific users" is in violationAudiences. */
  violationRecipients: string[];
  slackMessage?: string;
  emailMessage?: string;
  /** Id of the auto-created conditional decision block that routes the SoD
   *  result (violation / no violation / risk levels). */
  decisionNodeId?: string;
}

/** Sends a notification (e.g. when a preceding task completes or fails). */
export interface NotificationData {
  taskType: "notification";
  name: string;
  trigger: NotificationTrigger;
  channels: NotificationChannel[];
  /** Who receives the notification (one or more). */
  audiences: NotificationAudience[];
  /** @deprecated Migrated to `audiences` — kept for older persisted data. */
  audience?: NotificationAudience;
  /** User ids when "Specific users" is in audiences. */
  recipients: string[];
  /** Per-channel message templates (support {{variable}} tokens). */
  slackMessage?: string;
  emailMessage?: string;
}

/** Condition-routed branching via Boolean relationship attributes.
 *  The config panel surfaces a Condition Type picker (currently only "boolean")
 *  then shows the 8 IAM relationship attributes with True/False/Any/None chips.
 *  Branches are derived from `selectedAttributes` + `attributeCases` on every patch
 *  via `syncConditionalV2Branches()` — they are not edited independently. */
export interface AdvancedCondition {
  id: string;
  name: string;
  condition: SkipRule;
}

export interface ConditionalBranchV2Data {
  taskType: "conditional_branch_v2";
  name: string;
  /** Active condition category. */
  conditionType: ConditionalV2ConditionType;
  /** Ordered attribute ids the user has toggled on. */
  selectedAttributes: string[];
  /** Per-attribute selected case values — each entry generates one branch. */
  attributeCases: Record<string, BooleanCaseValue[]>;
  /** When true a catch-all "Else" branch is appended after all condition branches. */
  elseEnabled: boolean;
  /** Derived from selectedAttributes + attributeCases. Rebuilt on every patch. */
  branches: SplitBranchData[];
  globalFallbackType: FallbackType | "";
  globalFallbackEmail: string;
  globalFallbackUsers?: string[];
  advancedConditions?: AdvancedCondition[];
}

export type AnyTaskData =
  | TaskData
  | ApprovalLevelData
  | ApprovalSplitData
  | ConditionalBranchData
  | ConditionalBranchV2Data
  | ApprovalPolicyRefData
  | ExitData
  | SkipData
  | NotificationData
  | SodCheckData;

export interface WorkflowNode {
  id: string;
  kind: NodeKind;
  data: EventData | FilterData | AnyTaskData | ApprovalPolicyData;
  // (AnyTaskData includes ConditionalBranchData)
  status: NodeStatus;
}

export interface Snapshot {
  nodes: WorkflowNode[];
}

export interface WorkflowVersion {
  id: string;
  /** Auto-generated immutable name: "Version 1", "Version 2", ... */
  name: string;
  /** ISO timestamp when the version was saved. */
  createdAt: string;
  /** Display name of the user that created the version. */
  createdBy: string;
  /** Exactly one version is the active (production) version at any time. */
  isActive: boolean;
  /** Immutable snapshot of the workflow nodes at save time. */
  nodes: WorkflowNode[];
}

export type ViewMode = "outline" | "detailed";
export type EditorContext = "workflow" | "approval";

/** A policy is one workflow/approval flow listed in its table. */
export type PolicyType = "workflow" | "approval";
export type PolicyStatus = "draft" | "active";

export interface Policy {
  id: string;
  name: string;
  type: PolicyType;
  status: PolicyStatus;
  /** The canvas nodes that make up this policy. */
  nodes: WorkflowNode[];
  createdAt: string;
  updatedAt: string;
}

/** Which screen the app shell is showing. */
export type AppScreen = "list" | "editor";

export interface OperatorDef {
  value: Operator;
  label: string;
}

export interface AttributeDef {
  value: string;
  label: string;
  type: "select" | "text" | "number";
  options?: string[];
  /** Optional unit/prefix shown alongside numeric inputs (e.g. "$"). */
  unit?: string;
}

export interface AppItem {
  id: string;
  name: string;
  initials: string;
  color: string;
  category: string;
  baselineAccess: string;
}

export interface EntitlementItem {
  id: string;
  name: string;
  appId: string;
  type: "Permission" | "Group" | "Role" | "License";
  risk: RiskLevel;
}

export interface TechnicalRoleItem {
  id: string;
  name: string;
  description: string;
  appsCount: number;
  risk: RiskLevel;
  lastUpdated: string;
}

export interface BusinessRoleItem {
  id: string;
  name: string;
  description: string;
  members: number;
  owner: string;
  lastUpdated: string;
}
