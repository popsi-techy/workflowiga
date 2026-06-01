"use client";

import { useEffect } from "react";
import { createPortal } from "react-dom";
import { AlertTriangle, X } from "lucide-react";
import { cn } from "@/lib/cn";
import { useWorkflowStore } from "@/lib/workflow/store";

export function ConfirmDialog() {
  const confirm = useWorkflowStore((s) => s.confirm);
  const close = useWorkflowStore((s) => s.closeConfirm);

  useEffect(() => {
    if (!confirm) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") close();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [confirm, close]);

  if (!confirm || typeof document === "undefined") return null;

  const tone = confirm.tone ?? "default";
  const confirmLabel = confirm.confirmLabel ?? "Confirm";
  const cancelLabel = confirm.cancelLabel ?? "Cancel";

  function onConfirm() {
    confirm?.onConfirm();
    close();
  }

  return createPortal(
    <div
      role="presentation"
      className="fixed inset-0 z-[60] flex items-center justify-center px-4"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) close();
      }}
    >
      <div
        aria-hidden
        className="absolute inset-0 bg-slate-900/35 backdrop-blur-[1px]"
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={`confirm-${confirm.id}-title`}
        aria-describedby={`confirm-${confirm.id}-body`}
        className="node-enter relative w-[420px] max-w-full overflow-hidden rounded-xl border border-[var(--border)] bg-white shadow-2xl"
      >
        <div className="flex items-start gap-3 px-5 pt-5">
          <span
            className={cn(
              "flex h-9 w-9 shrink-0 items-center justify-center rounded-full",
              tone === "danger"
                ? "bg-red-50 text-red-600 ring-1 ring-red-200"
                : "bg-[var(--accent-soft)] text-[var(--accent)] ring-1 ring-[var(--accent)]/30",
            )}
          >
            <AlertTriangle className="h-4 w-4" />
          </span>
          <div className="min-w-0 flex-1">
            <h2
              id={`confirm-${confirm.id}-title`}
              className="text-[14.5px] font-semibold text-[var(--foreground)]"
            >
              {confirm.title}
            </h2>
            <p
              id={`confirm-${confirm.id}-body`}
              className="mt-1 text-[12.5px] leading-relaxed text-[var(--muted-fg)]"
            >
              {confirm.message}
            </p>
          </div>
          <button
            onClick={close}
            aria-label="Close"
            className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md text-[var(--muted-fg)] hover:bg-[var(--muted)] hover:text-[var(--foreground)]"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
        <footer className="mt-4 flex items-center justify-end gap-2 border-t border-[var(--border)] bg-[var(--muted)]/30 px-5 py-3">
          <button
            onClick={close}
            className="h-9 rounded-md border border-[var(--border)] bg-white px-3.5 text-[13px] font-medium text-[var(--foreground)] hover:bg-[var(--muted)]"
          >
            {cancelLabel}
          </button>
          <button
            onClick={onConfirm}
            autoFocus
            className={cn(
              "h-9 rounded-md px-3.5 text-[13px] font-semibold text-white transition-colors",
              tone === "danger"
                ? "bg-red-600 hover:bg-red-700"
                : "bg-[var(--accent)] hover:bg-[var(--accent-hover)]",
            )}
          >
            {confirmLabel}
          </button>
        </footer>
      </div>
    </div>,
    document.body,
  );
}
