"use client";

import { useEffect, useRef, useState } from "react";
import { useDraggable } from "@dnd-kit/core";
import { ChevronsLeft, GripVertical, Sparkles, BookOpen } from "lucide-react";
import { cn } from "@/lib/cn";
import { useWorkflowStore } from "@/lib/workflow/store";
import { canPlaceAnywhere } from "@/lib/workflow/validation";
import {
  eventItemsForContext,
  taskSectionsForEditorContext,
  type PaletteItem,
  type PaletteSection,
} from "@/lib/workflow/palette";
import {
  paletteCategoryFromSectionLabel,
  paletteIconTileClass,
  type PaletteCategory,
} from "@/lib/workflow/palette-tones";
import { WorkflowLearnModal } from "./WorkflowLearnModal";

type Tab = "events" | "tasks";

const TABS: { id: Tab; label: string }[] = [
  { id: "events", label: "Events" },
  { id: "tasks", label: "Blocks" },
];

export function ComponentsPanel() {
  const collapsed = useWorkflowStore((s) => s.leftPanelCollapsed);
  const toggle = useWorkflowStore((s) => s.toggleLeftPanel);
  const startTour = useWorkflowStore((s) => s.startTour);
  const setAssistantOpen = useWorkflowStore((s) => s.setAssistantOpen);
  const nodes = useWorkflowStore((s) => s.nodes);
  const editorContext = useWorkflowStore((s) => s.editorContext);
  const isApprovalEditor = editorContext === "approval";
  const [learnOpen, setLearnOpen] = useState(false);

  const [tab, setTab] = useState<Tab>(() => {
    if (useWorkflowStore.getState().editorContext === "approval") return "tasks";
    return useWorkflowStore.getState().nodes.some((n) => n.kind === "event")
      ? "tasks"
      : "events";
  });

  const hadEventRef = useRef(
    nodes.some((n) => n.kind === "event"),
  );

  useEffect(() => {
    if (isApprovalEditor) {
      setTab("tasks");
      return;
    }
    const hasEvent = nodes.some((n) => n.kind === "event");
    if (hasEvent && !hadEventRef.current) {
      setTab("tasks");
    } else if (!hasEvent && hadEventRef.current) {
      setTab("events");
    }
    hadEventRef.current = hasEvent;
  }, [isApprovalEditor, nodes]);

  const SECTIONS_BY_TAB: Record<Tab, PaletteSection[]> = {
    events: [{ label: null, items: eventItemsForContext(editorContext) }],
    tasks: taskSectionsForEditorContext(editorContext, nodes),
  };

  const panelTitle = isApprovalEditor
    ? "Approval Components"
    : "Workflow Components";

  const sections = isApprovalEditor
    ? SECTIONS_BY_TAB.tasks
    : SECTIONS_BY_TAB[tab];

  if (collapsed) {
    return (
      <aside className="flex h-full w-[48px] flex-col border-r border-[var(--border)] bg-white">
        <button
          onClick={toggle}
          className="flex h-12 w-full items-center justify-center text-[var(--muted-fg)] transition-colors hover:bg-[var(--muted)]"
          aria-label="Expand components panel"
        >
          <ChevronsLeft className="h-4 w-4 rotate-180" />
        </button>
      </aside>
    );
  }

  return (
    <aside
      data-tour="components"
      className="flex h-full w-[288px] flex-col border-r border-[var(--border)] bg-white"
    >
      <header className="flex h-12 shrink-0 items-center justify-between border-b border-[var(--border)] px-4">
        <h2 className="text-[11px] font-semibold uppercase tracking-[0.06em] text-[var(--muted-fg)]">
          {panelTitle}
        </h2>
        <button
          onClick={toggle}
          className="flex h-6 w-6 items-center justify-center rounded-md text-[var(--muted-fg)] transition-colors hover:bg-[var(--muted)] hover:text-[var(--foreground)]"
          aria-label="Collapse"
        >
          <ChevronsLeft className="h-3.5 w-3.5" />
        </button>
      </header>

      {!isApprovalEditor && (
        <div
          className="shrink-0 border-b border-[var(--border)] px-3 py-2"
          role="tablist"
        >
          <div className="flex items-center rounded-lg bg-[var(--muted)] p-0.5">
            {TABS.map((t) => (
              <button
                key={t.id}
                role="tab"
                aria-selected={tab === t.id}
                onClick={() => setTab(t.id)}
                className={cn(
                  "h-7 flex-1 rounded-md text-[12px] font-semibold transition-all duration-150",
                  tab === t.id
                    ? "bg-white text-[var(--foreground)] shadow-[var(--shadow-xs)]"
                    : "text-[var(--muted-fg)] hover:text-[var(--foreground)]",
                )}
              >
                {t.label}
              </button>
            ))}
          </div>
        </div>
      )}

      <div className="flex-1 overflow-y-auto px-3 py-3.5 scrollbar-thin">
        {sections.every((s) => s.items.length === 0) ? (
          <div className="flex flex-col items-center justify-center gap-1 px-4 py-10 text-center">
            <p className="text-[12.5px] font-medium text-[var(--foreground)]">
              Nothing available
            </p>
            <p className="text-[11.5px] leading-snug text-[var(--muted-fg)]">
              There are no components for this tab.
            </p>
          </div>
        ) : (
          <div className="flex flex-col gap-5">
            {sections.map((section, si) => (
              <div
                key={section.label ?? `section-${si}`}
                className="flex flex-col gap-1.5"
              >
                {section.label && (
                  <p className="mb-0.5 px-1 text-[10.5px] font-semibold uppercase tracking-[0.06em] text-[var(--muted-fg)]">
                    {section.label}
                  </p>
                )}
                {section.items.map((it) => (
                  <DraggableCard
                    key={it.dragId}
                    item={it}
                    category={paletteCategoryFromSectionLabel(
                      isApprovalEditor ? "tasks" : tab,
                      section.label,
                    )}
                  />
                ))}
              </div>
            ))}
          </div>
        )}
      </div>

      <footer className="flex flex-col gap-0.5 border-t border-[var(--border)] px-4 py-3">
        {isApprovalEditor && (
          <button
            type="button"
            onClick={() => setAssistantOpen(true)}
            className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-[12px] font-medium text-[#eb5424] transition-colors hover:bg-[#eb5424]/5"
          >
            <Sparkles className="h-3.5 w-3.5 shrink-0" />
            Build with assistant
          </button>
        )}
        {!isApprovalEditor && (
          <button
            type="button"
            onClick={() => setLearnOpen(true)}
            className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-[12px] font-medium text-[var(--muted-fg)] transition-colors hover:bg-[var(--muted)] hover:text-[var(--foreground)]"
          >
            <BookOpen className="h-3.5 w-3.5 shrink-0 text-sky-600" />
            Learn about workflows
          </button>
        )}
        <button
          type="button"
          onClick={startTour}
          className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-[12px] font-medium text-[var(--muted-fg)] transition-colors hover:bg-[var(--muted)] hover:text-[var(--foreground)]"
        >
          <Sparkles className="h-3.5 w-3.5 shrink-0 text-[var(--accent)]" />
          Take a tour
        </button>
      </footer>

      {!isApprovalEditor && (
        <WorkflowLearnModal open={learnOpen} onClose={() => setLearnOpen(false)} />
      )}
    </aside>
  );
}

function DraggableCard({
  item,
  category,
}: {
  item: PaletteItem;
  category: PaletteCategory;
}) {
  const Icon = item.icon;
  const nodes = useWorkflowStore((s) => s.nodes);
  const placement = canPlaceAnywhere(item.kind, nodes);
  const disabled = item.comingSoon || !placement.valid;

  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: item.dragId,
    data: { kind: item.kind, preset: item.preset, source: "palette" },
    disabled,
  });

  const reason = item.comingSoon
    ? "Coming soon"
    : placement.valid
      ? `Drag ${item.label} into the canvas`
      : placement.reason;

  return (
    <div
      ref={setNodeRef}
      {...attributes}
      {...listeners}
      role="button"
      aria-label={`Drag ${item.label}`}
      aria-disabled={disabled}
      title={reason}
      className={cn(
        "flex items-center gap-2.5 rounded-xl border bg-white p-2.5 transition-all duration-150",
        disabled
          ? "cursor-not-allowed border-[var(--border)] opacity-55"
          : "cursor-grab border-[var(--border)] hover:-translate-y-px hover:border-[var(--border-strong)] hover:shadow-[var(--shadow-card-hover)] active:cursor-grabbing active:translate-y-0 active:shadow-[var(--shadow-sm)]",
        isDragging && "opacity-40",
      )}
    >
      <span
        className={cn(
          "flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ring-1 transition-colors",
          paletteIconTileClass(category, { disabled }),
        )}
      >
        <Icon className="h-4 w-4" />
      </span>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-1.5">
          <span className="text-[12.5px] font-semibold leading-tight text-[var(--foreground)]">
            {item.label}
          </span>
          {item.comingSoon && (
            <span className="rounded bg-[var(--muted)] px-1.5 py-0.5 text-[9.5px] font-semibold uppercase tracking-[0.04em] text-[var(--muted-fg)]">
              Soon
            </span>
          )}
        </div>
      </div>
      <GripVertical
        className={cn(
          "h-3.5 w-3.5 shrink-0",
          disabled ? "text-[var(--border-strong)]" : "text-[var(--muted-fg)]",
        )}
      />
    </div>
  );
}
