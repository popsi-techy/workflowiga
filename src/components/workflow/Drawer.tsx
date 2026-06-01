"use client";

import { useEffect } from "react";
import { X } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/cn";
import {
  PALETTE_TONES,
  paletteIconTileClass,
  type PaletteCategory,
} from "@/lib/workflow/palette-tones";
import { ConfigInfoTip } from "./config/config-layout";

interface DrawerProps {
  open: boolean;
  onClose: () => void;
  title: string;
  description?: string;
  icon?: LucideIcon;
  iconCategory?: PaletteCategory;
  countChip?: string | number;
  /** Width in px. Default 620. */
  width?: number;
  children: React.ReactNode;
  /** Optional sticky footer (e.g. Cancel / Apply buttons). When omitted, a
   *  default "Save" button (which closes the drawer) is shown. */
  footer?: React.ReactNode;
  /** Label for the default Save button. */
  saveLabel?: string;
  /** Hide the default footer entirely (e.g. read-only drawers). */
  hideFooter?: boolean;
}

export function Drawer({
  open,
  onClose,
  title,
  description,
  icon: Icon,
  iconCategory = "tasks",
  countChip,
  width = 620,
  children,
  footer,
  saveLabel = "Save",
  hideFooter,
}: DrawerProps) {
  const tone = PALETTE_TONES[iconCategory];
  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  return (
    <>
      {/* Backdrop */}
      <div
        onClick={onClose}
        aria-hidden={!open}
        className={cn(
          "fixed inset-0 z-40 bg-slate-900/20 backdrop-blur-[1px] transition-opacity duration-200",
          open ? "opacity-100" : "pointer-events-none opacity-0",
        )}
      />
      {/* Panel */}
      <aside
        role="dialog"
        aria-modal="true"
        aria-label={title}
        style={{ width: `${width}px` }}
        className={cn(
          "fixed bottom-0 right-0 top-0 z-50 flex flex-col border-l border-[var(--border)] bg-white shadow-[var(--shadow-pop)] transition-transform duration-200 ease-[cubic-bezier(0.22,1,0.36,1)]",
          open ? "translate-x-0" : "translate-x-full",
        )}
      >
        <header className="flex h-12 shrink-0 items-center gap-2 border-b border-[var(--border)] px-3.5">
          {Icon && (
            <span
              className={cn(
                "flex h-7 w-7 items-center justify-center rounded-lg",
                paletteIconTileClass(iconCategory),
              )}
            >
              <Icon className="h-3.5 w-3.5" />
            </span>
          )}
          <div className="flex min-w-0 flex-1 items-center gap-1">
            <h2 className="min-w-0 truncate text-[13px] font-semibold leading-tight text-[var(--foreground)]">
              {title}
            </h2>
            {description && <ConfigInfoTip text={description} />}
          </div>
          {countChip != null && (
            <span
              className={cn(
                "inline-flex h-6 min-w-[28px] items-center justify-center rounded-full px-2 text-[11.5px] font-semibold",
                tone.countChip,
              )}
            >
              {countChip}
            </span>
          )}
          <button
            onClick={onClose}
            aria-label="Close"
            className="flex h-8 w-8 items-center justify-center rounded-md text-[var(--muted-fg)] hover:bg-[var(--muted)]"
          >
            <X className="h-4 w-4" />
          </button>
        </header>
        <div className="flex-1 overflow-y-auto px-3.5 py-3 scrollbar-thin">
          {children}
        </div>
        {!hideFooter && (
          <footer className="flex h-12 shrink-0 items-center justify-end gap-2 border-t border-[var(--border)] bg-[var(--surface-subtle)] px-3.5">
            {footer ?? (
              <button
                type="button"
                onClick={onClose}
                className="inline-flex h-8 items-center justify-center rounded-md bg-[var(--accent)] px-4 text-[12.5px] font-semibold text-white shadow-sm transition-colors hover:bg-[var(--accent-hover)]"
              >
                {saveLabel}
              </button>
            )}
          </footer>
        )}
      </aside>
    </>
  );
}
