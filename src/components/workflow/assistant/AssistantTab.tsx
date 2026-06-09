"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Check, RotateCw, Undo2 } from "lucide-react";
import { cn } from "@/lib/cn";
import { uid } from "@/lib/workflow/defaults";
import { useWorkflowStore, canRedo, canUndo } from "@/lib/workflow/store";
import {
  ASSISTANT_CONDITION_VALUES,
  buildApprovalNodes,
  buildConditionalV2Node,
  approverTypeFromChoice,
  buildNotificationNode,
  buildSkipNode,
  formatConditionPreview,
  RELATIONSHIP_OPTIONS,
} from "@/lib/workflow/assistant/actions";
import {
  getSuggestedNextSteps,
  WELCOME_SUGGESTIONS,
} from "@/lib/workflow/assistant/suggestions";
import {
  formatInsertTargetLabel,
  inferDefaultInsertTarget,
  listAssistantInsertTargets,
  targetAfterConditionalDraft,
} from "@/lib/workflow/assistant/insert-target";
import { InsertTargetBar } from "./InsertTargetBar";
import type {
  AssistantMessage,
  AssistantOption,
  ApproverChoice,
  ConditionDraft,
  ConversationStep,
  LastAssistantAction,
  QuickActionId,
} from "@/lib/workflow/assistant/types";
import { getTemplateById } from "@/lib/workflow/assistant/templates";
import {
  AMAN_TEST_POLICY_NAME,
  buildAmanTestWorkflowNodes,
  formatAmanTestPreviewLines,
} from "@/lib/workflow/assistant/ladder-workflow";
import { AssistantPreviewCard } from "./AssistantPreviewCard";
import { QuickActionBar } from "./QuickActionBar";

function makeMessage(
  role: AssistantMessage["role"],
  content: string,
  extra?: Partial<AssistantMessage>,
): AssistantMessage {
  return {
    id: uid("msg"),
    role,
    content,
    timestamp: Date.now(),
    ...extra,
  };
}

const MAIN_MENU_OPTIONS: AssistantOption[] = [
  { id: "m1", label: "Approval", value: "add_approval" },
  { id: "m2", label: "Notification", value: "add_notification" },
  { id: "m3", label: "Condition", value: "add_condition" },
  { id: "m4", label: "Skip step", value: "add_skip" },
];

const APPROVER_OPTIONS: AssistantOption[] = [
  { id: "a1", label: "Manager", value: "Manager" },
  { id: "a2", label: "Application owner", value: "Owner" },
  { id: "a3", label: "Department head", value: "Department Head" },
  { id: "a4", label: "Specific user", value: "Specific User" },
  { id: "a5", label: "Custom", value: "Custom" },
];

const PATH_OPTIONS: AssistantOption[] = [
  { id: "p1", label: "Skip approval", value: "skip" },
  { id: "p2", label: "Manager approval", value: "approval_manager" },
  { id: "p3", label: "Owner approval", value: "approval_owner" },
];

interface Props {
  onSwitchToTemplates: () => void;
}

export function AssistantTab({ onSwitchToTemplates }: Props) {
  const nodes = useWorkflowStore((s) => s.nodes);
  const appendAssistantNodes = useWorkflowStore((s) => s.appendAssistantNodes);
  const assistantInsertTarget = useWorkflowStore((s) => s.assistantInsertTarget);
  const setAssistantInsertTarget = useWorkflowStore((s) => s.setAssistantInsertTarget);
  const applyAssistantTemplate = useWorkflowStore((s) => s.applyAssistantTemplate);
  const installAssistantWorkflowPolicy = useWorkflowStore(
    (s) => s.installAssistantWorkflowPolicy,
  );
  const showToast = useWorkflowStore((s) => s.showToast);
  const undo = useWorkflowStore((s) => s.undo);
  const redo = useWorkflowStore((s) => s.redo);
  const canU = useWorkflowStore(canUndo);
  const canR = useWorkflowStore(canRedo);

  const [messages, setMessages] = useState<AssistantMessage[]>([]);
  const [step, setStep] = useState<ConversationStep>("welcome");
  const [conditionDraft, setConditionDraft] = useState<ConditionDraft | null>(null);
  const [preview, setPreview] = useState<{
    title: string;
    lines: string[];
    onApply: () => void;
  } | null>(null);
  const [lastAction, setLastAction] = useState<LastAssistantAction | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  const activeTarget =
    assistantInsertTarget ?? inferDefaultInsertTarget(nodes);

  const pushAssistant = useCallback((msg: AssistantMessage) => {
    setMessages((prev) => [...prev, msg]);
  }, []);

  const recordAction = useCallback(
    (description: string) => {
      setLastAction({ description, timestamp: Date.now() });
      pushAssistant(
        makeMessage("system", description, { success: true }),
      );
      const suggestions = getSuggestedNextSteps(
        useWorkflowStore.getState().nodes,
        useWorkflowStore.getState().assistantInsertTarget ?? undefined,
      );
      pushAssistant(
        makeMessage("assistant", "Suggested next steps:", { options: suggestions }),
      );
      setStep("idle");
    },
    [pushAssistant],
  );

  useEffect(() => {
    if (messages.length === 0) {
      setMessages([
        makeMessage(
          "assistant",
          "Tell me what to build, or pick a quick start below.",
          { options: WELCOME_SUGGESTIONS },
        ),
      ]);
      setStep("welcome");
    }
  }, [messages.length]);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, preview]);

  function addApproval(choice: ApproverChoice, name?: string) {
    const approverType = approverTypeFromChoice(choice);
    const label = name ?? `${choice} approval`;
    const nodesToAdd = buildApprovalNodes(approverType, label);
    appendAssistantNodes(nodesToAdd);
    recordAction(`Added ${label}`);
  }

  function addNotification() {
    const node = buildNotificationNode();
    appendAssistantNodes([node]);
    recordAction("Added notification");
  }

  function addSkip() {
    const node = buildSkipNode();
    appendAssistantNodes([node]);
    recordAction("Added skip step");
  }

  function applyCondition(draft: ConditionDraft) {
    const node = buildConditionalV2Node(draft);
    appendAssistantNodes([node]);
    const nextTarget = targetAfterConditionalDraft(
      useWorkflowStore.getState().nodes,
      node.id,
      draft.attribute,
      "true",
    );
    if (nextTarget) {
      setAssistantInsertTarget(nextTarget);
    }
    recordAction(`Added conditional branch: ${draft.attributeLabel}`);
    setConditionDraft(null);
    setPreview(null);
  }

  function showPickLocation() {
    const options = listAssistantInsertTargets(nodes).map((o) => ({
      id: o.id,
      label: o.label,
      value: o.id,
    }));
    setStep("pick_location");
    pushAssistant(
      makeMessage(
        "assistant",
        "Tip: click any block on the canvas to add right after it. Or pick a spot here:",
        { options },
      ),
    );
  }

  function showConditionPreview(draft: ConditionDraft) {
    setPreview({
      title: "You are about to create:",
      lines: formatConditionPreview(draft),
      onApply: () => applyCondition(draft),
    });
  }

  function showAmanTestPreview() {
    setPreview({
      title: `Create approval policy "${AMAN_TEST_POLICY_NAME}"`,
      lines: formatAmanTestPreviewLines(),
      onApply: () => {
        installAssistantWorkflowPolicy(
          AMAN_TEST_POLICY_NAME,
          buildAmanTestWorkflowNodes(),
        );
        setPreview(null);
        recordAction(`Created "${AMAN_TEST_POLICY_NAME}" routing ladder on canvas`);
        showToast(`Policy "${AMAN_TEST_POLICY_NAME}" is ready on the canvas`, "success");
      },
    });
    pushAssistant(
      makeMessage(
        "assistant",
        "Review the routing ladder below. True paths are green, false paths are red. Apply when ready.",
      ),
    );
  }

  function handleWelcome(value: string, label: string) {
    pushAssistant(makeMessage("user", label));

    switch (value) {
      case "aman_test":
        showAmanTestPreview();
        break;
      case "manager_all":
        addApproval("Manager", "Manager approval");
        break;
      case "manager_skip": {
        const draft: ConditionDraft = {
          attribute: "isRequesterManagerOfSubject",
          attributeLabel: "Request initiator is target user's manager",
          value: "true",
          truePath: "skip",
          falsePath: "approval",
          falseApprover: "Manager",
        };
        showConditionPreview(draft);
        break;
      }
      case "finance_route":
        showConditionPreview({
          attribute: "isRequesterSameDeptAsSubject",
          attributeLabel: "Request initiator is in target user's department",
          value: "true",
          truePath: "approval",
          trueApprover: "Department Head",
          falsePath: "approval",
          falseApprover: "Manager",
        });
        break;
      case "two_level": {
        const template = getTemplateById("multi_level");
        if (template) {
          applyAssistantTemplate(template.build());
          recordAction("Applied two-level approval workflow");
        }
        break;
      }
      case "add_notification":
        addNotification();
        break;
      case "open_templates":
        onSwitchToTemplates();
        pushAssistant(
          makeMessage("assistant", "Browse templates in the Templates tab to quick-start your workflow."),
        );
        break;
      default:
        setStep("main_menu");
        pushAssistant(
          makeMessage("assistant", "What would you like to add?", {
            options: MAIN_MENU_OPTIONS,
          }),
        );
    }
  }

  function handleOptionClick(option: AssistantOption) {
    if (step === "pick_location") {
      const match = listAssistantInsertTargets(nodes).find((o) => o.id === option.value);
      if (match) {
        pushAssistant(makeMessage("user", option.label));
        setAssistantInsertTarget(match.target);
        setStep("idle");
        pushAssistant(
          makeMessage(
            "assistant",
            `Got it. Next step lands at: ${formatInsertTargetLabel(nodes, match.target)}.`,
          ),
        );
      }
      return;
    }

    if (step === "welcome" || step === "idle") {
      if (
        ["manager_all", "manager_skip", "finance_route", "two_level", "add_notification", "open_templates", "aman_test"].includes(
          option.value,
        )
      ) {
        handleWelcome(option.value, option.label);
        return;
      }
      if (["add_notification", "add_approval", "add_condition", "add_skip", "manager_approval", "pick_location"].includes(option.value)) {
        handleQuickAction(option.value as QuickActionId | "manager_approval" | "pick_location");
        return;
      }
    }

    pushAssistant(makeMessage("user", option.label));

    switch (step) {
      case "main_menu":
      case "idle":
      case "welcome":
        handleMainMenu(option.value);
        break;
      case "approval_approver":
        addApproval(option.value as ApproverChoice);
        break;
      case "condition_relationship":
        setConditionDraft({
          attribute: option.value,
          attributeLabel: option.label,
          value: "true",
        });
        setStep("condition_value");
        pushAssistant(
          makeMessage("assistant", "Select the condition value:", {
            options: ASSISTANT_CONDITION_VALUES.map((v) => ({
              id: v.value,
              label: v.label,
              value: v.value,
            })),
          }),
        );
        break;
      case "condition_value": {
        const val = option.value as ConditionDraft["value"];
        const draft = conditionDraft
          ? { ...conditionDraft, value: val }
          : null;
        if (!draft) return;
        setConditionDraft(draft);
        setStep("condition_true_path");
        pushAssistant(
          makeMessage("assistant", "What should happen when this condition is true?", {
            options: PATH_OPTIONS,
          }),
        );
        break;
      }
      case "condition_true_path": {
        const draft = conditionDraft;
        if (!draft) return;
        const updated: ConditionDraft = {
          ...draft,
          truePath: option.value === "skip" ? "skip" : "approval",
          trueApprover:
            option.value === "approval_owner"
              ? "Owner"
              : option.value === "approval_manager"
                ? "Manager"
                : undefined,
        };
        setConditionDraft(updated);
        setStep("condition_false_path");
        pushAssistant(
          makeMessage("assistant", "What should happen when this condition is false?", {
            options: PATH_OPTIONS,
          }),
        );
        break;
      }
      case "condition_false_path": {
        const draft = conditionDraft;
        if (!draft) return;
        const updated: ConditionDraft = {
          ...draft,
          falsePath: option.value === "skip" ? "skip" : "approval",
          falseApprover:
            option.value === "approval_owner"
              ? "Owner"
              : option.value === "approval_manager"
                ? "Manager"
                : "Manager",
        };
        setConditionDraft(updated);
        showConditionPreview(updated);
        setStep("idle");
        break;
      }
      default:
        break;
    }
  }

  function handleMainMenu(value: string) {
    switch (value) {
      case "add_approval":
        setStep("approval_approver");
        pushAssistant(
          makeMessage("assistant", "Who should approve?", { options: APPROVER_OPTIONS }),
        );
        break;
      case "add_notification":
        addNotification();
        break;
      case "add_condition":
        setStep("condition_relationship");
        pushAssistant(
          makeMessage("assistant", "Select a relationship condition:", {
            options: RELATIONSHIP_OPTIONS.map((r) => ({
              id: r.value,
              label: r.label,
              value: r.value,
            })),
          }),
        );
        break;
      case "add_skip":
        addSkip();
        break;
      case "pick_location":
        showPickLocation();
        break;
      default:
        break;
    }
  }

  function handleQuickAction(id: QuickActionId | "manager_approval" | "pick_location") {
    if (id === "pick_location") {
      showPickLocation();
      return;
    }
    if (id === "manager_approval") {
      addApproval("Manager" as ApproverChoice, "Manager approval");
      return;
    }
    switch (id) {
      case "add_approval":
        setStep("approval_approver");
        pushAssistant(
          makeMessage("assistant", "Who should approve?", { options: APPROVER_OPTIONS }),
        );
        break;
      case "add_notification":
        addNotification();
        break;
      case "add_condition":
        setStep("condition_relationship");
        pushAssistant(
          makeMessage("assistant", "Select a relationship condition:", {
            options: RELATIONSHIP_OPTIONS.map((r) => ({
              id: r.value,
              label: r.label,
              value: r.value,
            })),
          }),
        );
        break;
      case "add_skip":
        addSkip();
        break;
      case "create_branch":
        setStep("condition_relationship");
        pushAssistant(
          makeMessage("assistant", "Create a branch — select a relationship condition:", {
            options: RELATIONSHIP_OPTIONS.map((r) => ({
              id: r.value,
              label: r.label,
              value: r.value,
            })),
          }),
        );
        break;
    }
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div ref={scrollRef} className="flex-1 overflow-y-auto scrollbar-thin px-3 py-3">
        <div className="flex flex-col gap-3">
          {messages.map((msg) => (
            <div
              key={msg.id}
              className={cn(
                "flex flex-col gap-2",
                msg.role === "user" && "items-end",
              )}
            >
              {msg.role === "system" ? (
                <div className="flex items-center gap-2 rounded-lg border border-emerald-200/80 bg-emerald-50/80 px-3 py-2">
                  <Check className="h-3.5 w-3.5 shrink-0 text-emerald-600" />
                  <span className="text-[11.5px] font-medium text-emerald-800">
                    {msg.content}
                  </span>
                </div>
              ) : (
                <div
                  className={cn(
                    "max-w-[95%] rounded-lg px-3 py-2 text-[12px] leading-relaxed",
                    msg.role === "assistant"
                      ? "bg-[var(--muted)]/40 text-[var(--foreground)]"
                      : "bg-[#eb5424] text-white",
                  )}
                >
                  {msg.content}
                </div>
              )}

              {msg.options && msg.options.length > 0 && (
                <div className="flex flex-wrap gap-1.5">
                  {msg.options.map((opt) => (
                    <button
                      key={opt.id}
                      type="button"
                      onClick={() => handleOptionClick(opt)}
                      className="rounded-full border border-[var(--border)] bg-white px-2.5 py-1 text-[11px] font-medium text-[var(--foreground)] transition-colors hover:border-[#eb5424]/40 hover:bg-[#eb5424]/5"
                      title={opt.description}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              )}

              {conditionDraft && msg.id === messages[messages.length - 1]?.id && step !== "welcome" && (
                <div className="flex flex-wrap gap-1">
                  <span className="rounded-full border border-indigo-200 bg-indigo-50 px-2 py-0.5 text-[10px] font-medium text-indigo-800">
                    {conditionDraft.attributeLabel}
                  </span>
                  {conditionDraft.value && (
                    <span className="rounded-full border border-slate-200 bg-slate-50 px-2 py-0.5 text-[10px] font-medium text-slate-700">
                      {conditionDraft.value === "none" || conditionDraft.value === "not_configured"
                        ? "Not configured"
                        : conditionDraft.value === "true"
                          ? "True"
                          : "False"}
                    </span>
                  )}
                </div>
              )}
            </div>
          ))}

          {preview && (
            <AssistantPreviewCard
              title={preview.title}
              lines={preview.lines}
              onApply={preview.onApply}
              onCancel={() => setPreview(null)}
              onEdit={() => {
                setPreview(null);
                setStep("condition_relationship");
                pushAssistant(
                  makeMessage("assistant", "Select a relationship condition:", {
                    options: RELATIONSHIP_OPTIONS.map((r) => ({
                      id: r.value,
                      label: r.label,
                      value: r.value,
                    })),
                  }),
                );
              }}
            />
          )}

          {lastAction && (
            <div className="flex items-center justify-between rounded-lg border border-[var(--border)] bg-white px-3 py-2">
              <span className="text-[11px] text-[var(--muted-fg)]">{lastAction.description}</span>
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  disabled={!canU}
                  onClick={() => undo()}
                  className="inline-flex h-6 items-center gap-1 rounded px-2 text-[10.5px] font-medium text-[#eb5424] hover:bg-[#eb5424]/5 disabled:opacity-40"
                >
                  <Undo2 className="h-3 w-3" />
                  Undo
                </button>
                <button
                  type="button"
                  disabled={!canR}
                  onClick={() => redo()}
                  className="inline-flex h-6 items-center gap-1 rounded px-2 text-[10.5px] font-medium text-[var(--muted-fg)] hover:bg-[var(--muted)] disabled:opacity-40"
                >
                  <RotateCw className="h-3 w-3" />
                  Redo
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      <InsertTargetBar
        nodes={nodes}
        target={activeTarget}
        onChangeClick={showPickLocation}
        onReset={() => setAssistantInsertTarget(null)}
      />

      <QuickActionBar onAction={handleQuickAction} />
    </div>
  );
}
