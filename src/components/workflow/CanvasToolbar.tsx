"use client";

import { Minus, Plus, Maximize2, Undo2, Redo2 } from "lucide-react";
import { useWorkflowStore, canRedo, canUndo } from "@/lib/workflow/store";
import { cn } from "@/lib/cn";

export function CanvasToolbar() {
  const view = useWorkflowStore((s) => s.view);
  const setView = useWorkflowStore((s) => s.setView);
  const zoom = useWorkflowStore((s) => s.zoom);
  const setZoom = useWorkflowStore((s) => s.setZoom);
  const undo = useWorkflowStore((s) => s.undo);
  const redo = useWorkflowStore((s) => s.redo);
  const canU = useWorkflowStore(canUndo);
  const canR = useWorkflowStore(canRedo);

  return (
    <div className="pointer-events-none absolute bottom-4 left-4 right-4 flex items-end justify-between">
      <div className="pointer-events-auto flex items-center gap-2 rounded-lg border border-[var(--border)] bg-white px-1.5 py-1 shadow-sm">
        <Segmented
          value={view}
          onChange={setView}
          options={[
            { value: "outline", label: "Outline" },
            { value: "detailed", label: "Detailed" },
          ]}
        />
        <Divider />
        <IconButton onClick={() => setZoom(zoom - 0.1)} label="Zoom out">
          <Minus className="h-3.5 w-3.5" />
        </IconButton>
        <button
          onClick={() => setZoom(1)}
          className="rounded px-1.5 text-[12px] font-medium text-[var(--foreground)] hover:bg-[var(--muted)]"
        >
          {Math.round(zoom * 100)}%
        </button>
        <IconButton onClick={() => setZoom(zoom + 0.1)} label="Zoom in">
          <Plus className="h-3.5 w-3.5" />
        </IconButton>
        <IconButton onClick={() => setZoom(1)} label="Fit">
          <Maximize2 className="h-3.5 w-3.5" />
        </IconButton>
        <Divider />
        <IconButton onClick={undo} disabled={!canU} label="Undo">
          <Undo2 className="h-3.5 w-3.5" />
        </IconButton>
        <IconButton onClick={redo} disabled={!canR} label="Redo">
          <Redo2 className="h-3.5 w-3.5" />
        </IconButton>
      </div>
    </div>
  );
}

function Segmented<T extends string>({
  value,
  onChange,
  options,
}: {
  value: T;
  onChange: (v: T) => void;
  options: { value: T; label: string }[];
}) {
  return (
    <div className="flex items-center rounded-md bg-[var(--muted)] p-0.5">
      {options.map((o) => (
        <button
          key={o.value}
          onClick={() => onChange(o.value)}
          className={cn(
            "h-6 rounded px-2 text-[12px] font-medium transition-colors",
            value === o.value
              ? "bg-white text-[var(--foreground)] shadow-sm"
              : "text-[var(--muted-fg)] hover:text-[var(--foreground)]",
          )}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

function IconButton({
  children,
  onClick,
  label,
  disabled,
}: {
  children: React.ReactNode;
  onClick?: () => void;
  label: string;
  disabled?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      aria-label={label}
      title={label}
      className="flex h-7 w-7 items-center justify-center rounded text-[var(--muted-fg)] transition-colors hover:bg-[var(--muted)] hover:text-[var(--foreground)] disabled:cursor-not-allowed disabled:opacity-40"
    >
      {children}
    </button>
  );
}

function Divider() {
  return <span className="mx-0.5 h-5 w-px bg-[var(--border)]" />;
}
