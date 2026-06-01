"use client";

import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import type {
  ApprovalLevelConfig,
  ApprovalLevelData,
  ApprovalSplitData,
  ConditionalBranchData,
  ApprovalPolicyData,
  AnyTaskData,
  SodCheckData,
  EventData,
  FilterData,
  NodeKind,
  Snapshot,
  TaskData,
  ViewMode,
  WorkflowNode,
  WorkflowVersion,
  EditorContext,
  Policy,
  PolicyType,
  PolicyStatus,
  AppScreen,
} from "./types";
import { computeStatus, defaultData, defaultApprovalLevel, defaultApprovalSplit, defaultConditionalBranch, defaultApprovalPolicyRef, defaultExit, defaultSkip, defaultNotification, defaultSodCheck, defaultApprovalLevelConfig, uid } from "./defaults";
import { ensureApprovalPolicyEvent, APPROVAL_POLICY_EVENT_NAME } from "./approval-policy";
import { inferRoutingAttributeIds } from "./conditional-routing";
import { syncApprovalSplitAttributes } from "./split-by-attribute";
import {
  migrateActionDecisionNodes,
  migratePolicyActionDecisions,
  ACTION_DECISION_SEED_POLICY_IDS,
} from "./action-decision-migrate";
import {
  migrateConditionalBranchNodes,
  migratePolicyConditionalBranches,
} from "./conditional-branch-migrate";
import {
  migrateMultisplitDecisionNodes,
  migratePolicyMultisplitDecisions,
} from "./multisplit-decision-migrate";
import {
  buildApprovalDecisionData,
  buildApprovalDecisionEmbedded,
  DEFAULT_APPROVAL_SLA_DURATION,
  DEFAULT_APPROVAL_SLA_TIMEOUT,
} from "./approval-decision";
import { buildSodDecisionData, buildSodDecisionEmbedded } from "./sod-decision";
import { migrateWorkflowNotificationAudiences } from "./notification-audience";
import { buildManagerOwnerAccessApprovalNodes } from "./approval-flow-seed";
import { normalizeWorkflowNodes } from "./workflow-node-order";
import {
  buildJoinerHighRiskWorkflowNodes,
  buildSodDualApprovalNodes,
  POL_AP_SOD_DUAL,
  POL_WF_JOINER_HIGH_RISK,
} from "./sod-policy-seeds";
import {
  buildSodInternRiskViolationPolicyNodes,
  POL_AP_SOD_INTERN_RISK,
} from "./sod-violation-policy-seed";
import userSeedPoliciesRaw from "./user-seeds.json";
import {
  insertIntoBranches,
  insertIntoEmbeddedBranches,
  patchBranchesLevels,
  patchEmbeddedConditional,
} from "./branch-level-patch";
import {
  branchParentIsMultisplit,
  buildMultisplitDecisionNode,
  getParentBranchLevels,
  syncNestedMultisplitDecisions,
  withSyncedMultisplitDecisions,
} from "./multisplit-decision";

const CURRENT_USER = "Aman Kumar";

type RightPanelView = "config" | "versions";

function seedVersions(): WorkflowVersion[] {
  // Two demo versions so the Versions drawer has content out of the box.
  const v1Nodes: WorkflowNode[] = [
    {
      id: "seed_v1_filter",
      kind: "filter",
      data: {
        logic: "AND",
        conditions: [
          {
            id: "seed_v1_c1",
            attribute: "department",
            operator: "equals",
            value: "Engineering",
          },
        ],
      },
      status: "configured",
    },
    {
      id: "seed_v1_event",
      kind: "event",
      data: { type: "joiner", description: "" },
      status: "configured",
    },
    {
      id: "seed_v1_task",
      kind: "task",
      data: {
        name: "Assign Entities",
        appIds: ["app_github", "app_slack"],
        entitlementIds: ["ent_gh_1"],
        techRoleIds: [],
        businessRoleIds: ["br_1"],
        criteria: { logic: "AND", conditions: [] },
      },
      status: "configured",
    },
  ];
  const v2Nodes: WorkflowNode[] = [
    {
      id: "seed_v2_event",
      kind: "event",
      data: { type: "joiner", description: "" },
      status: "configured",
    },
    {
      id: "seed_v2_task",
      kind: "task",
      data: {
        name: "Assign Entities",
        appIds: ["app_github"],
        entitlementIds: [],
        techRoleIds: [],
        businessRoleIds: [],
        criteria: { logic: "AND", conditions: [] },
      },
      status: "configured",
    },
  ];
  return [
    {
      id: "seed_v_active",
      name: "Version 2",
      createdAt: "2026-05-10T09:23:00.000Z",
      createdBy: "Priya Mehta",
      isActive: true,
      nodes: v1Nodes,
    },
    {
      id: "seed_v_1",
      name: "Version 1",
      createdAt: "2026-04-22T14:18:00.000Z",
      createdBy: CURRENT_USER,
      isActive: false,
      nodes: v2Nodes,
    },
  ];
}

function seedPolicies(): Policy[] {
  const t = (iso: string) => iso;
  const wfNodes = (apps: string[]): WorkflowNode[] => [
    { id: uid("event"), kind: "event", data: { type: "joiner", description: "" }, status: "configured" },
    {
      id: uid("task"),
      kind: "task",
      data: {
        name: "Assign Entities",
        appIds: apps,
        entitlementIds: [],
        techRoleIds: [],
        businessRoleIds: [],
        criteria: { logic: "AND", conditions: [] },
      } as TaskData,
      status: "configured",
    },
  ];

  // Approval policy baseline: a conditional branch chooses App Owner or Skip
  // depending on whether the requester already has baseline app access.
  const ownerOrSkipConditionalNodes = (): WorkflowNode[] => {
    const appOwnerLevel = {
      ...defaultApprovalLevelConfig(),
      blockType: "approval_level" as const,
      approverType: "Owner" as const,
      fallbackType: "Block" as const,
    };
    const skipLevel = {
      ...defaultApprovalLevelConfig(),
      blockType: "skip" as const,
    };
    return [
      { id: uid("event"), kind: "event", data: { type: "approval_policy", name: APPROVAL_POLICY_EVENT_NAME, description: "" } as ApprovalPolicyData, status: "configured" },
      {
        id: uid("task"),
        kind: "task",
        data: {
          ...defaultConditionalBranch(),
          name: "Baseline access?",
          routingAttributes: ["has_baseline_access"],
          globalFallbackType: "Block",
          branches: [
            {
              id: uid("br"),
              name: "Needs owner approval",
              levels: [appOwnerLevel],
              condition: {
                logic: "AND",
                conditions: [
                  { id: uid("c"), attribute: "has_baseline_access", operator: "equals", value: "No" },
                ],
              },
            },
            {
              id: uid("br"),
              name: "Already has app access",
              levels: [skipLevel],
              condition: {
                logic: "AND",
                conditions: [
                  { id: uid("c"), attribute: "has_baseline_access", operator: "equals", value: "Yes" },
                ],
              },
            },
          ],
        },
        status: "configured",
      },
    ];
  };
  return [
    {
      id: "pol_ap_access_notify",
      name: "Entitlement Access — Manager & Owner (Active)",
      type: "approval",
      status: "active",
      nodes: buildManagerOwnerAccessApprovalNodes(),
      createdAt: t("2026-05-20T08:00:00.000Z"),
      updatedAt: t("2026-05-28T14:00:00.000Z"),
    },
    {
      id: "pol_ap_entitlement_skip",
      name: "Entitlement Request — Owner or Skip",
      type: "approval",
      status: "active",
      nodes: ownerOrSkipConditionalNodes(),
      createdAt: t("2026-04-10T09:00:00.000Z"),
      updatedAt: t("2026-05-24T15:10:00.000Z"),
    },
    {
      id: POL_AP_SOD_DUAL,
      name: "SoD Pre-check — Manager & Owner (Parallel)",
      type: "approval",
      status: "active",
      nodes: buildSodDualApprovalNodes(),
      createdAt: t("2026-05-28T10:00:00.000Z"),
      updatedAt: t("2026-05-28T16:00:00.000Z"),
    },
    {
      id: POL_AP_SOD_INTERN_RISK,
      name: "SoD Violation — Intern High-Risk",
      type: "approval",
      status: "active",
      nodes: buildSodInternRiskViolationPolicyNodes(),
      createdAt: t("2026-05-29T08:00:00.000Z"),
      updatedAt: t("2026-05-29T08:00:00.000Z"),
    },

    {
      id: POL_WF_JOINER_HIGH_RISK,
      name: "Joiner — High-Risk Provisioning",
      type: "workflow",
      status: "active",
      nodes: buildJoinerHighRiskWorkflowNodes(),
      createdAt: t("2026-05-28T10:30:00.000Z"),
      updatedAt: t("2026-06-01T12:00:00.000Z"),
    },
    {
      id: "pol_wf_eng",
      name: "Engineering Joiner Provisioning",
      type: "workflow",
      status: "active",
      nodes: wfNodes(["app_github", "app_slack"]),
      createdAt: t("2026-04-18T10:00:00.000Z"),
      updatedAt: t("2026-05-12T16:30:00.000Z"),
    },
    {
      id: "pol_wf_contractor",
      name: "Contractor Onboarding",
      type: "workflow",
      status: "draft",
      nodes: wfNodes(["app_slack"]),
      createdAt: t("2026-05-02T09:10:00.000Z"),
      updatedAt: t("2026-05-20T11:05:00.000Z"),
    },
    {
      id: "pol_ap_finance",
      name: "Finance High-Value Approval",
      type: "approval",
      status: "active",
      nodes: ownerOrSkipConditionalNodes(),
      createdAt: t("2026-03-30T08:45:00.000Z"),
      updatedAt: t("2026-05-15T14:20:00.000Z"),
    },
    {
      id: "pol_ap_standard",
      name: "Standard Access Approval",
      type: "approval",
      status: "draft",
      nodes: ownerOrSkipConditionalNodes(),
      createdAt: t("2026-05-05T13:00:00.000Z"),
      updatedAt: t("2026-05-22T10:40:00.000Z"),
    },
    // User-pinned seeds (written by the "Pin to seed" button in the editor).
    ...(userSeedPoliciesRaw as Policy[]).filter(
      (u) => !builtinIds.has(u.id),
    ),
  ];
}

/** Ids of the built-in TypeScript seeds — used to skip duplicates in user-seeds.json. */
const builtinIds = new Set([
  "pol_ap_access_notify",
  "pol_ap_entitlement_skip",
  POL_AP_SOD_DUAL,
  POL_AP_SOD_INTERN_RISK,
  POL_WF_JOINER_HIGH_RISK,
  "pol_wf_eng",
  "pol_wf_contractor",
  "pol_ap_finance",
  "pol_ap_standard",
]);

type PresetData =
  | Partial<EventData>
  | Partial<FilterData>
  | Partial<TaskData>
  | Partial<AnyTaskData>
  | Partial<ApprovalPolicyData>
  | Partial<ApprovalLevelData>
  | Partial<ApprovalSplitData>;

const HISTORY_LIMIT = 50;

interface State {
  nodes: WorkflowNode[];
  selectedId: string | null;
  draggingKind: NodeKind | null;
  /** Registered by Canvas — used to scroll the workflow viewport. */
  canvasScrollFn: ((dx: number, dy: number) => void) | null;
  rightPanelOpen: boolean;
  rightPanelView: RightPanelView;
  leftPanelCollapsed: boolean;
  mainNavCollapsed: boolean;
  view: ViewMode;
  zoom: number;
  history: { past: Snapshot[]; future: Snapshot[] };
  toast: { id: string; message: string; tone: "default" | "success" | "error" } | null;
  versions: WorkflowVersion[];
  confirm: ConfirmRequest | null;
  tour: { active: boolean; step: number };
  editorContext: EditorContext;
  /** All saved policies (both workflow and approval). */
  policies: Policy[];
  /** Id of the policy currently loaded in the editor. */
  currentPolicyId: string | null;
  /** Which shell screen is showing — the policy table or the editor. */
  screen: AppScreen;
  /** Which table the list screen shows. */
  listType: PolicyType;
}

export interface ConfirmRequest {
  id: string;
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  tone?: "default" | "danger";
  onConfirm: () => void;
}

interface Actions {
  insertNode: (kind: NodeKind, index: number, preset?: PresetData) => string | null;
  insertNodeIntoBranch: (
    nodeId: string,
    branchId: string,
    index: number,
    preset?: Partial<ApprovalLevelConfig>,
    embeddedHostLevelId?: string,
  ) => void;
  removeNode: (id: string) => void;
  /** (Re)create and link a decision block immediately below an approval /
   *  SoD action node. No-op if the node isn't a top-level action. Returns the
   *  new decision node id (or null). */
  addDecisionForAction: (actionId: string) => string | null;
  selectNode: (id: string | null) => void;
  updateNode: (id: string, data: Partial<WorkflowNode["data"]>) => void;
  setDraggingKind: (k: NodeKind | null) => void;
  setCanvasScrollFn: (fn: ((dx: number, dy: number) => void) | null) => void;
  nudgeCanvasScroll: (dx: number, dy: number) => void;
  toggleLeftPanel: () => void;
  toggleMainNav: () => void;
  setRightPanelOpen: (open: boolean) => void;
  setRightPanelView: (v: RightPanelView) => void;
  openVersions: () => void;
  setView: (v: ViewMode) => void;
  setZoom: (z: number) => void;
  undo: () => void;
  redo: () => void;
  resetWorkflow: () => void;
  showToast: (message: string, tone?: "default" | "success" | "error") => void;
  clearToast: () => void;
  saveAsNewVersion: (options?: { activate?: boolean }) => WorkflowVersion;
  loadVersion: (id: string) => void;
  activateVersion: (id: string) => void;
  requestConfirm: (req: Omit<ConfirmRequest, "id">) => void;
  closeConfirm: () => void;
  startTour: () => void;
  nextTourStep: () => void;
  prevTourStep: () => void;
  endTour: () => void;
  setEditorContext: (ctx: EditorContext) => void;
  // ── Policy management ──────────────────────────────────────────────
  /** Show the policy table for a given type (commits any open editor first). */
  goToList: (type: PolicyType) => void;
  /** Create a new (auto-named) policy and open it in the editor. */
  createPolicy: (type: PolicyType) => string;
  /** Load an existing policy into the editor. */
  openPolicy: (id: string) => void;
  /** Rename the policy currently open in the editor. */
  renameCurrentPolicy: (name: string) => void;
  /** Delete a policy from its table. */
  deletePolicy: (id: string) => void;
  /** Set a policy's status (activate / deactivate) by id. */
  setPolicyStatus: (id: string, status: PolicyStatus) => void;
  /** Write the working canvas back into the current policy (optionally set status). */
  commitCurrentPolicy: (status?: PolicyStatus) => void;
  /** Align store state to a URL (used on initial load and back/forward nav). */
  syncFromRoute: (route: { screen: AppScreen; type: PolicyType; policyId?: string }) => void;
}

export type WorkflowStore = State & Actions;

const initialState: State = {
  nodes: [],
  selectedId: null,
  draggingKind: null,
  canvasScrollFn: null,
  rightPanelOpen: false,
  rightPanelView: "config",
  leftPanelCollapsed: false,
  mainNavCollapsed: true,
  view: "outline",
  zoom: 1,
  history: { past: [], future: [] },
  toast: null,
  versions: seedVersions(),
  confirm: null,
  tour: { active: false, step: 0 },
  editorContext: "workflow",
  policies: seedPolicies(),
  currentPolicyId: null,
  screen: "list",
  listType: "workflow",
};

const TOUR_SEEN_KEY = "iam-workflow-tour-seen";

function nextVersionName(versions: WorkflowVersion[]): string {
  // Highest existing numeric suffix + 1; fall back to count + 1.
  let max = 0;
  for (const v of versions) {
    const m = /Version\s+(\d+)/i.exec(v.name);
    if (m) max = Math.max(max, parseInt(m[1], 10));
  }
  return `Version ${max + 1}`;
}

function snapshot(nodes: WorkflowNode[]): Snapshot {
  return { nodes: JSON.parse(JSON.stringify(nodes)) };
}

function nextPolicyName(policies: Policy[], type: PolicyType): string {
  const base = type === "approval" ? "Approval Policy" : "Workflow Policy";
  let max = 0;
  for (const p of policies) {
    if (p.type !== type) continue;
    const m = new RegExp(`${base}\\s+(\\d+)`, "i").exec(p.name);
    if (m) max = Math.max(max, parseInt(m[1], 10));
  }
  return `${base} ${max + 1}`;
}

/** Returns a copy of `policies` with the current policy's nodes synced from the
 *  working canvas (plus an optional patch). No-op when no policy is open. */
function syncPolicies(
  policies: Policy[],
  currentPolicyId: string | null,
  nodes: WorkflowNode[],
  patch?: Partial<Policy>,
): Policy[] {
  if (!currentPolicyId) return policies;
  return policies.map((p) =>
    p.id === currentPolicyId
      ? {
          ...p,
          nodes: JSON.parse(
            JSON.stringify(
              p.type === "workflow" ? normalizeWorkflowNodes(nodes) : nodes,
            ),
          ) as WorkflowNode[],
          updatedAt: new Date().toISOString(),
          ...(patch ?? {}),
        }
      : p,
  );
}

function pushHistory(state: State): State["history"] {
  const past = [...state.history.past, snapshot(state.nodes)].slice(-HISTORY_LIMIT);
  return { past, future: [] };
}

export const useWorkflowStore = create<WorkflowStore>()(
  persist(
    (set, get) => ({
      ...initialState,

      insertNode: (kind, index, preset) => {
        const id = uid(kind);
        const base = defaultData(kind);
        let data: WorkflowNode["data"];
        const presetType = preset && (preset as { type?: string; taskType?: string });
        if (presetType?.type === "approval_policy") {
          data = { type: "approval_policy", name: APPROVAL_POLICY_EVENT_NAME, description: "" } as ApprovalPolicyData;
        } else if (presetType?.taskType === "approval_level") {
          data = defaultApprovalLevel();
        } else if (presetType?.taskType === "approval_split") {
          data = defaultApprovalSplit();
        } else if (presetType?.taskType === "conditional_branch") {
          data = defaultConditionalBranch();
        } else if (presetType?.taskType === "approval_policy_ref") {
          data = defaultApprovalPolicyRef();
        } else if (presetType?.taskType === "exit") {
          data = defaultExit();
        } else if (presetType?.taskType === "skip") {
          data = defaultSkip();
        } else if (presetType?.taskType === "notification") {
          data = defaultNotification();
        } else if (presetType?.taskType === "sod_check") {
          data = defaultSodCheck();
        } else {
          data = preset
            ? ({ ...(base as object), ...(preset as object) } as WorkflowNode["data"])
            : base;
        }
        const node: WorkflowNode = {
          id,
          kind,
          data,
          status: "incomplete",
        };
        const state = get();

        // Action → Decision: an approval level / SoD check auto-creates a linked
        // conditional decision block immediately below it that routes its outcome.
        let decisionNode: WorkflowNode | null = null;
        if (state.editorContext === "approval") {
          if (presetType?.taskType === "approval_level") {
            const decisionId = uid("task");
            (node.data as ApprovalLevelData).decisionNodeId = decisionId;
            decisionNode = {
              id: decisionId,
              kind: "task",
              data: buildApprovalDecisionData(id),
              status: "incomplete",
            };
            decisionNode.status = computeStatus(decisionNode);
          } else if (presetType?.taskType === "sod_check") {
            const decisionId = uid("task");
            (node.data as SodCheckData).decisionNodeId = decisionId;
            decisionNode = {
              id: decisionId,
              kind: "task",
              data: buildSodDecisionData(id),
              status: "incomplete",
            };
            decisionNode.status = computeStatus(decisionNode);
          } else if (presetType?.taskType === "approval_split") {
            // A multisplit of parallel approvers behaves like an action: a
            // single combined outcome decision sits directly below it.
            decisionNode = buildMultisplitDecisionNode(
              id,
              (node.data as ApprovalSplitData).name,
            );
            (node.data as ApprovalSplitData).decisionNodeId = decisionNode.id;
            decisionNode.status = computeStatus(decisionNode);
          }
        }

        node.status = computeStatus(node);
        let nodes = [...state.nodes];
        nodes.splice(index, 0, node);
        if (decisionNode) nodes.splice(index + 1, 0, decisionNode);
        nodes = normalizeWorkflowNodes(nodes);
        set({
          nodes,
          selectedId: id,
          rightPanelOpen: true,
          rightPanelView: "config",
          history: pushHistory(state),
        });
        return id;
      },

      insertNodeIntoBranch: (
        nodeId,
        branchId,
        index,
        preset,
        embeddedHostLevelId,
      ) => {
        const state = get();
        // A multisplit branch holds exactly one approval level and nothing
        // else; its outcome is handled by the combined decision below the
        // whole multisplit (not inline inside the branch).
        const parentMultisplit =
          state.editorContext === "approval" &&
          branchParentIsMultisplit(state.nodes, nodeId, embeddedHostLevelId);
        if (parentMultisplit) {
          const blockType =
            (preset as Partial<ApprovalLevelConfig> | undefined)?.blockType ??
            "approval_level";
          if (blockType !== "approval_level") {
            get().showToast(
              "Multisplit branches can only contain an approval level.",
              "error",
            );
            return;
          }
          const existing = getParentBranchLevels(
            state.nodes,
            nodeId,
            branchId,
            embeddedHostLevelId,
          );
          if (existing && existing.length >= 1) {
            get().showToast(
              "Each multisplit branch allows only one approval level.",
              "error",
            );
            return;
          }
        }
        const createLevel = () => {
          const lvl: ApprovalLevelConfig = {
            ...defaultApprovalLevelConfig(),
            ...(preset as Partial<ApprovalLevelConfig>),
          };
          if (
            parentMultisplit &&
            (lvl.blockType === "approval_level" || !lvl.blockType)
          ) {
            lvl.slaEnabled = true;
            lvl.slaDuration = lvl.slaDuration || DEFAULT_APPROVAL_SLA_DURATION;
            lvl.slaDurationUnit = lvl.slaDurationUnit ?? "hours";
            lvl.slaTimeoutAction =
              lvl.slaTimeoutAction ?? DEFAULT_APPROVAL_SLA_TIMEOUT;
          }
          // Approval / SoD actions get an inline decision below them so their
          // outcomes route inside the branch — parity with the top level.
          // Multisplit branches are the exception: their outcome is combined
          // and rendered once, below the whole multisplit.
          if (!lvl.embeddedConditional && !parentMultisplit) {
            if (lvl.blockType === "approval_level") {
              lvl.embeddedConditional = buildApprovalDecisionEmbedded(lvl.id);
            } else if (lvl.blockType === "sod_check") {
              lvl.embeddedConditional = buildSodDecisionEmbedded(lvl.id);
            }
          }
          return lvl;
        };
        const nodes = state.nodes.map((n) => {
          if (n.id !== nodeId) return n;
          const splitData = n.data as ApprovalSplitData;
          let updatedBranches = splitData.branches;
          let inserted = false;
          if (embeddedHostLevelId) {
            const res = insertIntoEmbeddedBranches(
              splitData.branches,
              embeddedHostLevelId,
              branchId,
              index,
              preset as Partial<ApprovalLevelConfig>,
              createLevel,
            );
            updatedBranches = res.branches;
            inserted = res.inserted;
          } else {
            const res = insertIntoBranches(
              splitData.branches,
              branchId,
              index,
              preset as Partial<ApprovalLevelConfig>,
              createLevel,
            );
            updatedBranches = res.branches;
            inserted = res.inserted;
          }
          if (!inserted) return n;
          const synced =
            state.editorContext === "approval"
              ? syncNestedMultisplitDecisions(updatedBranches)
              : updatedBranches;
          const merged: WorkflowNode = {
            ...n,
            data: {
              ...splitData,
              branches: synced,
            },
          };
          merged.status = computeStatus(merged);
          return merged;
        });
        set({ nodes, history: pushHistory(state) });
      },

      removeNode: (id) => {
        const state = get();
        const removed = state.nodes.find((n) => n.id === id);
        // Remove a linked decision block alongside its action block.
        const removedType =
          removed?.kind === "task"
            ? (removed.data as AnyTaskData).taskType
            : undefined;
        const linkedDecisionId =
          removedType === "approval_level"
            ? (removed!.data as ApprovalLevelData).decisionNodeId
            : removedType === "sod_check"
              ? (removed!.data as SodCheckData).decisionNodeId
              : removedType === "approval_split"
                ? (removed!.data as ApprovalSplitData).decisionNodeId
                : undefined;
        // Removing a decision block directly: unlink it from its source action
        // so the action's config shows the "re-add outcomes" empty state.
        const unlinkActionId =
          removedType === "conditional_branch" &&
          (removed!.data as ConditionalBranchData).decisionKind
            ? (removed!.data as ConditionalBranchData).sourceActionId
            : undefined;
        let nodes = state.nodes.filter(
          (n) => n.id !== id && n.id !== linkedDecisionId,
        );
        if (unlinkActionId) {
          nodes = nodes.map((n) => {
            if (n.id !== unlinkActionId) return n;
            const data = { ...(n.data as object) } as {
              decisionNodeId?: string;
            };
            delete data.decisionNodeId;
            return { ...n, data: data as WorkflowNode["data"] };
          });
        }
        if (state.editorContext === "approval") {
          nodes = ensureApprovalPolicyEvent(nodes);
        }
        set({
          nodes,
          selectedId: state.selectedId === id ? null : state.selectedId,
          rightPanelOpen: state.selectedId === id ? false : state.rightPanelOpen,
          history: pushHistory(state),
        });
      },

      addDecisionForAction: (actionId) => {
        const state = get();
        const idx = state.nodes.findIndex((n) => n.id === actionId);
        if (idx < 0) return null;
        const action = state.nodes[idx]!;
        if (action.kind !== "task") return null;
        const tt = (action.data as AnyTaskData).taskType;
        let decisionData: ConditionalBranchData | null = null;
        if (tt === "approval_level") {
          decisionData = buildApprovalDecisionData(
            actionId,
            (action.data as ApprovalLevelData).name,
          );
        } else if (tt === "approval_split") {
          decisionData = buildApprovalDecisionData(
            actionId,
            (action.data as ApprovalSplitData).name,
          );
        } else if (tt === "sod_check") {
          decisionData = buildSodDecisionData(actionId);
        }
        if (!decisionData) return null;

        const decisionId = uid("task");
        const decisionNode: WorkflowNode = {
          id: decisionId,
          kind: "task",
          data: decisionData,
          status: "incomplete",
        };
        decisionNode.status = computeStatus(decisionNode);

        let nodes = state.nodes.map((n) =>
          n.id === actionId
            ? {
                ...n,
                data: {
                  ...(n.data as object),
                  decisionNodeId: decisionId,
                } as WorkflowNode["data"],
              }
            : n,
        );
        nodes.splice(idx + 1, 0, decisionNode);
        nodes = normalizeWorkflowNodes(nodes);
        set({ nodes, history: pushHistory(state) });
        return decisionId;
      },

      selectNode: (id) =>
        set({
          selectedId: id,
          rightPanelOpen: id != null,
          rightPanelView: id != null ? "config" : get().rightPanelView,
        }),

      updateNode: (id, data) => {
        const state = get();
        let foundNested = false;
        const nextNodes = state.nodes.map((n) => {
          if (
            n.kind === "task" &&
            ((n.data as AnyTaskData).taskType === "approval_split" ||
              (n.data as AnyTaskData).taskType === "conditional_branch")
          ) {
            const splitData = n.data as ApprovalSplitData;
            const levelPatch = data as Partial<ApprovalLevelConfig>;
            if (levelPatch.embeddedConditional !== undefined) {
              const emb = patchEmbeddedConditional(
                splitData.branches,
                id,
                levelPatch.embeddedConditional,
              );
              if (emb.found) {
                foundNested = true;
                const merged: WorkflowNode = {
                  ...n,
                  data: { ...splitData, branches: emb.branches },
                };
                merged.status = computeStatus(merged);
                return merged;
              }
            }
            const patched = patchBranchesLevels(
              splitData.branches,
              id,
              data as Partial<ApprovalLevelConfig>,
            );
            if (patched.found) {
              foundNested = true;
              const merged: WorkflowNode = {
                ...n,
                data: { ...splitData, branches: patched.branches },
              };
              merged.status = computeStatus(merged);
              return merged;
            }
          }
          if (n.id !== id) return n;
          const merged: WorkflowNode = {
            ...n,
            data: { ...(n.data as object), ...(data as object) } as WorkflowNode["data"],
          };
          merged.status = computeStatus(merged);
          return merged;
        });
        // Keep each multisplit's combined decision in sync after a branch edit
        // (e.g. adding/removing a nested multisplit or an approval level).
        const syncedNodes =
          state.editorContext === "approval"
            ? nextNodes.map((n) => {
                const next = withSyncedMultisplitDecisions(n);
                if (next === n) return n;
                next.status = computeStatus(next);
                return next;
              })
            : nextNodes;
        set({ nodes: syncedNodes, history: pushHistory(state) });
      },

      setDraggingKind: (k) => set({ draggingKind: k }),
      setCanvasScrollFn: (fn) => set({ canvasScrollFn: fn }),
      nudgeCanvasScroll: (dx, dy) => {
        get().canvasScrollFn?.(dx, dy);
      },

      toggleLeftPanel: () =>
        set((s) => ({ leftPanelCollapsed: !s.leftPanelCollapsed })),

      toggleMainNav: () =>
        set((s) => ({ mainNavCollapsed: !s.mainNavCollapsed })),

      setRightPanelOpen: (open) => set({ rightPanelOpen: open }),

      setRightPanelView: (v) => set({ rightPanelView: v }),

      openVersions: () =>
        set({
          rightPanelOpen: true,
          rightPanelView: "versions",
          selectedId: null,
        }),

      saveAsNewVersion: ({ activate = false } = {}) => {
        const state = get();
        const name = nextVersionName(state.versions);
        const newVersion: WorkflowVersion = {
          id: uid("ver"),
          name,
          createdAt: new Date().toISOString(),
          createdBy: CURRENT_USER,
          isActive: activate,
          nodes: JSON.parse(JSON.stringify(state.nodes)) as WorkflowNode[],
        };
        const versions = activate
          ? [
              newVersion,
              ...state.versions.map((v) => ({ ...v, isActive: false })),
            ]
          : [newVersion, ...state.versions];
        set({ versions });
        return newVersion;
      },

      loadVersion: (id) => {
        const state = get();
        const v = state.versions.find((x) => x.id === id);
        if (!v) return;
        set({
          nodes: JSON.parse(JSON.stringify(v.nodes)) as WorkflowNode[],
          selectedId: null,
          history: pushHistory(state),
        });
      },

      activateVersion: (id) => {
        const state = get();
        const versions = state.versions.map((v) => ({
          ...v,
          isActive: v.id === id,
        }));
        set({ versions });
      },

      setView: (v) => set({ view: v }),

      setZoom: (z) => set({ zoom: Math.max(0.4, Math.min(2, z)) }),

      undo: () => {
        const state = get();
        const prev = state.history.past[state.history.past.length - 1];
        if (!prev) return;
        const past = state.history.past.slice(0, -1);
        const future = [snapshot(state.nodes), ...state.history.future].slice(0, HISTORY_LIMIT);
        set({ nodes: prev.nodes, history: { past, future } });
      },

      redo: () => {
        const state = get();
        const next = state.history.future[0];
        if (!next) return;
        const future = state.history.future.slice(1);
        const past = [...state.history.past, snapshot(state.nodes)].slice(-HISTORY_LIMIT);
        set({ nodes: next.nodes, history: { past, future } });
      },

      resetWorkflow: () => {
        const state = get();
        set({
          nodes: [],
          selectedId: null,
          rightPanelOpen: false,
          history: pushHistory(state),
        });
      },

      showToast: (message, tone = "default") =>
        set({ toast: { id: uid("toast"), message, tone } }),
      clearToast: () => set({ toast: null }),

      requestConfirm: (req) =>
        set({ confirm: { id: uid("confirm"), ...req } }),
      closeConfirm: () => set({ confirm: null }),

      startTour: () => set({ tour: { active: true, step: 0 } }),
      nextTourStep: () =>
        set((s) => ({ tour: { ...s.tour, step: s.tour.step + 1 } })),
      prevTourStep: () =>
        set((s) => ({
          tour: { ...s.tour, step: Math.max(0, s.tour.step - 1) },
        })),
      endTour: () => {
        if (typeof window !== "undefined") {
          try {
            localStorage.setItem(TOUR_SEEN_KEY, "1");
          } catch {}
        }
        set({ tour: { active: false, step: 0 } });
      },

      setEditorContext: (ctx) => {
        const state = get();
        if (state.editorContext === ctx) return;
        set({
          editorContext: ctx,
          nodes: [],
          selectedId: null,
          rightPanelOpen: false,
          history: { past: [], future: [] },
        });
      },

      goToList: (type) => {
        const state = get();
        set({
          policies: syncPolicies(state.policies, state.currentPolicyId, state.nodes),
          screen: "list",
          listType: type,
          currentPolicyId: null,
          nodes: [],
          selectedId: null,
          rightPanelOpen: false,
          history: { past: [], future: [] },
        });
      },

      createPolicy: (type) => {
        const state = get();
        const id = uid("pol");
        const now = new Date().toISOString();
        const committed = syncPolicies(state.policies, state.currentPolicyId, state.nodes);
        const initialNodes =
          type === "approval" ? ensureApprovalPolicyEvent([]) : [];
        const newPolicy: Policy = {
          id,
          name: nextPolicyName(committed, type),
          type,
          status: "draft",
          nodes: initialNodes,
          createdAt: now,
          updatedAt: now,
        };
        set({
          policies: [newPolicy, ...committed],
          currentPolicyId: id,
          editorContext: type,
          screen: "editor",
          nodes: JSON.parse(JSON.stringify(initialNodes)) as WorkflowNode[],
          selectedId: null,
          rightPanelOpen: false,
          history: { past: [], future: [] },
        });
        return id;
      },

      openPolicy: (id) => {
        const state = get();
        const committed = syncPolicies(state.policies, state.currentPolicyId, state.nodes);
        const target = committed.find((p) => p.id === id);
        if (!target) return;
        let nodes = JSON.parse(JSON.stringify(target.nodes)) as WorkflowNode[];
        if (target.type === "approval") {
          nodes = ensureApprovalPolicyEvent(nodes);
        } else {
          nodes = normalizeWorkflowNodes(nodes);
        }
        set({
          policies: committed,
          currentPolicyId: id,
          editorContext: target.type,
          screen: "editor",
          nodes,
          selectedId: null,
          rightPanelOpen: false,
          history: { past: [], future: [] },
        });
      },

      renameCurrentPolicy: (name) => {
        const state = get();
        if (!state.currentPolicyId) return;
        const clean = name.trim() || "Untitled Policy";
        set({
          policies: state.policies.map((p) =>
            p.id === state.currentPolicyId
              ? { ...p, name: clean, updatedAt: new Date().toISOString() }
              : p,
          ),
        });
      },

      deletePolicy: (id) => {
        const state = get();
        const policies = state.policies.filter((p) => p.id !== id);
        const isCurrent = state.currentPolicyId === id;
        set({
          policies,
          currentPolicyId: isCurrent ? null : state.currentPolicyId,
          ...(isCurrent
            ? { nodes: [], selectedId: null, rightPanelOpen: false }
            : {}),
        });
      },

      setPolicyStatus: (id, status) => {
        const state = get();
        set({
          policies: state.policies.map((p) =>
            p.id === id
              ? { ...p, status, updatedAt: new Date().toISOString() }
              : p,
          ),
        });
      },

      commitCurrentPolicy: (status) => {
        const state = get();
        set({
          policies: syncPolicies(
            state.policies,
            state.currentPolicyId,
            state.nodes,
            status ? { status } : undefined,
          ),
        });
      },

      syncFromRoute: ({ screen, type, policyId }) => {
        const state = get();
        if (screen === "list") {
          if (state.screen === "list" && state.listType === type) return;
          set({
            policies: syncPolicies(state.policies, state.currentPolicyId, state.nodes),
            screen: "list",
            listType: type,
            currentPolicyId: null,
            nodes: [],
            selectedId: null,
            rightPanelOpen: false,
            history: { past: [], future: [] },
          });
          return;
        }
        // editor — already on this policy, nothing to reload
        if (state.screen === "editor" && state.currentPolicyId === policyId) return;
        const committed = syncPolicies(state.policies, state.currentPolicyId, state.nodes);
        const target = policyId ? committed.find((p) => p.id === policyId) : undefined;
        if (!target) {
          // Unknown id → fall back to the matching table.
          set({
            policies: committed,
            screen: "list",
            listType: type,
            currentPolicyId: null,
            nodes: [],
            selectedId: null,
            rightPanelOpen: false,
            history: { past: [], future: [] },
          });
          return;
        }
        let routeNodes = JSON.parse(JSON.stringify(target.nodes)) as WorkflowNode[];
        if (target.type === "approval") {
          routeNodes = ensureApprovalPolicyEvent(routeNodes);
        } else {
          routeNodes = normalizeWorkflowNodes(routeNodes);
        }
        set({
          policies: committed,
          currentPolicyId: target.id,
          editorContext: target.type,
          screen: "editor",
          nodes: routeNodes,
          selectedId: null,
          rightPanelOpen: false,
          history: { past: [], future: [] },
        });
      },
    }),
    {
      name: "iam-workflow-draft",
      storage: createJSONStorage(() => sessionStorage),
      version: 23,
      migrate: (persisted, version) => {
        const state = persisted as Partial<State> | undefined;
        if (!state) return state as unknown as WorkflowStore;
        // v2: inject any seeded policies missing from older sessions.
        if (version < 2 && Array.isArray(state.policies)) {
          const existing = new Set(state.policies.map((p) => p.id));
          const missing = seedPolicies().filter((p) => !existing.has(p.id));
          if (missing.length) state.policies = [...missing, ...state.policies];
        }
        // v3-v5: keep seeded approval-policy demos aligned to the current
        // owner-or-skip conditional-branch pattern.
        if (version < 5 && Array.isArray(state.policies)) {
          const seeded = seedPolicies().filter((p) =>
            p.id === "pol_ap_access_notify" ||
            p.id === "pol_ap_entitlement_skip" ||
            p.id === "pol_ap_finance" ||
            p.id === "pol_ap_standard",
          );
          for (const fresh of seeded) {
            const idx = state.policies.findIndex((p) => p.id === fresh.id);
            if (idx >= 0) state.policies[idx] = fresh;
            else state.policies = [fresh, ...state.policies];
          }
        }
        const normalizeSplitNodes = (nodes: WorkflowNode[]) =>
          nodes.map((n) => {
            if (n.kind !== "task") return n;
            const tt = (n.data as AnyTaskData).taskType;
            if (tt !== "approval_split") return n;
            return {
              ...n,
              data: syncApprovalSplitAttributes(n.data as ApprovalSplitData),
            };
          });
        if (version < 6) {
          if (Array.isArray(state.nodes)) {
            state.nodes = normalizeSplitNodes(state.nodes);
          }
          if (Array.isArray(state.policies)) {
            state.policies = state.policies.map((p) => ({
              ...p,
              nodes: normalizeSplitNodes(p.nodes),
            }));
          }
        }
        const normalizeConditionalNodes = (nodes: WorkflowNode[]) =>
          nodes.map((n) => {
            if (n.kind !== "task") return n;
            const tt = (n.data as AnyTaskData).taskType;
            if (tt !== "conditional_branch") return n;
            const cd = n.data as ConditionalBranchData;
            if (cd.routingAttributes?.length) return n;
            const ids = inferRoutingAttributeIds(cd);
            if (!ids.length) return n;
            return {
              ...n,
              data: { ...cd, routingAttributes: ids },
            };
          });
        if (version < 7) {
          if (Array.isArray(state.nodes)) {
            state.nodes = normalizeConditionalNodes(state.nodes);
          }
          if (Array.isArray(state.policies)) {
            state.policies = state.policies.map((p) => ({
              ...p,
              nodes: normalizeConditionalNodes(p.nodes),
            }));
          }
        }
        if (version < 8 && Array.isArray(state.policies)) {
          const fresh = seedPolicies().find((p) => p.id === "pol_ap_access_notify");
          if (fresh && !state.policies.some((p) => p.id === fresh.id)) {
            state.policies = [fresh, ...state.policies];
          }
        }
        // v9: (re)inject manager → conditional → notify demo — sessions already on v8
        // skipped the policy when v8 first shipped without it.
        if (version < 9 && Array.isArray(state.policies)) {
          const fresh = seedPolicies().find((p) => p.id === "pol_ap_access_notify");
          if (fresh) {
            const idx = state.policies.findIndex((p) => p.id === fresh.id);
            if (idx >= 0) state.policies[idx] = fresh;
            else state.policies = [fresh, ...state.policies];
          }
        }
        if (version < 10 && Array.isArray(state.policies)) {
          state.policies = state.policies.map((p) =>
            p.type === "approval"
              ? { ...p, nodes: ensureApprovalPolicyEvent(p.nodes) }
              : p,
          );
        }
        if (version < 11) {
          if (Array.isArray(state.nodes)) {
            state.nodes = migrateWorkflowNotificationAudiences(state.nodes);
          }
          if (Array.isArray(state.policies)) {
            state.policies = state.policies.map((p) => ({
              ...p,
              nodes: migrateWorkflowNotificationAudiences(p.nodes),
            }));
          }
        }
        if (version < 12 && Array.isArray(state.policies)) {
          const approvalFresh = seedPolicies().find(
            (p) => p.id === "pol_ap_access_notify",
          );
          if (approvalFresh) {
            const idx = state.policies.findIndex(
              (p) => p.id === approvalFresh.id,
            );
            const nodes = ensureApprovalPolicyEvent(approvalFresh.nodes);
            if (idx >= 0) {
              state.policies[idx] = { ...approvalFresh, nodes };
            } else {
              state.policies = [{ ...approvalFresh, nodes }, ...state.policies];
            }
          }
        }
        if (version < 13 && Array.isArray(state.policies)) {
          state.policies = state.policies.filter(
            (p) => p.id !== "pol_wf_entitlement_access",
          );
          const approvalFresh = seedPolicies().find(
            (p) => p.id === "pol_ap_access_notify",
          );
          if (approvalFresh) {
            const idx = state.policies.findIndex(
              (p) => p.id === approvalFresh.id,
            );
            const nodes = ensureApprovalPolicyEvent(approvalFresh.nodes);
            if (idx >= 0) {
              state.policies[idx] = { ...approvalFresh, nodes };
            } else {
              state.policies = [{ ...approvalFresh, nodes }, ...state.policies];
            }
          }
        }
        if (version < 14 && Array.isArray(state.policies)) {
          const approvalFresh = seedPolicies().find(
            (p) => p.id === "pol_ap_access_notify",
          );
          if (approvalFresh) {
            const idx = state.policies.findIndex(
              (p) => p.id === approvalFresh.id,
            );
            const nodes = ensureApprovalPolicyEvent(approvalFresh.nodes);
            if (idx >= 0) {
              state.policies[idx] = { ...approvalFresh, nodes };
            }
          }
        }
        if (version < 15 && Array.isArray(state.policies)) {
          const approvalFresh = seedPolicies().find(
            (p) => p.id === "pol_ap_access_notify",
          );
          if (approvalFresh) {
            const idx = state.policies.findIndex(
              (p) => p.id === approvalFresh.id,
            );
            const nodes = ensureApprovalPolicyEvent(approvalFresh.nodes);
            if (idx >= 0) {
              state.policies[idx] = { ...approvalFresh, nodes };
            }
          }
        }
        if (version < 16 && Array.isArray(state.policies)) {
          for (const id of [POL_AP_SOD_DUAL, POL_WF_JOINER_HIGH_RISK]) {
            const fresh = seedPolicies().find((p) => p.id === id);
            if (!fresh) continue;
            const nodes =
              fresh.type === "approval"
                ? ensureApprovalPolicyEvent(fresh.nodes)
                : fresh.nodes;
            const idx = state.policies.findIndex((p) => p.id === id);
            if (idx >= 0) {
              state.policies[idx] = { ...fresh, nodes };
            } else {
              state.policies = [{ ...fresh, nodes }, ...state.policies];
            }
          }
        }
        if (version < 17 && Array.isArray(state.policies)) {
          const approvalFresh = seedPolicies().find(
            (p) => p.id === "pol_ap_access_notify",
          );
          if (approvalFresh) {
            const idx = state.policies.findIndex(
              (p) => p.id === approvalFresh.id,
            );
            const nodes = ensureApprovalPolicyEvent(approvalFresh.nodes);
            if (idx >= 0) {
              state.policies[idx] = { ...approvalFresh, nodes };
            }
          }
        }
        const normalizeLifecyclePolicies = (policies: Policy[]) =>
          policies.map((p) =>
            p.type === "workflow"
              ? { ...p, nodes: normalizeWorkflowNodes(p.nodes) }
              : p,
          );
        if (version < 18) {
          if (Array.isArray(state.nodes)) {
            state.nodes = normalizeWorkflowNodes(state.nodes);
          }
          if (Array.isArray(state.policies)) {
            state.policies = normalizeLifecyclePolicies(state.policies);
          }
        }
        if (version < 19) {
          if (Array.isArray(state.nodes)) {
            state.nodes = migrateConditionalBranchNodes(state.nodes);
          }
          if (Array.isArray(state.policies)) {
            state.policies = migratePolicyConditionalBranches(state.policies);
          }
        }
        if (version < 20) {
          if (Array.isArray(state.nodes)) {
            state.nodes = migrateActionDecisionNodes(state.nodes);
          }
          if (Array.isArray(state.policies)) {
            state.policies = migratePolicyActionDecisions(state.policies);
          }
          if (Array.isArray(state.policies)) {
            for (const seedId of ACTION_DECISION_SEED_POLICY_IDS) {
              const fresh = seedPolicies().find((p) => p.id === seedId);
              if (!fresh) continue;
              const idx = state.policies.findIndex((p) => p.id === seedId);
              const nodes = ensureApprovalPolicyEvent(fresh.nodes);
              if (idx >= 0) {
                state.policies[idx] = { ...fresh, nodes };
              }
            }
          }
        }
        // v21: simplify approval multisplits to a single approval level per
        // branch + one combined outcome decision below the whole multisplit.
        if (version < 21) {
          if (Array.isArray(state.nodes)) {
            state.nodes = migrateMultisplitDecisionNodes(state.nodes);
          }
          if (Array.isArray(state.policies)) {
            state.policies = migratePolicyMultisplitDecisions(state.policies);
          }
          if (Array.isArray(state.policies)) {
            const fresh = seedPolicies().find((p) => p.id === POL_AP_SOD_DUAL);
            if (fresh) {
              const idx = state.policies.findIndex((p) => p.id === POL_AP_SOD_DUAL);
              const nodes = ensureApprovalPolicyEvent(fresh.nodes);
              if (idx >= 0) state.policies[idx] = { ...fresh, nodes };
              else state.policies = [{ ...fresh, nodes }, ...state.policies];
            }
          }
        }
        // v22: refresh demo seeds — workflow multisplit branch filters/modules,
        // joiner high-risk layout, multisplit branch SLA defaults.
        if (version < 22) {
          if (Array.isArray(state.policies)) {
            for (const seedId of [POL_AP_SOD_DUAL, POL_WF_JOINER_HIGH_RISK]) {
              const fresh = seedPolicies().find((p) => p.id === seedId);
              if (!fresh) continue;
              const idx = state.policies.findIndex((p) => p.id === seedId);
              const nodes =
                fresh.type === "approval"
                  ? ensureApprovalPolicyEvent(fresh.nodes)
                  : fresh.nodes;
              if (idx >= 0) {
                state.policies[idx] = { ...fresh, nodes };
              } else {
                state.policies = [{ ...fresh, nodes }, ...state.policies];
              }
            }
          }
        }
        // v23: inject any user-pinned seed policies from user-seeds.json that
        // are missing from existing sessions (added since the user last loaded).
        if (version < 23 && Array.isArray(state.policies)) {
          for (const fresh of (userSeedPoliciesRaw as Policy[])) {
            const idx = state.policies.findIndex((p) => p.id === fresh.id);
            if (idx < 0) {
              const nodes =
                fresh.type === "approval"
                  ? ensureApprovalPolicyEvent(fresh.nodes)
                  : fresh.nodes;
              state.policies = [...state.policies, { ...fresh, nodes }];
            }
          }
        }
        return state as unknown as WorkflowStore;
      },
      partialize: (s) => ({
        nodes: s.nodes,
        view: s.view,
        zoom: s.zoom,
        leftPanelCollapsed: s.leftPanelCollapsed,
        mainNavCollapsed: s.mainNavCollapsed,
        versions: s.versions,
        editorContext: s.editorContext,
        policies: s.policies,
        currentPolicyId: s.currentPolicyId,
        screen: s.screen,
        listType: s.listType,
      }),
    },
  ),
);

export function canUndo(s: WorkflowStore) {
  return s.history.past.length > 0;
}
export function canRedo(s: WorkflowStore) {
  return s.history.future.length > 0;
}

export function hasSeenTour(): boolean {
  if (typeof window === "undefined") return true;
  try {
    return localStorage.getItem(TOUR_SEEN_KEY) === "1";
  } catch {
    return true;
  }
}
