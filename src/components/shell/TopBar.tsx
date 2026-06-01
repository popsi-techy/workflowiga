"use client";

import { useEffect, useRef, useState } from "react";
import { ChevronRight, ChevronDown, Grid3x3, Workflow, ShieldCheck } from "lucide-react";
import { cn } from "@/lib/cn";
import { useWorkflowStore } from "@/lib/workflow/store";
import type { PolicyType } from "@/lib/workflow/types";

export function TopBar() {
  const screen = useWorkflowStore((s) => s.screen);
  const listType = useWorkflowStore((s) => s.listType);
  const editorContext = useWorkflowStore((s) => s.editorContext);
  const currentPolicyId = useWorkflowStore((s) => s.currentPolicyId);
  const policies = useWorkflowStore((s) => s.policies);
  const goToList = useWorkflowStore((s) => s.goToList);

  const inEditor = screen === "editor";
  const tableType: PolicyType = inEditor ? editorContext : listType;
  const tableLabel =
    tableType === "approval" ? "Approval Policies" : "Workflow Policies";
  const currentPolicy = policies.find((p) => p.id === currentPolicyId);

  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!menuOpen) return;
    function onDown(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    }
    window.addEventListener("mousedown", onDown);
    return () => window.removeEventListener("mousedown", onDown);
  }, [menuOpen]);

  function pick(type: PolicyType) {
    setMenuOpen(false);
    goToList(type);
  }

  return (
    <header className="flex h-14 shrink-0 items-center justify-between border-b border-[var(--border)] bg-white px-5">
      <div className="flex min-w-0 flex-1 items-center gap-1.5 text-[13px]">
        <button
          className="flex h-7 w-7 items-center justify-center rounded-md text-[var(--muted-fg)] hover:bg-[var(--muted)]"
          aria-label="Workspace"
        >
          <Grid3x3 className="h-4 w-4" />
        </button>

        {/* Automation → dropdown to switch between the two policy tables. */}
        <div className="relative" ref={menuRef}>
          <button
            onClick={() => setMenuOpen((o) => !o)}
            aria-haspopup="menu"
            aria-expanded={menuOpen}
            className={cn(
              "flex items-center gap-0.5 rounded px-1 text-[#1d4ed8] transition-colors hover:underline",
              menuOpen && "underline",
            )}
          >
            Automation
            <ChevronDown
              className={cn(
                "h-3.5 w-3.5 transition-transform",
                menuOpen && "rotate-180",
              )}
            />
          </button>
          {menuOpen && (
            <div
              role="menu"
              className="absolute left-0 top-full z-50 mt-1 w-52 overflow-hidden rounded-lg border border-[var(--border)] bg-white py-1 shadow-xl ring-1 ring-black/5"
            >
              <MenuItem
                icon={Workflow}
                label="Workflow Policies"
                active={tableType === "workflow"}
                onClick={() => pick("workflow")}
              />
              <MenuItem
                icon={ShieldCheck}
                label="Approval Policies"
                active={tableType === "approval"}
                onClick={() => pick("approval")}
              />
            </div>
          )}
        </div>

        <Sep />
        {inEditor ? (
          <>
            <Crumb label={tableLabel} onClick={() => goToList(tableType)} />
            <Sep />
            <Crumb label={currentPolicy?.name ?? "Editor"} current />
          </>
        ) : (
          <Crumb label={tableLabel} current />
        )}
      </div>
      <div className="flex items-center gap-3">
        <button
          className="flex h-8 w-8 items-center justify-center rounded-md text-[var(--muted-fg)] hover:bg-[var(--muted)]"
          aria-label="Apps"
        >
          <Grid3x3 className="h-4 w-4" />
        </button>
        <button
          className="flex h-8 w-8 items-center justify-center rounded-full bg-[#FEE5D9] text-[12px] font-semibold text-[#9A3412] ring-1 ring-[var(--border)]"
          aria-label="User menu"
        >
          AK
        </button>
      </div>
    </header>
  );
}

function MenuItem({
  icon: Icon,
  label,
  active,
  onClick,
}: {
  icon: typeof Workflow;
  label: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      role="menuitem"
      onClick={onClick}
      className={cn(
        "flex w-full items-center gap-2 px-3 py-2 text-left text-[13px] transition-colors hover:bg-[var(--muted)]",
        active
          ? "font-semibold text-[var(--foreground)]"
          : "text-[var(--muted-fg)] hover:text-[var(--foreground)]",
      )}
    >
      <Icon
        className={cn(
          "h-4 w-4 shrink-0",
          active ? "text-[var(--accent)]" : "text-[var(--muted-fg)]",
        )}
      />
      {label}
    </button>
  );
}

function Crumb({
  label,
  onClick,
  current,
}: {
  label: string;
  onClick?: () => void;
  current?: boolean;
}) {
  if (current) {
    return (
      <span
        className="min-w-0 max-w-[min(280px,40vw)] truncate px-1 font-medium text-[var(--foreground)]"
        title={label}
      >
        {label}
      </span>
    );
  }
  return (
    <button
      onClick={onClick}
      className="rounded px-1 text-[#1d4ed8] transition-colors hover:underline"
    >
      {label}
    </button>
  );
}

function Sep() {
  return <ChevronRight className="h-3.5 w-3.5 text-[var(--border-strong)]" />;
}
