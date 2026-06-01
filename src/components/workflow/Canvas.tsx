"use client";

import { Fragment, useEffect, useMemo, useRef, useState } from "react";
import { useWorkflowStore } from "@/lib/workflow/store";
import { computeCanvasMinWidth } from "@/lib/workflow/canvas-layout";
import { canPlace } from "@/lib/workflow/validation";
import { cn } from "@/lib/cn";
import { StartPill, EndPill } from "./nodes/Pills";
import { Connector, DropSlot } from "./nodes/DropSlot";
import { NodeCard } from "./nodes/NodeCard";

// Vertical breathing room between nodes (and between Start/End and content).
// Kept identical to the DropSlot height so the layout doesn't jump when a
// drop indicator appears while dragging.
const GAP = 40;

export function Canvas() {
  const nodes = useWorkflowStore((s) => s.nodes);
  const selectNode = useWorkflowStore((s) => s.selectNode);
  const zoom = useWorkflowStore((s) => s.zoom);
  const draggingKind = useWorkflowStore((s) => s.draggingKind);
  const setCanvasScrollFn = useWorkflowStore((s) => s.setCanvasScrollFn);
  const editorContext = useWorkflowStore((s) => s.editorContext);
  const canvasMinWidth = useMemo(() => computeCanvasMinWidth(nodes), [nodes]);

  const hasEvent = nodes.some((n) => n.kind === "event");
  const hasFilter = nodes.some((n) => n.kind === "filter");
  const hasTask = nodes.some((n) => n.kind === "task");
  const allKindsPresent = hasEvent && hasFilter && hasTask;
  const showEmptyPlaceholder =
    editorContext !== "approval" && nodes.length === 0;
  const showTrailing = hasEvent && !hasTask && !allKindsPresent;

  // An Exit block terminates the flow: no connecting line is drawn below it,
  // and a flow that ends in an exit shows no trailing End pill.
  const isExitNode = (n: (typeof nodes)[number]) =>
    n.kind === "task" &&
    (n.data as { taskType?: string }).taskType === "exit";
  const endsWithExit =
    nodes.length > 0 && isExitNode(nodes[nodes.length - 1]);

  const dragSlotIndices = new Set<number>();
  if (draggingKind) {
    for (let i = 0; i <= nodes.length; i++) {
      if (canPlace(draggingKind, i, nodes).valid) dragSlotIndices.add(i);
    }
  }

  // ── Canvas panning ──────────────────────────────────────────────────────
  const scrollRef = useRef<HTMLDivElement | null>(null);
  const panState = useRef<{
    x: number;
    y: number;
    sx: number;
    sy: number;
    moved: boolean;
  } | null>(null);
  const [isPanning, setIsPanning] = useState(false);
  const [spacePan, setSpacePan] = useState(false);

  useEffect(() => {
    setCanvasScrollFn((dx, dy) => {
      scrollRef.current?.scrollBy({ left: dx, top: dy, behavior: "smooth" });
    });
    return () => setCanvasScrollFn(null);
  }, [setCanvasScrollFn]);

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      const target = e.target as HTMLElement | null;
      const editing =
        target?.tagName === "INPUT" ||
        target?.tagName === "TEXTAREA" ||
        target?.isContentEditable;
      if (e.code === "Space" && !editing) {
        e.preventDefault();
        setSpacePan(true);
      }
    }
    function onKeyUp(e: KeyboardEvent) {
      if (e.code === "Space") setSpacePan(false);
    }
    window.addEventListener("keydown", onKeyDown);
    window.addEventListener("keyup", onKeyUp);
    return () => {
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("keyup", onKeyUp);
    };
  }, []);

  useEffect(() => {
    if (!isPanning) return;
    function onMove(e: MouseEvent) {
      if (!panState.current || !scrollRef.current) return;
      const dx = e.clientX - panState.current.x;
      const dy = e.clientY - panState.current.y;
      if (!panState.current.moved && Math.hypot(dx, dy) > 4) {
        panState.current.moved = true;
      }
      scrollRef.current.scrollLeft = panState.current.sx - dx;
      scrollRef.current.scrollTop = panState.current.sy - dy;
    }
    function onUp() {
      setIsPanning(false);
    }
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
    return () => {
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onUp);
    };
  }, [isPanning]);

  // ── Pinch / ctrl-scroll zoom ─────────────────────────────────────────────
  // Trackpad pinch surfaces as a wheel event with ctrlKey=true; ctrl+scroll
  // wheel works for mouse users. We attach a non-passive listener so we can
  // preventDefault (otherwise the browser page-zooms).
  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    function onWheel(e: WheelEvent) {
      if (!scrollRef.current) return;
      if (e.ctrlKey) {
        e.preventDefault();
        const store = useWorkflowStore.getState();
        const next = store.zoom - e.deltaY * 0.01;
        store.setZoom(Math.round(next * 100) / 100);
        return;
      }
      const horizontal = e.shiftKey || Math.abs(e.deltaX) > Math.abs(e.deltaY);
      if (horizontal) {
        e.preventDefault();
        scrollRef.current.scrollLeft += e.deltaX + (e.shiftKey ? e.deltaY : 0);
      }
    }
    el.addEventListener("wheel", onWheel, { passive: false });
    return () => el.removeEventListener("wheel", onWheel);
  }, []);

  function onMouseDown(e: React.MouseEvent) {
    const panGesture =
      e.button === 1 || spacePan || (e.button === 0 && e.altKey);
    if (!scrollRef.current) return;
    if (!panGesture && (e.button !== 0 || draggingKind)) {
      return;
    }
    const t = e.target as HTMLElement;
    if (
      !panGesture &&
      (t.closest('[role="button"]') ||
        t.closest("button") ||
        t.closest("a") ||
        t.closest("input") ||
        t.closest("textarea") ||
        t.closest("select"))
    ) {
      return;
    }
    panState.current = {
      x: e.clientX,
      y: e.clientY,
      sx: scrollRef.current.scrollLeft,
      sy: scrollRef.current.scrollTop,
      moved: false,
    };
    setIsPanning(true);
  }

  function onCanvasClick() {
    // If the user actually panned, don't treat the click as a deselect.
    if (panState.current?.moved) {
      panState.current = null;
      return;
    }
    panState.current = null;
    selectNode(null);
  }

  return (
    <div
      ref={scrollRef}
      onMouseDown={onMouseDown}
      onClick={onCanvasClick}
      className={cn(
        "canvas-grid relative flex min-h-0 flex-1 flex-col overflow-auto scrollbar-thin select-none",
        isPanning || spacePan ? "cursor-grab" : "cursor-default",
        isPanning && "cursor-grabbing",
      )}
      role="region"
      aria-label="Workflow canvas"
    >
      <div
        className="mx-auto flex w-full flex-col items-center px-6 py-12"
        style={{
          minWidth: canvasMinWidth,
          transform: `scale(${zoom})`,
          transformOrigin: "top center",
        }}
      >
        <StartPill />

        {/* Leading zone (Start → first content). */}
        {showEmptyPlaceholder ? (
          <Connector height={GAP} />
        ) : dragSlotIndices.has(0) ? (
          <DropSlot index={0} />
        ) : (
          <Connector height={GAP} />
        )}

        {showEmptyPlaceholder ? (
          <>
            <DropSlot index={0} placeholder />
            <Connector height={GAP} />
          </>
        ) : (
          <>
            {nodes.map((node, i) => (
              <Fragment key={node.id}>
                <NodeCard node={node} />
                {i < nodes.length - 1 && (
                  dragSlotIndices.has(i + 1) ? (
                    <DropSlot index={i + 1} />
                  ) : isExitNode(node) ? null : (
                    <Connector
                      height={GAP}
                      addAt={
                        hasEvent && !draggingKind
                          ? { index: i + 1 }
                          : undefined
                      }
                    />
                  )
                )}
              </Fragment>
            ))}

            {showTrailing && (
              <>
                <Connector
                  height={GAP}
                  addAt={!draggingKind ? { index: nodes.length } : undefined}
                />
                {/* While dragging a filter: show a dedicated "Insert here" zone
                    ABOVE "Add Task" so the filter never lands inside the task
                    placeholder. */}
                {draggingKind === "filter" && (
                  <DropSlot index={nodes.length} />
                )}
                {/* "Add Task" primary CTA — always visible except when a
                    filter is being dragged (the insert zone above handles it). */}
                {draggingKind !== "filter" && (
                  dragSlotIndices.has(nodes.length) ? (
                    <DropSlot index={nodes.length} />
                  ) : (
                    <DropSlot
                      index={nodes.length}
                      placeholder
                      forKind="task"
                    />
                  )
                )}
                <Connector height={GAP} />
              </>
            )}
            {!showTrailing &&
              (dragSlotIndices.has(nodes.length) ? (
                <DropSlot index={nodes.length} />
              ) : endsWithExit ? null : (
                <Connector
                  height={GAP}
                  addAt={
                    hasEvent && !draggingKind && nodes.length > 0
                      ? { index: nodes.length }
                      : undefined
                  }
                />
              ))}
          </>
        )}

        <EndPill />
      </div>
    </div>
  );
}
