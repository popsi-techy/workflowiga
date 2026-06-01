"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import {
  ChevronsRight,
  History,
  MoreVertical,
  Eye,
  Pencil,
  CheckCircle2,
  Clock,
  User,
} from "lucide-react";
import { cn } from "@/lib/cn";
import { ConfigInfoTip } from "./config/config-layout";
import { useWorkflowStore } from "@/lib/workflow/store";
import type { WorkflowVersion } from "@/lib/workflow/types";

export function VersionsPanel() {
  const versions = useWorkflowStore((s) => s.versions);
  const loadVersion = useWorkflowStore((s) => s.loadVersion);
  const showToast = useWorkflowStore((s) => s.showToast);
  const setRightPanelOpen = useWorkflowStore((s) => s.setRightPanelOpen);

  const { active, history } = useMemo(() => {
    const active = versions.find((v) => v.isActive) ?? null;
    const history = versions
      .filter((v) => !v.isActive)
      .sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1));
    return { active, history };
  }, [versions]);

  function open(version: WorkflowVersion, opts: { edit?: boolean } = {}) {
    loadVersion(version.id);
    showToast(
      opts.edit ? `Editing ${version.name}` : `Previewing ${version.name}`,
      "default",
    );
  }

  return (
    <aside className="flex h-full w-[400px] flex-col border-l border-[var(--border)] bg-white shadow-[-8px_0_16px_-12px_rgba(15,23,42,0.08)]">
      <header className="flex shrink-0 items-center gap-2 border-b border-[var(--border)] px-3 py-2">
        <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-[var(--muted)] text-[var(--foreground)]">
          <History className="h-3.5 w-3.5" />
        </span>
        <div className="flex min-w-0 flex-1 items-center gap-1">
          <h2 className="min-w-0 truncate text-[13px] font-semibold leading-tight text-[var(--foreground)]">
            Version History
          </h2>
          <ConfigInfoTip text="Saved snapshots of this workflow" />
        </div>
        <span className="inline-flex h-6 items-center rounded-md bg-[var(--muted)] px-2 text-[11px] font-semibold text-[var(--muted-fg)]">
          {versions.length}
        </span>
        <button
          onClick={() => setRightPanelOpen(false)}
          className="flex h-8 w-8 items-center justify-center rounded-md text-[var(--muted-fg)] hover:bg-[var(--muted)]"
          aria-label="Close panel"
        >
          <ChevronsRight className="h-4 w-4" />
        </button>
      </header>

      <div className="flex-1 overflow-y-auto px-4 py-4 scrollbar-thin">
        {versions.length === 0 ? (
          <EmptyState />
        ) : (
          <div className="flex flex-col gap-5">
            {active && (
              <section>
                <SectionHeader title="Active Version" />
                <VersionCard
                  version={active}
                  onOpen={() => open(active)}
                  onPreview={() => open(active)}
                  onEdit={() => open(active, { edit: true })}
                />
              </section>
            )}

            {history.length > 0 && (
              <section>
                <SectionHeader
                  title="Version History"
                  trailing={`${history.length} version${
                    history.length === 1 ? "" : "s"
                  }`}
                />
                <div className="flex flex-col gap-2">
                  {history.map((v) => (
                    <VersionCard
                      key={v.id}
                      version={v}
                      onOpen={() => open(v)}
                      onPreview={() => open(v)}
                      onEdit={() => open(v, { edit: true })}
                    />
                  ))}
                </div>
              </section>
            )}
          </div>
        )}
      </div>
    </aside>
  );
}

function SectionHeader({
  title,
  trailing,
}: {
  title: string;
  trailing?: string;
}) {
  return (
    <div className="mb-2 flex items-baseline justify-between px-1">
      <p className="text-[11px] font-semibold uppercase tracking-wide text-[var(--muted-fg)]">
        {title}
      </p>
      {trailing && (
        <p className="text-[11px] text-[var(--muted-fg)]/80">{trailing}</p>
      )}
    </div>
  );
}

function EmptyState() {
  return (
    <div className="flex h-full flex-col items-center justify-center gap-2 px-6 py-12 text-center">
      <span className="flex h-12 w-12 items-center justify-center rounded-full bg-[var(--muted)] text-[var(--muted-fg)]">
        <History className="h-5 w-5" />
      </span>
      <p className="text-[13px] font-semibold text-[var(--foreground)]">
        No versions yet
      </p>
      <p className="max-w-[260px] text-[12px] text-[var(--muted-fg)]">
        Click <strong className="font-medium text-[var(--foreground)]">Save</strong> to capture
        the first snapshot of this workflow.
      </p>
    </div>
  );
}

function VersionCard({
  version,
  onOpen,
  onPreview,
  onEdit,
}: {
  version: WorkflowVersion;
  onOpen: () => void;
  onPreview: () => void;
  onEdit: () => void;
}) {
  return (
    <div
      className={cn(
        "group relative rounded-lg border bg-white transition-all hover:shadow-sm",
        version.isActive
          ? "border-emerald-300 ring-1 ring-emerald-200"
          : "border-[var(--border)] hover:border-[var(--border-strong)]",
      )}
    >
      <button
        onClick={onOpen}
        className="flex w-full items-start gap-3 p-3 text-left"
      >
        <span
          className={cn(
            "mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-md text-[12px] font-semibold",
            version.isActive
              ? "bg-emerald-50 text-emerald-700"
              : "bg-[var(--muted)] text-[var(--muted-fg)]",
          )}
          aria-hidden
        >
          {versionNumber(version.name)}
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <span className="text-[13px] font-semibold text-[var(--foreground)]">
              {version.name}
            </span>
            {version.isActive && (
              <span className="inline-flex h-5 items-center gap-1 rounded-md bg-emerald-50 px-1.5 text-[10.5px] font-medium text-emerald-700 ring-1 ring-emerald-200">
                <CheckCircle2 className="h-3 w-3" />
                Active
              </span>
            )}
          </div>
          <div className="mt-1 flex items-center gap-1.5 text-[11.5px] text-[var(--muted-fg)]">
            <Clock className="h-3 w-3" />
            <span>{formatDate(version.createdAt)}</span>
          </div>
          <div className="mt-0.5 flex items-center gap-1.5 text-[11.5px] text-[var(--muted-fg)]">
            <User className="h-3 w-3" />
            <span>{version.createdBy}</span>
          </div>
        </div>
      </button>
      <KebabMenu onPreview={onPreview} onEdit={onEdit} />
    </div>
  );
}

function KebabMenu({
  onPreview,
  onEdit,
}: {
  onPreview: () => void;
  onEdit: () => void;
}) {
  const btnRef = useRef<HTMLButtonElement | null>(null);
  const [open, setOpen] = useState(false);
  const [pos, setPos] = useState<{ left: number; top: number } | null>(null);

  function openMenu(e: React.MouseEvent) {
    e.stopPropagation();
    if (!btnRef.current) return;
    const r = btnRef.current.getBoundingClientRect();
    const width = 180;
    const left = Math.min(window.innerWidth - width - 12, r.right - width);
    setPos({ left, top: r.bottom + 6 });
    setOpen(true);
  }

  useEffect(() => {
    if (!open) return;
    function onDown(e: MouseEvent) {
      // Close on any outside click. The menu items handle their own logic
      // via the buttons before this listener fires (mousedown vs click race
      // — defer attachment to the next tick).
      const target = e.target as HTMLElement | null;
      if (target?.closest("[data-kebab-menu]")) return;
      setOpen(false);
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
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
  }, [open]);

  return (
    <>
      <button
        ref={btnRef}
        onClick={openMenu}
        aria-label="Version actions"
        className="absolute right-2 top-2 flex h-7 w-7 items-center justify-center rounded-md text-[var(--muted-fg)] opacity-0 transition-opacity hover:bg-[var(--muted)] hover:text-[var(--foreground)] group-hover:opacity-100 focus:opacity-100 aria-expanded:opacity-100"
        aria-expanded={open}
      >
        <MoreVertical className="h-4 w-4" />
      </button>
      {open && pos && typeof document !== "undefined"
        ? createPortal(
            <div
              data-kebab-menu
              role="menu"
              style={{ position: "fixed", left: pos.left, top: pos.top, width: 180 }}
              className="z-50 rounded-md border border-[var(--border)] bg-white p-1 shadow-xl ring-1 ring-black/5"
            >
              <MenuItem
                icon={Eye}
                label="View preview"
                onClick={() => {
                  setOpen(false);
                  onPreview();
                }}
              />
              <MenuItem
                icon={Pencil}
                label="Edit"
                onClick={() => {
                  setOpen(false);
                  onEdit();
                }}
              />
            </div>,
            document.body,
          )
        : null}
    </>
  );
}

function MenuItem({
  icon: Icon,
  label,
  onClick,
}: {
  icon: typeof Eye;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      role="menuitem"
      onClick={onClick}
      className="flex w-full items-center gap-2 rounded-sm px-2 py-1.5 text-left text-[12.5px] text-[var(--foreground)] hover:bg-[var(--muted)]"
    >
      <Icon className="h-3.5 w-3.5 text-[var(--muted-fg)]" />
      {label}
    </button>
  );
}

function versionNumber(name: string): string {
  const m = /(\d+)/.exec(name);
  return m ? `v${m[1]}` : name.slice(0, 2);
}

function formatDate(iso: string): string {
  try {
    const d = new Date(iso);
    return new Intl.DateTimeFormat("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "numeric",
      minute: "2-digit",
    }).format(d);
  } catch {
    return iso;
  }
}
