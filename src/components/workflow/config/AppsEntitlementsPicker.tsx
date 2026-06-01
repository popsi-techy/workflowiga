"use client";

import { useMemo, useState } from "react";
import { Search, Check, ChevronLeft, ChevronRight, Filter as FilterIcon } from "lucide-react";
import { cn } from "@/lib/cn";
import { APPS, entitlementsForApps, getApp } from "@/lib/workflow/mock-data";
import type { EntitlementItem, RiskLevel } from "@/lib/workflow/types";

interface Props {
  appIds: string[];
  entitlementIds: string[];
  onAppsChange: (ids: string[]) => void;
  onEntitlementsChange: (ids: string[]) => void;
}

export function AppsEntitlementsPicker({
  appIds,
  entitlementIds,
  onAppsChange,
  onEntitlementsChange,
}: Props) {
  const [step, setStep] = useState<"apps" | "ents">(
    appIds.length > 0 ? "ents" : "apps",
  );

  return (
    <div>
      <Stepper
        step={step}
        onStepChange={setStep}
        appsCount={appIds.length}
        entsCount={entitlementIds.length}
        canStepEnts={appIds.length > 0}
      />
      <div className="mt-3">
        {step === "apps" ? (
          <AppGrid
            selected={appIds}
            onChange={(ids) => {
              onAppsChange(ids);
              // prune entitlements no longer relevant
              const validEnts = entitlementsForApps(ids).map((e) => e.id);
              const next = entitlementIds.filter((id) => validEnts.includes(id));
              if (next.length !== entitlementIds.length) {
                onEntitlementsChange(next);
              }
            }}
          />
        ) : (
          <EntitlementsTable
            appIds={appIds}
            selected={entitlementIds}
            onChange={onEntitlementsChange}
            onEditApps={() => setStep("apps")}
          />
        )}
      </div>
    </div>
  );
}

function Stepper({
  step,
  onStepChange,
  appsCount,
  entsCount,
  canStepEnts,
}: {
  step: "apps" | "ents";
  onStepChange: (s: "apps" | "ents") => void;
  appsCount: number;
  entsCount: number;
  canStepEnts: boolean;
}) {
  const items = [
    {
      id: "apps" as const,
      label: "Applications",
      caption: appsCount > 0 ? `${appsCount} selected` : "Pick baseline access",
      enabled: true,
    },
    {
      id: "ents" as const,
      label: "Entitlements",
      caption:
        appsCount === 0
          ? "Select apps first"
          : entsCount > 0
            ? `${entsCount} selected`
            : "Optional fine-grained access",
      enabled: canStepEnts,
    },
  ];

  return (
    <div className="flex items-center gap-2 rounded-md border border-[var(--border)] bg-[var(--muted)]/30 p-1">
      {items.map((it, i) => {
        const active = step === it.id;
        return (
          <button
            key={it.id}
            onClick={() => it.enabled && onStepChange(it.id)}
            disabled={!it.enabled}
            className={cn(
              "flex flex-1 items-center gap-2 rounded px-2.5 py-1.5 text-left transition-colors",
              active && "bg-white shadow-sm",
              !it.enabled && "cursor-not-allowed opacity-60",
            )}
          >
            <span
              className={cn(
                "flex h-5 w-5 items-center justify-center rounded-full text-[11px] font-semibold",
                active
                  ? "bg-[var(--accent)] text-white"
                  : "bg-[var(--muted)] text-[var(--muted-fg)]",
              )}
            >
              {i + 1}
            </span>
            <div className="min-w-0">
              <p className="text-[12.5px] font-semibold text-[var(--foreground)]">
                {it.label}
              </p>
              <p className="truncate text-[11px] text-[var(--muted-fg)]">
                {it.caption}
              </p>
            </div>
          </button>
        );
      })}
    </div>
  );
}

function AppGrid({
  selected,
  onChange,
}: {
  selected: string[];
  onChange: (ids: string[]) => void;
}) {
  const [q, setQ] = useState("");
  const filtered = useMemo(() => {
    const term = q.trim().toLowerCase();
    if (!term) return APPS;
    return APPS.filter(
      (a) =>
        a.name.toLowerCase().includes(term) ||
        a.category.toLowerCase().includes(term),
    );
  }, [q]);

  function toggle(id: string) {
    if (selected.includes(id)) onChange(selected.filter((x) => x !== id));
    else onChange([...selected, id]);
  }

  return (
    <div>
      <SearchInput value={q} onChange={setQ} placeholder="Search applications" />
      <div className="mt-3 grid grid-cols-2 gap-2">
        {filtered.map((app) => {
          const sel = selected.includes(app.id);
          return (
            <button
              key={app.id}
              onClick={() => toggle(app.id)}
              className={cn(
                "group relative flex items-start gap-2.5 rounded-lg border bg-white p-2.5 text-left transition-all",
                sel
                  ? "border-[var(--accent)] bg-[var(--accent-softer)]"
                  : "border-[var(--border)] hover:border-[var(--border-strong)] hover:shadow-sm",
              )}
            >
              <span
                className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md text-[11px] font-bold text-white"
                style={{ backgroundColor: app.color }}
              >
                {app.initials}
              </span>
              <div className="min-w-0 flex-1">
                <div className="flex items-center justify-between gap-1">
                  <span className="truncate text-[12.5px] font-semibold text-[var(--foreground)]">
                    {app.name}
                  </span>
                  <span
                    className={cn(
                      "flex h-4 w-4 shrink-0 items-center justify-center rounded border transition-colors",
                      sel
                        ? "border-[var(--accent)] bg-[var(--accent)] text-white"
                        : "border-[var(--border-strong)] bg-white",
                    )}
                  >
                    {sel && <Check className="h-3 w-3" />}
                  </span>
                </div>
                <p className="mt-0.5 truncate text-[11px] text-[var(--muted-fg)]">
                  {app.category}
                </p>
                <p className="mt-0.5 truncate text-[11px] text-[var(--muted-fg)]">
                  Baseline: {app.baselineAccess}
                </p>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}

function EntitlementsTable({
  appIds,
  selected,
  onChange,
  onEditApps,
}: {
  appIds: string[];
  selected: string[];
  onChange: (ids: string[]) => void;
  onEditApps: () => void;
}) {
  const all = useMemo(() => entitlementsForApps(appIds), [appIds]);
  const [q, setQ] = useState("");
  const [risk, setRisk] = useState<RiskLevel | "all">("all");
  const [page, setPage] = useState(1);
  const PAGE_SIZE = 8;

  const filtered = useMemo(() => {
    const term = q.trim().toLowerCase();
    return all.filter((e) => {
      if (risk !== "all" && e.risk !== risk) return false;
      if (term && !e.name.toLowerCase().includes(term)) return false;
      return true;
    });
  }, [all, q, risk]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const safePage = Math.min(page, totalPages);
  const paged = filtered.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);

  function toggle(id: string) {
    if (selected.includes(id)) onChange(selected.filter((x) => x !== id));
    else onChange([...selected, id]);
  }

  const allOnPageSelected =
    paged.length > 0 && paged.every((e) => selected.includes(e.id));
  function togglePage() {
    if (allOnPageSelected) {
      onChange(selected.filter((id) => !paged.some((p) => p.id === id)));
    } else {
      const ids = new Set(selected);
      paged.forEach((p) => ids.add(p.id));
      onChange(Array.from(ids));
    }
  }

  if (appIds.length === 0) {
    return (
      <EmptyState
        title="Select applications first"
        body="Entitlements are scoped to the applications you've added."
        actionLabel="Add Apps"
        onAction={onEditApps}
      />
    );
  }

  return (
    <div>
      <div className="flex items-center gap-2">
        <SearchInput
          value={q}
          onChange={setQ}
          placeholder="Search entitlements"
          className="flex-1"
        />
        <FilterDropdown
          value={risk}
          onChange={setRisk}
          options={[
            { value: "all", label: "All risk" },
            { value: "Low", label: "Low" },
            { value: "Medium", label: "Medium" },
            { value: "High", label: "High" },
          ]}
        />
      </div>

      <div className="mt-3 overflow-hidden rounded-lg border border-[var(--border)] bg-white">
        <table className="w-full text-left text-[12.5px]">
          <thead className="bg-[var(--muted)]/50">
            <tr className="text-[11px] font-medium uppercase tracking-wide text-[var(--muted-fg)]">
              <th className="w-8 px-2.5 py-2">
                <Checkbox checked={allOnPageSelected} onChange={togglePage} />
              </th>
              <th className="px-2 py-2">Entitlement</th>
              <th className="px-2 py-2">App</th>
              <th className="px-2 py-2">Type</th>
              <th className="px-2 py-2">Risk</th>
            </tr>
          </thead>
          <tbody>
            {paged.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-4 py-8 text-center text-[var(--muted-fg)]">
                  No entitlements match the current filters
                </td>
              </tr>
            ) : (
              paged.map((e) => <EntRow key={e.id} ent={e} selected={selected.includes(e.id)} onToggle={() => toggle(e.id)} />)
            )}
          </tbody>
        </table>
        <div className="flex items-center justify-between border-t border-[var(--border)] px-3 py-2 text-[11.5px] text-[var(--muted-fg)]">
          <span>
            {filtered.length} entitlement{filtered.length === 1 ? "" : "s"} ·{" "}
            <strong className="text-[var(--foreground)]">{selected.length}</strong>{" "}
            selected
          </span>
          <div className="flex items-center gap-1">
            <button
              disabled={safePage === 1}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              className="flex h-6 w-6 items-center justify-center rounded text-[var(--muted-fg)] hover:bg-[var(--muted)] disabled:cursor-not-allowed disabled:opacity-40"
              aria-label="Previous page"
            >
              <ChevronLeft className="h-3.5 w-3.5" />
            </button>
            <span>
              {safePage} / {totalPages}
            </span>
            <button
              disabled={safePage === totalPages}
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              className="flex h-6 w-6 items-center justify-center rounded text-[var(--muted-fg)] hover:bg-[var(--muted)] disabled:cursor-not-allowed disabled:opacity-40"
              aria-label="Next page"
            >
              <ChevronRight className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function EntRow({
  ent,
  selected,
  onToggle,
}: {
  ent: EntitlementItem;
  selected: boolean;
  onToggle: () => void;
}) {
  const app = getApp(ent.appId);
  return (
    <tr
      onClick={onToggle}
      className={cn(
        "cursor-pointer border-t border-[var(--border)] transition-colors",
        selected ? "bg-[var(--accent-softer)]" : "hover:bg-[var(--muted)]/30",
      )}
    >
      <td className="px-2.5 py-2">
        <Checkbox checked={selected} onChange={onToggle} />
      </td>
      <td className="px-2 py-2 font-medium text-[var(--foreground)]">{ent.name}</td>
      <td className="px-2 py-2 text-[var(--muted-fg)]">
        {app ? (
          <span className="inline-flex items-center gap-1.5">
            <span
              className="flex h-4 w-4 items-center justify-center rounded text-[9px] font-bold text-white"
              style={{ backgroundColor: app.color }}
            >
              {app.initials}
            </span>
            {app.name}
          </span>
        ) : (
          "—"
        )}
      </td>
      <td className="px-2 py-2 text-[var(--muted-fg)]">{ent.type}</td>
      <td className="px-2 py-2">
        <RiskBadge risk={ent.risk} />
      </td>
    </tr>
  );
}

function RiskBadge({ risk }: { risk: RiskLevel }) {
  const map = {
    Low: "bg-[var(--risk-low-bg)] text-[var(--risk-low-fg)]",
    Medium: "bg-[var(--risk-med-bg)] text-[var(--risk-med-fg)]",
    High: "bg-[var(--risk-high-bg)] text-[var(--risk-high-fg)]",
  };
  return (
    <span className={cn("inline-flex h-5 items-center rounded px-1.5 text-[10.5px] font-semibold", map[risk])}>
      {risk}
    </span>
  );
}

function SearchInput({
  value,
  onChange,
  placeholder,
  className,
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder: string;
  className?: string;
}) {
  return (
    <div className={cn("relative", className)}>
      <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-[var(--muted-fg)]" />
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="h-9 w-full rounded-md border border-[var(--border)] bg-white pl-8 pr-3 text-[12.5px] outline-none transition-colors focus:border-[var(--accent)]"
      />
    </div>
  );
}

function FilterDropdown<T extends string>({
  value,
  onChange,
  options,
}: {
  value: T;
  onChange: (v: T) => void;
  options: { value: T; label: string }[];
}) {
  return (
    <div className="relative">
      <FilterIcon className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-[var(--muted-fg)]" />
      <select
        value={value}
        onChange={(e) => onChange(e.target.value as T)}
        className="h-9 rounded-md border border-[var(--border)] bg-white pl-8 pr-2 text-[12.5px] outline-none transition-colors focus:border-[var(--accent)]"
      >
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    </div>
  );
}

function Checkbox({
  checked,
  onChange,
}: {
  checked: boolean;
  onChange: () => void;
}) {
  return (
    <button
      type="button"
      onClick={(e) => {
        e.stopPropagation();
        onChange();
      }}
      aria-checked={checked}
      role="checkbox"
      className={cn(
        "flex h-4 w-4 items-center justify-center rounded border transition-colors",
        checked
          ? "border-[var(--accent)] bg-[var(--accent)] text-white"
          : "border-[var(--border-strong)] bg-white hover:border-[var(--accent)]",
      )}
    >
      {checked && <Check className="h-3 w-3" strokeWidth={3} />}
    </button>
  );
}

function EmptyState({
  title,
  body,
  actionLabel,
  onAction,
}: {
  title: string;
  body: string;
  actionLabel: string;
  onAction: () => void;
}) {
  return (
    <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-[var(--border)] bg-[var(--muted)]/30 px-6 py-10 text-center">
      <p className="text-[13px] font-semibold text-[var(--foreground)]">{title}</p>
      <p className="mt-1 max-w-xs text-[12px] text-[var(--muted-fg)]">{body}</p>
      <button
        onClick={onAction}
        className="mt-4 h-8 rounded-md bg-[var(--accent)] px-3 text-[12.5px] font-semibold text-white hover:bg-[var(--accent-hover)]"
      >
        {actionLabel}
      </button>
    </div>
  );
}
