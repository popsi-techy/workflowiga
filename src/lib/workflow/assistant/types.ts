import type { BooleanCaseValue } from "../types";

export type AssistantMessageRole = "assistant" | "user" | "system";

export interface AssistantMessage {
  id: string;
  role: AssistantMessageRole;
  content: string;
  /** Optional action chips shown below the message */
  options?: AssistantOption[];
  /** Success checkmark action result */
  success?: boolean;
  timestamp: number;
}

export interface AssistantOption {
  id: string;
  label: string;
  value: string;
  description?: string;
}

export type ConversationStep =
  | "welcome"
  | "main_menu"
  | "approval_approver"
  | "condition_relationship"
  | "condition_value"
  | "condition_true_path"
  | "condition_false_path"
  | "pick_location"
  | "rename_target"
  | "idle";

export interface PendingPreview {
  title: string;
  lines: string[];
  onApply: () => void;
  onEdit?: () => void;
}

export interface LastAssistantAction {
  description: string;
  timestamp: number;
}

export type ApproverChoice =
  | "Manager"
  | "Owner"
  | "Department Head"
  | "Specific User"
  | "Custom";

export interface ConditionDraft {
  attribute: string;
  attributeLabel: string;
  value: BooleanCaseValue | "not_configured";
  truePath?: "skip" | "approval";
  falsePath?: "approval" | "skip";
  trueApprover?: ApproverChoice;
  falseApprover?: ApproverChoice;
}

export type QuickActionId =
  | "add_approval"
  | "add_condition"
  | "add_notification"
  | "add_skip"
  | "create_branch";
