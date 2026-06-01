"use client";

import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Check, X, ChevronLeft } from "lucide-react";
import { cn } from "@/lib/cn";
import { useWorkflowStore } from "@/lib/workflow/store";
import {
  itemsForKind,
  taskItemsForEditorContext,
  eventItemsForContext,
  type PaletteItem,
} from "@/lib/workflow/palette";
import { canPlace } from "@/lib/workflow/validation";
import { NODE_META } from "@/lib/workflow/icons";
import type { NodeKind } from "@/lib/workflow/types";

interface AddPickerProps {
  open: boolean;
  /** DOM rect of the trigger that opened the picker (viewport coords). */
  anchorRect: DOMRect | null;
  /** Which kinds the picker is offering. The picker filters by canPlace
   *  for the given index, so callers can pass the union freely. */
  kinds: NodeKind[];
  /** Insertion index passed to insertNode. */
  index: number;
  /** Optional explicit title; defaults to a contextual label. */
  title?: string;
  onClose: () => void;
}

export function AddPicker({
  open,
  anchorRect,
  kinds,
  index,
  title,
  onClose,
}: AddPickerProps) {
  const insertNode = useWorkflowStore((s) => s.insertNode);
  const showToast = useWorkflowStore((s) => s.showToast);
  const nodes = useWorkflowStore((s) => s.nodes);
  const editorContext = useWorkflowStore((s) => s.editorContext);
  const ref = useRef<HTMLDivElement>(null);
  const [position, setPosition] = useState<{ left: number; top: number } | null>(
    null,
  );
  // Two-step: null = category step, string = items step
  const [selectedKind, setSelectedKind] = useState<NodeKind | null>(null);

  // Reset inner step when picker opens/closes
  useEffect(() => {
    if (!open) setSelectedKind(null);
  }, [open]);

  // First-pass: roughly position below the anchor so the element renders and
  // can be measured. Second pass (the next useLayoutEffect) refines based on
  // the measured popover size, flipping above if there's no room below.
  useLayoutEffect(() => {
    if (!open || !anchorRect) {
      setPosition(null);
      return;
    }
    const width = 280;
    const margin = 8;
    let left = anchorRect.left + anchorRect.width / 2 - width / 2;
    const maxLeft = window.innerWidth - width - 12;
    if (left < 12) left = 12;
    if (left > maxLeft) left = maxLeft;
    setPosition({ left, top: anchorRect.bottom + margin });
  }, [open, anchorRect]);

  // After the popover is rendered, measure its actual height and reposition
  // (flip above the anchor if there isn't enough room below).
  useLayoutEffect(() => {
    if (!open || !anchorRect || !ref.current || !position) return;
    const popHeight = ref.current.offsetHeight;
    const viewportH = window.innerHeight;
    const margin = 8;
    const minTop = 12;
    const maxTop = viewportH - popHeight - 12;

    const spaceBelow = viewportH - anchorRect.bottom - margin;
    const spaceAbove = anchorRect.top - margin;

    let top: number;
    if (popHeight <= spaceBelow) {
      top = anchorRect.bottom + margin;
    } else if (popHeight <= spaceAbove) {
      top = anchorRect.top - popHeight - margin;
    } else if (spaceBelow >= spaceAbove) {
      top = anchorRect.bottom + margin;
    } else {
      top = anchorRect.top - popHeight - margin;
    }
    top = Math.max(minTop, Math.min(maxTop, top));

    if (top !== position.top) {
      setPosition({ left: position.left, top });
    }
  });

  useEffect(() => {
    if (!open) return;
    function onDown(e: MouseEvent) {
      if (!ref.current) return;
      if (ref.current.contains(e.target as Node)) return;
      onClose();
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") {
        if (selectedKind) {
          setSelectedKind(null);
        } else {
          onClose();
        }
      }
    }
    const t = setTimeout(() => {
      window.addEventListener("mousedown", onDown);
      window.addEventListener("keydown", onKey);
    }, 0);
    return () => {
      clearTimeout(t);
      window.removeEventListener("mousedown", onDown);
      window.removeEventListener("keydown", onKey);
    };
  }, [open, onClose, selectedKind]);

  if (!open || !position || typeof document === "undefined") return null;

  // Build valid sections (filtered by canPlace at this index).
  const validSections: Array<{ kind: NodeKind; items: PaletteItem[] }> = [];
  for (const k of kinds) {
    const valid = canPlace(k, index, nodes).valid;
    if (!valid) continue;
    // Items are context-aware so an approval policy only offers the Approval
    // Policy event + approval blocks (not workflow joiner/mover/leaver/tasks).
    const items =
      k === "task"
        ? taskItemsForEditorContext(editorContext, nodes)
        : k === "event"
          ? eventItemsForContext(editorContext)
          : itemsForKind(k);
    if (items.length > 0) validSections.push({ kind: k, items });
  }

  // ── Empty state ──────────────────────────────────────────────────────────
  if (validSections.length === 0) {
    return createPortal(
      <div
        ref={ref}
        role="dialog"
        aria-label="Add block"
        style={{ position: "fixed", left: position.left, top: position.top, width: 280 }}
        className="z-50 rounded-lg border border-[var(--border)] bg-white p-3 shadow-xl ring-1 ring-black/5"
      >
        <p className="text-[12.5px] text-[var(--muted-fg)]">
          Nothing can be added at this position.
        </p>
      </div>,
      document.body,
    );
  }

  // ── Two-step mode: show category picker first when >1 valid kind ─────────
  const isMultiKind = validSections.length > 1;
  const showCategoryStep = isMultiKind && selectedKind === null;
  const activeSection = selectedKind
    ? validSections.find((s) => s.kind === selectedKind) ?? null
    : isMultiKind
      ? null
      : validSections[0];

  const headerTitle =
    showCategoryStep
      ? (title ?? "Add Block")
      : activeSection
        ? `Add ${NODE_META[activeSection.kind].label}`
        : (title ?? "Add Block");

  function selectItem(item: PaletteItem) {
    if (item.comingSoon) return;
    insertNode(
      item.kind,
      index,
      item.preset as Parameters<typeof insertNode>[2],
    );
    showToast(`${item.label} added`, "success");
    onClose();
  }

  return createPortal(
    <div
      ref={ref}
      role="dialog"
      aria-label={headerTitle}
      style={{
        position: "fixed",
        left: position.left,
        top: position.top,
        width: 280,
        maxHeight: "calc(100vh - 24px)",
      }}
      className="z-50 flex flex-col overflow-hidden rounded-lg border border-[var(--border)] bg-white shadow-xl ring-1 ring-black/5"
    >
      {/* Header */}
      <div className="flex shrink-0 items-center gap-1 px-3 pb-1 pt-2">
        {!showCategoryStep && isMultiKind && (
          <button
            onClick={() => setSelectedKind(null)}
            aria-label="Back to categories"
            className="-ml-1 flex h-6 w-6 shrink-0 items-center justify-center rounded-md text-[var(--muted-fg)] transition-colors hover:bg-[var(--muted)] hover:text-[var(--foreground)]"
          >
            <ChevronLeft className="h-3.5 w-3.5" />
          </button>
        )}
        <p className="flex-1 text-[11px] font-semibold uppercase tracking-wide text-[var(--muted-fg)]">
          {headerTitle}
        </p>
        <button
          onClick={onClose}
          aria-label="Close"
          className="-mr-1 flex h-6 w-6 shrink-0 items-center justify-center rounded-md text-[var(--muted-fg)] transition-colors hover:bg-[var(--muted)] hover:text-[var(--foreground)]"
        >
          <X className="h-3.5 w-3.5" />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-1.5 pt-0 scrollbar-thin">
        {/* ── Step 1: Category selection ─────────────────────────────── */}
        {showCategoryStep && (
          <div className="flex flex-col gap-0.5">
            {validSections.map((section) => {
              const meta = NODE_META[section.kind];
              const KindIcon = meta.icon;
              return (
                <button
                  key={section.kind}
                  onClick={() => setSelectedKind(section.kind)}
                  className="group flex w-full items-center gap-2.5 rounded-md p-2.5 text-left transition-colors hover:bg-[var(--muted)]"
                >
                  <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-[var(--accent-soft)] text-[var(--accent)]">
                    <KindIcon className="h-4 w-4" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="text-[13px] font-semibold text-[var(--foreground)]">
                      {meta.label}
                    </p>
                    <p className="mt-0.5 text-[11.5px] leading-snug text-[var(--muted-fg)]">
                      {section.kind === "filter"
                        ? "Scope this step to a user segment"
                        : "Provision apps, entitlements and roles"}
                    </p>
                  </div>
                  <Check className="h-3.5 w-3.5 shrink-0 text-[var(--accent)] opacity-0 transition-opacity group-hover:opacity-100" />
                </button>
              );
            })}
          </div>
        )}

        {/* ── Step 2: Items list ─────────────────────────────────────── */}
        {!showCategoryStep && activeSection && (
          <div className="flex flex-col gap-0.5">
            {activeSection.items.map((it) => {
              const Icon = it.icon;
              const disabled = !!it.comingSoon;
              return (
                <button
                  key={it.dragId}
                  onClick={() => selectItem(it)}
                  disabled={disabled}
                  className={cn(
                    "group flex w-full items-center gap-2.5 rounded-md p-2 text-left transition-colors",
                    disabled
                      ? "cursor-not-allowed opacity-60"
                      : "hover:bg-[var(--muted)]",
                  )}
                >
                  <span
                    className={cn(
                      "mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-md",
                      disabled
                        ? "bg-[var(--muted)] text-[var(--muted-fg)]"
                        : "bg-[var(--accent-soft)] text-[var(--accent)]",
                    )}
                  >
                    <Icon className="h-3.5 w-3.5" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1.5">
                      <span className="text-[13px] font-semibold text-[var(--foreground)]">
                        {it.label}
                      </span>
                      {it.comingSoon && (
                        <span className="rounded bg-[var(--muted)] px-1.5 py-0.5 text-[9.5px] font-medium uppercase tracking-wide text-[var(--muted-fg)]">
                          Soon
                        </span>
                      )}
                    </div>
                  </div>
                  {!disabled && (
                    <Check className="mt-1.5 h-3.5 w-3.5 shrink-0 text-[var(--accent)] opacity-0 transition-opacity group-hover:opacity-100" />
                  )}
                </button>
              );
            })}
          </div>
        )}
      </div>
    </div>,
    document.body,
  );
}
