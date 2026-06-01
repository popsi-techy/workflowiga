"use client";

import { useMemo, useState } from "react";
import { Mail, UsersRound, UserRound, Variable } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { useWorkflowStore } from "@/lib/workflow/store";
import {
  GOVERNANCE_GROUPS,
  USERS,
  getGovernanceGroup,
  getUser,
  getCustomApproverAttr,
} from "@/lib/workflow/mock-data";
import { SectionCard } from "./SectionCard";
import { ChannelsField } from "./ChannelsField";
import {
  CustomApproverDrawer,
  customApproverSummary,
} from "./CustomApproverDrawer";
import { EntityPickerDrawer, type PickerItem } from "./EntityPickerDrawer";
import { DecisionOutcomesEmpty, DecisionOutcomesSection, ApprovalSlaSection } from "./ApprovalOutcomes";
import { ApprovalLevelCompletionSection } from "./ApprovalLevelCompletionSection";
import {
  buildApprovalDecisionEmbedded,
  DEFAULT_APPROVAL_SLA_DURATION,
  DEFAULT_APPROVAL_SLA_TIMEOUT,
  NO_ACTION_OUTCOME,
} from "@/lib/workflow/approval-decision";
import { addOutcomeRoute, separableOutcomes } from "@/lib/workflow/decision-outcomes";
import { levelIsInMultisplitBranch } from "@/lib/workflow/multisplit-decision";
import {
  ConfigBody,
  ConfigField,
  ConfigInset,
  ConfigRow,
  ConfigSection,
  ConfigSelect,
  InheritedNote,
  InlineToggle,
} from "./config-layout";
import { Switch } from "../Switch";
import type {
  ApprovalLevelData,
  ApproverType,
  FallbackType,
  WorkflowNode,
  AnyTaskData,
  ApprovalSplitData,
  NotificationChannel,
} from "@/lib/workflow/types";

const APPROVER_TYPES: ApproverType[] = [
  "Manager",
  "Owner",
  "Governance Group",
  "User",
  "Custom attribute",
];

const FALLBACK_TYPES: FallbackType[] = ["Skip", "Block", "Add fallback email"];

// Approver types that pick concrete entities from a list.
const ENTITY_APPROVERS: ApproverType[] = ["Governance Group", "User"];

type DrawerKey = "approver" | "fallback" | "customAttr" | null;

export function ApprovalLevelConfig({ node }: { node: WorkflowNode }) {
  const data = node.data as ApprovalLevelData & {
    overrideFallback?: boolean;
    overrideSla?: boolean;
    embeddedConditional?: import("@/lib/workflow/types").EmbeddedConditionalData;
  };
  const hasInlineDecision = !!data.embeddedConditional?.decisionKind;
  const updateNode = useWorkflowStore((s) => s.updateNode);
  const addDecisionForAction = useWorkflowStore((s) => s.addDecisionForAction);
  const decisionExists = useWorkflowStore((s) =>
    data.decisionNodeId
      ? s.nodes.some((n) => n.id === data.decisionNodeId)
      : false,
  );
  const isTopLevelNode = useWorkflowStore((s) =>
    s.nodes.some((n) => n.id === node.id),
  );
  const inMultisplitBranch = useWorkflowStore((s) =>
    levelIsInMultisplitBranch(s.nodes, node.id),
  );
  const [drawer, setDrawer] = useState<DrawerKey>(null);

  const parentMultisplitNode = useWorkflowStore((s) => {
    return s.nodes.find((n) => {
      if (n.kind !== "task") return false;
      if ((n.data as AnyTaskData).taskType !== "approval_split") return false;
      const splitData = n.data as ApprovalSplitData;
      return splitData.branches.some((b) =>
        b.levels.some((l) => l.id === node.id),
      );
    });
  });
  const parentMultisplitData = parentMultisplitNode?.data as
    | ApprovalSplitData
    | undefined;

  function patch(fields: Partial<ApprovalLevelData>) {
    updateNode(node.id, fields as Partial<ApprovalLevelData>);
  }

  function maybeEnableSla(outcome: string) {
    if (outcome !== NO_ACTION_OUTCOME) return;
    patch({
      slaEnabled: true,
      slaDuration: data.slaDuration || DEFAULT_APPROVAL_SLA_DURATION,
      slaDurationUnit: data.slaDurationUnit ?? "hours",
      slaTimeoutAction: DEFAULT_APPROVAL_SLA_TIMEOUT,
    });
  }

  function handleAddOutcome(outcome: string) {
    maybeEnableSla(outcome);
    if (isTopLevelNode) {
      const decisionId = addDecisionForAction(node.id);
      if (!decisionId) return;
      const dnode = useWorkflowStore
        .getState()
        .nodes.find((n) => n.id === decisionId);
      if (!dnode) return;
      const ddata = dnode.data as import("@/lib/workflow/types").ConditionalBranchData;
      if (separableOutcomes(ddata).includes(outcome)) {
        updateNode(decisionId, addOutcomeRoute(ddata, outcome));
      }
      return;
    }
    let emb = buildApprovalDecisionEmbedded(node.id, data.name);
    if (separableOutcomes(emb).includes(outcome)) {
      emb = addOutcomeRoute(emb, outcome);
    }
    updateNode(node.id, {
      embeddedConditional: emb,
    } as Partial<WorkflowNode["data"]>);
  }

  const isEntityApprover = ENTITY_APPROVERS.includes(
    data.approverType as ApproverType,
  );
  const isCustomAttr = data.approverType === "Custom attribute";
  const approverRefs = data.approverRefs ?? [];
  const fallbackUsers = data.fallbackUsers ?? [];

  // For "Custom attribute", a single resolvable attribute is stored in approverRefs[0].
  const customAttrId = isCustomAttr ? approverRefs[0] ?? "" : "";
  const customAttrSummary = isCustomAttr
    ? customApproverSummary(customAttrId, data.approverRule)
    : null;

  // Picker items for the current entity approver type.
  const approverMeta = useMemo<{
    items: PickerItem[];
    icon: LucideIcon;
    noun: string;
  }>(() => {
    switch (data.approverType) {
      case "Governance Group":
        return {
          icon: UsersRound,
          noun: "governance group",
          items: GOVERNANCE_GROUPS.map((g) => ({
            id: g.id,
            primary: g.name,
            secondary: g.description,
            meta: `${g.members} members`,
            color: "#6366F1",
          })),
        };
      case "User":
        return {
          icon: UserRound,
          noun: "user",
          items: USERS.map((u) => ({
            id: u.id,
            primary: u.name,
            secondary: u.email,
            meta: u.title,
            color: "#0EA5E9",
          })),
        };
      default:
        return { icon: UserRound, noun: "approver", items: [] };
    }
  }, [data.approverType]);

  const userItems: PickerItem[] = useMemo(
    () =>
      USERS.map((u) => ({
        id: u.id,
        primary: u.name,
        secondary: u.email,
        meta: u.title,
        color: "#0EA5E9",
      })),
    [],
  );

  function refLabel(id: string): string {
    return (
      getGovernanceGroup(id)?.name ??
      getUser(id)?.name ??
      getCustomApproverAttr(id)?.label ??
      id
    );
  }
  const approverSummary =
    approverRefs.length > 0
      ? approverRefs.map(refLabel).join(", ")
      : null;
  const fallbackSummary =
    fallbackUsers.length > 0
      ? fallbackUsers.map((id) => getUser(id)?.name ?? id).join(", ")
      : null;

  const fallbackActive = !inMultisplitBranch || data.overrideFallback;

  return (
    <div className="flex h-full flex-col">
      <ConfigBody>
        <ConfigSection title="Approver" subtitle="Who signs off at this level">
          <ConfigSelect
            id={`approver-type-${node.id}`}
            value={data.approverType}
            placeholder="Select approver type"
            options={APPROVER_TYPES}
            onChange={(v) =>
              patch({
                approverType: v as ApproverType | "",
                approverRefs: [],
              })
            }
          />

          {isEntityApprover && (
            <SectionCard
              category="tasks"
              icon={approverMeta.icon}
              title={`Select ${data.approverType}`}
              description={`Pick the ${approverMeta.noun}(s) who will approve`}
              summary={approverSummary}
              count={approverRefs.length}
              onClick={() => setDrawer("approver")}
            />
          )}
          {isCustomAttr && (
            <SectionCard
              category="tasks"
              icon={Variable}
              title="Resolve approver from"
              description="Pick which request attribute determines who approves"
              summary={customAttrSummary}
              configured={!!customAttrId}
              onClick={() => setDrawer("customAttr")}
            />
          )}
        </ConfigSection>

        <ConfigInset>
          <ConfigRow
            label="New request alert"
            hint="Email or Slack when a request is assigned to this approver"
            action={
              <Switch
                id={`notify-assign-${node.id}`}
                aria-label="Notify approver on assignment"
                enabled={!!data.notifyApproverOnAssignment}
                onChange={(v) =>
                  patch({
                    notifyApproverOnAssignment: v,
                    assignmentNotifyChannels: v
                      ? data.assignmentNotifyChannels?.length
                        ? data.assignmentNotifyChannels
                        : ["email"]
                      : [],
                  })
                }
              />
            }
          >
            {data.notifyApproverOnAssignment && (
              <ChannelsField
                title="Configure assignment alert"
                value={{
                  channels: data.assignmentNotifyChannels ?? [],
                  slackMessage: data.slackMessage,
                  emailMessage: data.emailMessage,
                }}
                onChange={(fields) =>
                  patch({
                    assignmentNotifyChannels:
                      fields.channels as NotificationChannel[],
                    slackMessage: fields.slackMessage,
                    emailMessage: fields.emailMessage,
                  })
                }
              />
            )}
          </ConfigRow>
        </ConfigInset>

        <ApprovalLevelCompletionSection
          levelId={node.id}
          data={data}
          onPatch={patch}
        />

        {/* ── Fallback ───────────────────────────────────────────────── */}
        <ConfigSection
          title="Fallback Settings"
          subtitle="What happens if the approver is unavailable"
          action={
            inMultisplitBranch ? (
              <InlineToggle
                label="Override"
                id={`override-fallback-${node.id}`}
                enabled={!!data.overrideFallback}
                onChange={(v) => patch({ overrideFallback: v })}
              />
            ) : undefined
          }
        >
          {fallbackActive ? (
            <>
              <ConfigField label="Fallback type" required>
                <ConfigSelect
                  id={`fallback-type-${node.id}`}
                  value={data.fallbackType}
                  placeholder="Select fallback type"
                  options={FALLBACK_TYPES}
                  onChange={(v) =>
                    patch({
                      fallbackType: v as FallbackType | "",
                      ...(v !== "Add fallback email" ? { fallbackUsers: [] } : {}),
                    })
                  }
                />
              </ConfigField>

              {data.fallbackType === "Add fallback email" && (
                <SectionCard
                  category="tasks"
                  icon={Mail}
                  title="Select fallback approvers"
                  description="Users notified if the primary approver is unavailable"
                  summary={fallbackSummary}
                  count={fallbackUsers.length}
                  onClick={() => setDrawer("fallback")}
                />
              )}
            </>
          ) : (
            <InheritedNote
              label="Fallback type"
              value={
                parentMultisplitData?.globalFallbackType || "No global fallback set"
              }
            />
          )}
        </ConfigSection>

        {inMultisplitBranch ? (
          <ApprovalSlaSection levelId={node.id} data={data} onPatch={patch} />
        ) : (
          <>
            <ApprovalSlaSection
              levelId={node.id}
              data={data}
              onPatch={patch}
              variant="standalone"
            />
            {data.decisionNodeId && decisionExists && (
              <DecisionOutcomesSection decisionNodeId={data.decisionNodeId} />
            )}
            {!data.decisionNodeId && hasInlineDecision && (
              <DecisionOutcomesSection hostLevelId={node.id} />
            )}
            {!(data.decisionNodeId && decisionExists) && !hasInlineDecision && (
              <DecisionOutcomesEmpty
                decisionKind="approval"
                onAddOutcome={handleAddOutcome}
              />
            )}
          </>
        )}
      </ConfigBody>

      {/* ── Drawers ──────────────────────────────────────────────────── */}
      <EntityPickerDrawer
        open={drawer === "approver"}
        onClose={() => setDrawer(null)}
        title={`Select ${data.approverType || "Approver"}`}
        description={`Choose who approves at this level`}
        icon={approverMeta.icon}
        items={approverMeta.items}
        selectedIds={approverRefs}
        onChange={(ids) => patch({ approverRefs: ids })}
        searchPlaceholder={`Search ${approverMeta.noun}s…`}
      />

      <EntityPickerDrawer
        open={drawer === "fallback"}
        onClose={() => setDrawer(null)}
        title="Select fallback approvers"
        description="Notified if the primary approver is unavailable"
        icon={Mail}
        items={userItems}
        selectedIds={fallbackUsers}
        onChange={(ids) => patch({ fallbackUsers: ids })}
        searchPlaceholder="Search users…"
      />

      <CustomApproverDrawer
        open={drawer === "customAttr"}
        onClose={() => setDrawer(null)}
        selectedAttrId={customAttrId}
        approverRule={data.approverRule}
        onChange={(attrId, rule) =>
          patch({
            approverRefs: attrId ? [attrId] : [],
            approverRule: rule,
          })
        }
      />
    </div>
  );
}

