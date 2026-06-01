"use client";

import { useEffect, useState } from "react";
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  KeyboardSensor,
  useSensor,
  useSensors,
  type DragStartEvent,
  type DragEndEvent,
} from "@dnd-kit/core";
import { useWorkflowStore } from "@/lib/workflow/store";
import { canPlace } from "@/lib/workflow/validation";
import { NODE_META } from "@/lib/workflow/icons";
import {
  paletteCategoryFromDrag,
  paletteIconTileClass,
} from "@/lib/workflow/palette-tones";
import type { NodeKind, ApprovalLevelConfig } from "@/lib/workflow/types";
import {
  branchParentIsMultisplit,
  getParentBranchLevels,
} from "@/lib/workflow/multisplit-decision";
import {
  defaultNestedConditionalLevel,
  defaultNestedMultisplitLevel,
  defaultBranchFilterConfig,
  defaultBranchModuleConfig,
} from "@/lib/workflow/branch-blocks";
import { ComponentsPanel } from "./ComponentsPanel";
import { Canvas } from "./Canvas";
import { ConfigPanel } from "./ConfigPanel";
import { VersionsPanel } from "./VersionsPanel";
import { CanvasToolbar } from "./CanvasToolbar";
import { cn } from "@/lib/cn";

export function WorkflowEditor() {
  const setDraggingKind = useWorkflowStore((s) => s.setDraggingKind);
  const insertNode = useWorkflowStore((s) => s.insertNode);
  const nodes = useWorkflowStore((s) => s.nodes);
  const showToast = useWorkflowStore((s) => s.showToast);
  const leftPanelCollapsed = useWorkflowStore((s) => s.leftPanelCollapsed);
  const rightPanelOpen = useWorkflowStore((s) => s.rightPanelOpen);
  const rightPanelView = useWorkflowStore((s) => s.rightPanelView);
  const undo = useWorkflowStore((s) => s.undo);
  const redo = useWorkflowStore((s) => s.redo);
  const selectedId = useWorkflowStore((s) => s.selectedId);
  const removeNode = useWorkflowStore((s) => s.removeNode);
  const resetWorkflow = useWorkflowStore((s) => s.resetWorkflow);
  const requestConfirm = useWorkflowStore((s) => s.requestConfirm);
  const selectNode = useWorkflowStore((s) => s.selectNode);
  const setRightPanelOpen = useWorkflowStore((s) => s.setRightPanelOpen);

  const [activeDrag, setActiveDrag] = useState<{
    kind: NodeKind;
    preset?: Record<string, unknown>;
  } | null>(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor),
  );

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      const target = e.target as HTMLElement | null;
      const tag = target?.tagName;
      const editing =
        tag === "INPUT" ||
        tag === "TEXTAREA" ||
        target?.isContentEditable;

      if ((e.metaKey || e.ctrlKey) && !e.shiftKey && e.key.toLowerCase() === "z") {
        e.preventDefault();
        undo();
      } else if (
        ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "y") ||
        ((e.metaKey || e.ctrlKey) && e.shiftKey && e.key.toLowerCase() === "z")
      ) {
        e.preventDefault();
        redo();
      } else if (e.key === "Escape") {
        selectNode(null);
        setRightPanelOpen(false);
      } else if ((e.key === "Delete" || e.key === "Backspace") && !editing) {
        if (selectedId) {
          e.preventDefault();
          const sel = nodes.find((n) => n.id === selectedId);
          if (sel?.kind === "event") {
            const dependents = nodes.filter((n) => n.id !== selectedId);
            if (dependents.length > 0) {
              requestConfirm({
                title: "Remove the Event?",
                message:
                  "Removing the Event will also remove all dependent nodes. All workflow progress will be lost.",
                confirmLabel: "Remove all",
                tone: "danger",
                onConfirm: () => resetWorkflow(),
              });
              return;
            }
          }
          removeNode(selectedId);
        }
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [undo, redo, selectedId, removeNode, resetWorkflow, requestConfirm, nodes, selectNode, setRightPanelOpen]);

  function onDragStart(e: DragStartEvent) {
    const kind = e.active.data.current?.kind as NodeKind | undefined;
    if (kind) {
      setActiveDrag({
        kind,
        preset: e.active.data.current?.preset as Record<string, unknown> | undefined,
      });
      setDraggingKind(kind);
    }
  }

  function onDragEnd(e: DragEndEvent) {
    const kind = e.active.data.current?.kind as NodeKind | undefined;
    const preset = e.active.data.current?.preset as Record<string, unknown> | undefined;
    const overData = e.over?.data.current;

    setActiveDrag(null);
    setDraggingKind(null);

    if (kind == null || overData == null) return;

    if (overData.isBranchDrop) {
      const { nodeId, branchId, index, embeddedHostLevelId } = overData as {
        nodeId: string;
        branchId: string;
        index: number;
        embeddedHostLevelId?: string;
      };
      const store = useWorkflowStore.getState();
      const isWorkflowMultisplit =
        store.editorContext === "workflow" &&
        branchParentIsMultisplit(store.nodes, nodeId, embeddedHostLevelId);

      if (kind === "filter") {
        if (!isWorkflowMultisplit) {
          store.showToast(
            "Filters can only be added inside a multisplit branch.",
            "error",
          );
          return;
        }
        store.insertNodeIntoBranch(
          nodeId,
          branchId,
          index,
          defaultBranchFilterConfig(),
          embeddedHostLevelId,
        );
        return;
      }

      if (
        store.editorContext === "approval" &&
        branchParentIsMultisplit(store.nodes, nodeId, embeddedHostLevelId)
      ) {
        if (preset?.taskType !== "approval_level") {
          store.showToast(
            "Multisplit branches can only contain an approval level.",
            "error",
          );
          return;
        }
        const existing = getParentBranchLevels(
          store.nodes,
          nodeId,
          branchId,
          embeddedHostLevelId,
        );
        if (existing && existing.length >= 1) {
          store.showToast(
            "Each multisplit branch allows only one approval level.",
            "error",
          );
          return;
        }
      }
      const insertNodeIntoBranch = store.insertNodeIntoBranch;
      if (preset?.taskType === "approval_level") {
        insertNodeIntoBranch(
          nodeId,
          branchId,
          index,
          preset as Partial<ApprovalLevelConfig>,
          embeddedHostLevelId,
        );
      } else if (preset?.taskType === "exit") {
        insertNodeIntoBranch(
          nodeId,
          branchId,
          index,
          {
            blockType: "exit",
            exitOutcome: "End",
          } as Partial<ApprovalLevelConfig>,
          embeddedHostLevelId,
        );
      } else if (preset?.taskType === "skip") {
        insertNodeIntoBranch(
          nodeId,
          branchId,
          index,
          { blockType: "skip" } as Partial<ApprovalLevelConfig>,
          embeddedHostLevelId,
        );
      } else if (preset?.taskType === "assign_entities") {
        insertNodeIntoBranch(
          nodeId,
          branchId,
          index,
          {
            blockType: "assign_entities",
            name: "Assign Entities",
            appIds: [],
            entitlementIds: [],
            techRoleIds: [],
            businessRoleIds: [],
            criteria: { logic: "AND", conditions: [] },
          } as Partial<ApprovalLevelConfig>,
          embeddedHostLevelId,
        );
      } else if (preset?.taskType === "approval_policy_ref") {
        if (!isWorkflowMultisplit) {
          showToast(
            "Modules can only be added inside a multisplit branch.",
            "error",
          );
          return;
        }
        insertNodeIntoBranch(
          nodeId,
          branchId,
          index,
          defaultBranchModuleConfig(),
          embeddedHostLevelId,
        );
      } else if (preset?.taskType === "notification") {
        insertNodeIntoBranch(
          nodeId,
          branchId,
          index,
          {
            blockType: "notification",
            name: "Notification",
            notificationTrigger: "completed",
            notificationChannels: ["slack", "email"],
            notificationAudiences: ["Requester"],
            notificationRecipients: [],
          } as Partial<ApprovalLevelConfig>,
          embeddedHostLevelId,
        );
      } else if (preset?.taskType === "conditional_branch") {
        insertNodeIntoBranch(
          nodeId,
          branchId,
          index,
          defaultNestedConditionalLevel({ name: "Conditional Branch" }),
          embeddedHostLevelId,
        );
      } else if (preset?.taskType === "approval_split") {
        insertNodeIntoBranch(
          nodeId,
          branchId,
          index,
          defaultNestedMultisplitLevel({ name: "Multisplit Branch" }),
          embeddedHostLevelId,
        );
      } else if (preset?.taskType === "sod_check") {
        insertNodeIntoBranch(
          nodeId,
          branchId,
          index,
          { blockType: "sod_check", name: "SoD Check" } as Partial<ApprovalLevelConfig>,
          embeddedHostLevelId,
        );
      } else {
        showToast("That block can't be dropped inside a branch", "error");
      }
      return;
    }

    const overIndex = overData.index as number | undefined;
    if (overIndex == null) return;

    const res = canPlace(kind, overIndex, nodes);
    if (!res.valid) {
      showToast(res.reason ?? "Invalid placement", "error");
      return;
    }
    insertNode(kind, overIndex, preset as Parameters<typeof insertNode>[2]);
  }

  const OverlayCard = activeDrag
    ? (() => {
        const meta = NODE_META[activeDrag.kind];
        const Icon = meta.icon;
        const category = paletteCategoryFromDrag(activeDrag.kind, activeDrag.preset);
        return (
          <div className="pointer-events-none w-[240px] rounded-lg border border-[var(--border)] bg-white px-3 py-2.5 shadow-xl ring-1 ring-black/5">
            <div className="flex items-center gap-2.5">
              <span
                className={cn(
                  "flex h-7 w-7 items-center justify-center rounded-md",
                  paletteIconTileClass(category),
                )}
              >
                <Icon className="h-3.5 w-3.5" />
              </span>
              <span className="text-[13px] font-semibold text-[var(--foreground)]">
                {meta.label}
              </span>
            </div>
          </div>
        );
      })()
    : null;

  if (!mounted) {
    return <div className="flex-1 bg-[var(--canvas-bg)]" />;
  }

  return (
    <DndContext
      sensors={sensors}
      onDragStart={onDragStart}
      onDragEnd={onDragEnd}
      onDragCancel={() => {
        setActiveDrag(null);
        setDraggingKind(null);
      }}
    >
      <div className="flex min-h-0 flex-1 overflow-hidden">
        <div
          className={cn(
            "transition-[width] duration-200 ease-out",
            leftPanelCollapsed ? "w-[48px]" : "w-[288px]",
          )}
        >
          <ComponentsPanel />
        </div>

        <div className="relative flex min-w-0 flex-1 flex-col">
          <Canvas />
          <CanvasToolbar />
        </div>

        <div
          className={cn(
            "transition-[width] duration-200 ease-out",
            rightPanelOpen ? "w-[400px]" : "w-0",
          )}
        >
          {rightPanelView === "versions" ? <VersionsPanel /> : <ConfigPanel />}
        </div>
      </div>
      <DragOverlay dropAnimation={null}>{OverlayCard}</DragOverlay>
    </DndContext>
  );
}
