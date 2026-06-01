"use client";

import { useRef, useState } from "react";
import { useDroppable } from "@dnd-kit/core";
import { Plus, X } from "lucide-react";
import { cn } from "@/lib/cn";
import { useWorkflowStore } from "@/lib/workflow/store";
import { canPlace, nextExpectedPlacement } from "@/lib/workflow/validation";
import { NODE_META } from "@/lib/workflow/icons";
import { AddPicker } from "../AddPicker";

interface DropSlotProps {
  index: number;
  /** When true, the slot is the empty-state Add Event placeholder (larger) */
  placeholder?: boolean;
  /**
   * Force the placeholder to advertise a specific node kind even if the
   * guided "next-expected" engine would skip it. Used for the optional
   * "Add Overall Filter" affordance above an Event.
   */
  forKind?: import("@/lib/workflow/types").NodeKind;
  /** Muted visual variant used for the optional Filter placeholder. */
  optional?: boolean;
  /**
   * Explicit list of kinds to offer in the inline picker (overrides the
   * single-kind default derived from forKind / nextExpectedPlacement).
   */
  kinds?: import("@/lib/workflow/types").NodeKind[];
}

export function DropSlot({
  index,
  placeholder = false,
  forKind,
  optional = false,
  kinds,
}: DropSlotProps) {
  const draggingKind = useWorkflowStore((s) => s.draggingKind);
  const nodes = useWorkflowStore((s) => s.nodes);
  const placement = draggingKind ? canPlace(draggingKind, index, nodes) : null;
  const valid = placement?.valid ?? null;

  const { setNodeRef, isOver } = useDroppable({
    id: `slot-${index}`,
    data: { index },
    disabled: draggingKind != null && valid === false,
  });

  const triggerRef = useRef<HTMLDivElement | null>(null);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [anchorRect, setAnchorRect] = useState<DOMRect | null>(null);

  function openPicker() {
    if (!triggerRef.current) return;
    setAnchorRect(triggerRef.current.getBoundingClientRect());
    setPickerOpen(true);
  }

  if (placeholder) {
    const expected = nextExpectedPlacement(nodes);
    const placeholderKind = forKind ?? expected?.kind ?? null;
    // When explicit kinds are provided (multi-kind), label as "Add Block".
    const idleLabel = kinds && kinds.length > 1
      ? "Add Block"
      : placeholderKind
        ? `Add ${NODE_META[placeholderKind].label}${optional ? " (optional)" : ""}`
        : "Workflow complete";
    const showInvalidWhileDragging = draggingKind != null && !valid;
    // canClick: for multi-kind, allow click if any of the kinds is valid here.
    const canClickMulti = kinds && kinds.length > 1
      ? kinds.some((k) => canPlace(k, index, nodes).valid) && !draggingKind
      : placeholderKind != null && !draggingKind;
    const canClick = canClickMulti;

    return (
      <div
        ref={(el) => {
          setNodeRef(el);
          triggerRef.current = el;
        }}
        role={canClick ? "button" : undefined}
        tabIndex={canClick ? 0 : -1}
        aria-label={canClick ? idleLabel : undefined}
        data-tour={
          placeholderKind === "event" && nodes.length === 0
            ? "add-event"
            : undefined
        }
        onClick={(e) => {
          if (!canClick) return;
          e.stopPropagation();
          openPicker();
        }}
        onKeyDown={(e) => {
          if (!canClick) return;
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            openPicker();
          }
        }}
        className={cn(
          "flex h-12 w-[460px] items-center justify-center gap-2 rounded-lg border-2 border-dashed transition-all",
          draggingKind == null && !optional &&
            "border-[var(--border)] bg-white text-[var(--muted-fg)]",
          draggingKind == null && optional &&
            "border-[var(--border)] bg-white text-[var(--muted-fg)]/80",
          draggingKind && valid && "border-[var(--accent)]/60 bg-[var(--accent-softer)] text-[var(--accent)]",
          showInvalidWhileDragging && "border-[var(--border)] bg-[var(--muted)]/50 text-[var(--muted-fg)]",
          isOver && valid && "border-[var(--accent)] bg-[var(--accent-soft)]",
          canClick && !optional && "cursor-pointer hover:border-[var(--accent)]/60 hover:bg-[var(--accent-softer)] hover:text-[var(--accent)]",
          canClick && optional && "cursor-pointer hover:border-[var(--border-strong)] hover:bg-white hover:text-[var(--foreground)]",
        )}
        title={showInvalidWhileDragging ? placement?.reason : undefined}
      >
        {showInvalidWhileDragging ? (
          <X className="h-3.5 w-3.5" />
        ) : (
          <Plus className="h-3.5 w-3.5" />
        )}
        <span className={cn("text-[13px]", optional ? "font-normal" : "font-medium")}>
          {showInvalidWhileDragging
            ? placement?.reason
            : draggingKind && valid
              ? `Drop ${NODE_META[draggingKind].label} here`
              : idleLabel}
        </span>
        {canClick && placeholderKind && (
          <AddPicker
            open={pickerOpen}
            anchorRect={anchorRect}
            kinds={kinds ?? [placeholderKind]}
            index={index}
            onClose={() => setPickerOpen(false)}
          />
        )}
      </div>
    );
  }

  // Inline slot between nodes — only relevant while dragging.
  if (draggingKind == null) {
    return <div className="my-1 h-1 w-px" aria-hidden />;
  }

  // Invalid spots aren't visualised — we only render at indices the dragged
  // kind can land on (Canvas already filters via dragSlotIndices, but this
  // guard keeps the component self-safe).
  if (!valid) return null;

  return (
    <div
      ref={setNodeRef}
      className="my-1 flex h-10 w-[460px] items-center justify-center"
      aria-label="Drop here to insert"
    >
      {isOver ? (
        <span className="flex h-10 w-full items-center justify-center gap-1.5 rounded-md border-2 border-dashed border-[var(--accent)] bg-[var(--accent-soft)] text-[12px] font-medium text-[var(--accent)]">
          <Plus className="h-3.5 w-3.5" />
          Insert here
        </span>
      ) : (
        <span className="drop-pulse flex h-7 w-7 items-center justify-center rounded-full bg-white text-[var(--accent)] shadow-sm ring-1 ring-[var(--accent)]/50">
          <Plus className="h-3.5 w-3.5" strokeWidth={2.5} />
        </span>
      )}
    </div>
  );
}

interface ConnectorProps {
  /** Height of the line in px. Default 24. */
  height?: number;
  /**
   * When provided, renders a hover-only "+" affordance on the line that
   * opens a picker to insert a node at this index. The picker self-filters
   * by canPlace, so it's safe to enable on every internal connector.
   */
  addAt?: { index: number };
}

export function Connector({ height = 24, addAt }: ConnectorProps) {
  const btnRef = useRef<HTMLButtonElement | null>(null);
  const [open, setOpen] = useState(false);
  const [anchorRect, setAnchorRect] = useState<DOMRect | null>(null);

  if (!addAt) {
    return (
      <div
        className="w-px bg-[var(--border-strong)]"
        style={{ height: `${height}px` }}
        aria-hidden
      />
    );
  }

  function openPicker() {
    if (!btnRef.current) return;
    setAnchorRect(btnRef.current.getBoundingClientRect());
    setOpen(true);
  }

  // For ripple connectors, expand the height a touch to give the trigger
  // some breathing room (and a larger hover zone).
  const effectiveHeight = Math.max(height, 36);

  return (
    <div
      className="conn-add relative w-[460px] flex justify-center"
      style={{ height: `${effectiveHeight}px` }}
    >
      {/* The vertical line, centered. */}
      <div
        aria-hidden
        className="absolute top-0 bottom-0 w-px bg-[var(--border-strong)]"
      />
      <button
        ref={btnRef}
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          openPicker();
        }}
        aria-label="Add a block here"
        title="Add a block"
        className="conn-add-btn"
      >
        <Plus className="plus-icon h-3 w-3" strokeWidth={3} />
      </button>
      <AddPicker
        open={open}
        anchorRect={anchorRect}
        kinds={["filter", "task"]}
        index={addAt.index}
        title="Insert block here"
        onClose={() => setOpen(false)}
      />
    </div>
  );
}
