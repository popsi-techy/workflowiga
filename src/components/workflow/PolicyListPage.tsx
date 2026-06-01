"use client";

import { useMemo, useState } from "react";
import { Plus, ShieldCheck, Workflow, Trash2, Search, CheckCircle2, CircleSlash } from "lucide-react";
import { cn } from "@/lib/cn";
import { useWorkflowStore } from "@/lib/workflow/store";
import type { Policy } from "@/lib/workflow/types";

function formatDate(iso: string): string {
  try {
    return new Date(iso).toLocaleDateString(undefined, {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  } catch {
    return iso;
  }
}

export function PolicyListPage() {
  const listType = useWorkflowStore((s) => s.listType);
  const policies = useWorkflowStore((s) => s.policies);
  const createPolicy = useWorkflowStore((s) => s.createPolicy);
  const openPolicy = useWorkflowStore((s) => s.openPolicy);
  const deletePolicy = useWorkflowStore((s) => s.deletePolicy);
  const setPolicyStatus = useWorkflowStore((s) => s.setPolicyStatus);
  const showToast = useWorkflowStore((s) => s.showToast);
  const requestConfirm = useWorkflowStore((s) => s.requestConfirm);
  const [query, setQuery] = useState("");

  const rows = useMemo(() => {
    const term = query.trim().toLowerCase();
    return policies
      .filter((p) => p.type === listType)
      .filter((p) => !term || p.name.toLowerCase().includes(term))
      .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
  }, [policies, listType, query]);

  const isApproval = listType === "approval";
  const HeaderIcon = isApproval ? ShieldCheck : Workflow;
  const title = isApproval ? "Approval Policies" : "Workflow Policies";
  const subtitle = isApproval
    ? "Reusable approver chains you can link from any workflow"
    : "Lifecycle automations for joiner, mover and leaver events";

  function onDelete(e: React.MouseEvent, p: Policy) {
    e.stopPropagation();
    requestConfirm({
      title: `Delete "${p.name}"?`,
      message: "This policy and its canvas will be permanently removed.",
      confirmLabel: "Delete",
      tone: "danger",
      onConfirm: () => deletePolicy(p.id),
    });
  }

  function onToggleStatus(e: React.MouseEvent, p: Policy) {
    e.stopPropagation();
    if (p.status === "active") {
      setPolicyStatus(p.id, "draft");
      showToast(`"${p.name}" deactivated`, "default");
    } else {
      setPolicyStatus(p.id, "active");
      showToast(`"${p.name}" activated`, "success");
    }
  }

  const activeCount = rows.filter((p) => p.status === "active").length;

  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-y-auto bg-[var(--surface-sunken)] scrollbar-thin">
      <div className="mx-auto w-full max-w-[1080px] px-8 py-10">
        {/* Heading */}
        <div className="flex items-start justify-between gap-6">
          <div className="flex items-center gap-3.5">
            <span
              className={cn(
                "flex h-12 w-12 items-center justify-center rounded-2xl ring-1",
                isApproval
                  ? "bg-emerald-50 text-emerald-700 ring-emerald-100"
                  : "bg-[var(--accent-soft)] text-[var(--accent)] ring-[var(--accent)]/15",
              )}
            >
              <HeaderIcon className="h-5 w-5" />
            </span>
            <div className="flex flex-col gap-0.5">
              <h1 className="text-[22px] font-semibold leading-tight tracking-[-0.01em] text-[var(--foreground)]">
                {title}
              </h1>
              <p className="text-[13px] leading-snug text-[var(--muted-fg)]">{subtitle}</p>
            </div>
          </div>
          <button
            onClick={() => createPolicy(listType)}
            className="flex h-10 shrink-0 items-center gap-1.5 rounded-lg bg-[var(--accent)] px-4 text-[13px] font-semibold text-white shadow-[var(--shadow-sm)] transition-all duration-150 hover:bg-[var(--accent-hover)] hover:shadow-[var(--shadow-card-hover)] active:scale-[0.98]"
          >
            <Plus className="h-4 w-4" strokeWidth={2.25} />
            New {isApproval ? "Approval" : "Workflow"} Policy
          </button>
        </div>

        {/* Toolbar: search + count */}
        <div className="mt-8 flex items-center justify-between gap-4">
          <div className="group flex h-9 items-center gap-2 rounded-lg border border-[var(--border)] bg-white px-3 shadow-[var(--shadow-xs)] transition-colors focus-within:border-[var(--accent)] focus-within:shadow-[var(--ring-accent)] sm:w-[320px]">
            <Search className="h-3.5 w-3.5 shrink-0 text-[var(--muted-fg)]" />
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={`Search ${title.toLowerCase()}…`}
              className="min-w-0 flex-1 bg-transparent text-[13px] outline-none placeholder:text-[var(--muted-fg)]"
            />
          </div>
          <p className="shrink-0 text-[12px] tabular-nums text-[var(--muted-fg)]">
            {rows.length} {rows.length === 1 ? "policy" : "policies"}
            {activeCount > 0 && (
              <span className="text-[var(--muted-fg)]/70"> · {activeCount} active</span>
            )}
          </p>
        </div>

        {/* List */}
        <div className="mt-4 overflow-hidden rounded-2xl border border-[var(--border)] bg-white shadow-[var(--shadow-card)]">
          {/* Column header */}
          <div className="grid grid-cols-[minmax(0,1fr)_120px_88px_140px_72px] items-center gap-4 border-b border-[var(--border)] bg-[var(--surface-subtle)] px-5 py-2.5 text-[10.5px] font-semibold uppercase tracking-[0.04em] text-[var(--muted-fg)]">
            <span>Name</span>
            <span>Status</span>
            <span className="text-right tabular-nums">Blocks</span>
            <span>Last updated</span>
            <span className="text-right">Actions</span>
          </div>

          {rows.map((p) => (
            <div
              key={p.id}
              role="button"
              tabIndex={0}
              onClick={() => openPolicy(p.id)}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  openPolicy(p.id);
                }
              }}
              className="group grid cursor-pointer grid-cols-[minmax(0,1fr)_120px_88px_140px_72px] items-center gap-4 border-b border-[var(--border)] px-5 py-3.5 transition-colors duration-100 last:border-0 hover:bg-[var(--surface-subtle)]"
            >
              <div className="flex min-w-0 items-center">
                <span className="truncate text-[13.5px] font-semibold text-[var(--foreground)]">
                  {p.name}
                </span>
              </div>
              <div>
                <StatusBadge status={p.status} />
              </div>
              <span className="text-right text-[13px] tabular-nums text-[var(--muted-fg)]">
                {p.nodes.length}
              </span>
              <span className="text-[12.5px] text-[var(--muted-fg)]">
                {formatDate(p.updatedAt)}
              </span>
              <div className="flex items-center justify-end gap-0.5">
                <button
                  onClick={(e) => onToggleStatus(e, p)}
                  aria-label={`${p.status === "active" ? "Deactivate" : "Activate"} ${p.name}`}
                  title={p.status === "active" ? "Deactivate" : "Activate"}
                  className={cn(
                    "inline-flex h-7 w-7 items-center justify-center rounded-md text-[var(--muted-fg)] opacity-0 transition-all group-hover:opacity-100 focus-visible:opacity-100",
                    p.status === "active"
                      ? "hover:bg-amber-50 hover:text-[#9A3412]"
                      : "hover:bg-emerald-50 hover:text-emerald-700",
                  )}
                >
                  {p.status === "active" ? (
                    <CircleSlash className="h-3.5 w-3.5" />
                  ) : (
                    <CheckCircle2 className="h-3.5 w-3.5" />
                  )}
                </button>
                <button
                  onClick={(e) => onDelete(e, p)}
                  aria-label={`Delete ${p.name}`}
                  className="inline-flex h-7 w-7 items-center justify-center rounded-md text-[var(--muted-fg)] opacity-0 transition-all hover:bg-red-50 hover:text-red-600 group-hover:opacity-100 focus-visible:opacity-100"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>
          ))}

          {rows.length === 0 && (
            <div className="flex flex-col items-center justify-center gap-2 px-6 py-16 text-center">
              <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[var(--muted)] text-[var(--muted-fg)]">
                <HeaderIcon className="h-5 w-5" />
              </span>
              <p className="mt-1 text-[13.5px] font-semibold text-[var(--foreground)]">
                {query ? "No matching policies" : "No policies yet"}
              </p>
              <p className="max-w-[280px] text-[12.5px] leading-relaxed text-[var(--muted-fg)]">
                {query
                  ? "Try a different search term."
                  : `Create your first ${isApproval ? "approval" : "workflow"} policy to get started.`}
              </p>
              {!query && (
                <button
                  onClick={() => createPolicy(listType)}
                  className="mt-2 flex h-9 items-center gap-1.5 rounded-lg bg-[var(--accent)] px-3.5 text-[13px] font-semibold text-white shadow-[var(--shadow-sm)] transition-all hover:bg-[var(--accent-hover)] active:scale-[0.98]"
                >
                  <Plus className="h-4 w-4" strokeWidth={2.25} />
                  New {isApproval ? "Approval" : "Workflow"} Policy
                </button>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function StatusBadge({ status }: { status: Policy["status"] }) {
  const active = status === "active";
  return (
    <span
      className={cn(
        "inline-flex h-6 items-center gap-1 rounded-md px-2 text-[11px] font-medium ring-1",
        active
          ? "bg-emerald-50 text-emerald-700 ring-emerald-200"
          : "bg-[var(--draft-bg)] text-[#854D0E] ring-amber-200",
      )}
    >
      <span
        className={cn(
          "inline-block h-1.5 w-1.5 rounded-full",
          active ? "bg-emerald-500" : "bg-[var(--draft)]",
        )}
      />
      {active ? "Active" : "Draft"}
    </span>
  );
}
