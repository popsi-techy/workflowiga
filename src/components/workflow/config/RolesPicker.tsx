"use client";

import { useMemo, useState } from "react";
import { Search, Check } from "lucide-react";
import { cn } from "@/lib/cn";
import type {
  BusinessRoleItem,
  RiskLevel,
  TechnicalRoleItem,
} from "@/lib/workflow/types";

interface Props {
  kind: "technical" | "business";
  rows: TechnicalRoleItem[] | BusinessRoleItem[];
  selectedIds: string[];
  onChange: (ids: string[]) => void;
}

export function RolesPicker({ kind, rows, selectedIds, onChange }: Props) {
  const [q, setQ] = useState("");

  const filtered = useMemo(() => {
    const term = q.trim().toLowerCase();
    if (!term) return rows;
    return rows.filter(
      (r) =>
        r.name.toLowerCase().includes(term) ||
        r.description.toLowerCase().includes(term),
    );
  }, [rows, q]);

  function toggle(id: string) {
    if (selectedIds.includes(id))
      onChange(selectedIds.filter((x) => x !== id));
    else onChange([...selectedIds, id]);
  }
  const allSelected =
    filtered.length > 0 && filtered.every((r) => selectedIds.includes(r.id));
  function toggleAll() {
    if (allSelected) {
      onChange(selectedIds.filter((id) => !filtered.some((r) => r.id === id)));
    } else {
      const ids = new Set(selectedIds);
      filtered.forEach((r) => ids.add(r.id));
      onChange(Array.from(ids));
    }
  }

  return (
    <div>
      <div className="relative">
        <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-[var(--muted-fg)]" />
        <input
          type="text"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder={`Search ${kind} roles`}
          className="h-9 w-full rounded-md border border-[var(--border)] bg-white pl-8 pr-3 text-[12.5px] outline-none transition-colors focus:border-[var(--accent)]"
        />
      </div>

      {selectedIds.length > 0 && (
        <div className="mt-2 flex items-center justify-between rounded-md bg-[var(--accent-softer)] px-2.5 py-1.5 text-[12px] text-[#9A3412]">
          <span className="font-medium">{selectedIds.length} selected</span>
          <button
            onClick={() => onChange([])}
            className="text-[11.5px] font-semibold hover:underline"
          >
            Clear all
          </button>
        </div>
      )}

      <div className="mt-3 overflow-hidden rounded-lg border border-[var(--border)] bg-white">
        <div className="max-h-[420px] overflow-y-auto scrollbar-thin">
          <table className="w-full text-left text-[12.5px]">
            <thead className="sticky top-0 z-10 bg-[var(--muted)]/60 backdrop-blur">
              <tr className="text-[11px] font-medium uppercase tracking-wide text-[var(--muted-fg)]">
                <th className="w-8 px-2.5 py-2">
                  <Checkbox checked={allSelected} onChange={toggleAll} />
                </th>
                <th className="px-2 py-2">Role</th>
                <th className="px-2 py-2">Description</th>
                {kind === "technical" ? (
                  <>
                    <th className="px-2 py-2 text-right">Apps</th>
                    <th className="px-2 py-2">Risk</th>
                  </>
                ) : (
                  <>
                    <th className="px-2 py-2 text-right">Members</th>
                    <th className="px-2 py-2">Owner</th>
                  </>
                )}
                <th className="px-2 py-2 whitespace-nowrap">Updated</th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-8 text-center text-[var(--muted-fg)]">
                    No roles match &quot;{q}&quot;
                  </td>
                </tr>
              ) : (
                filtered.map((r) => {
                  const sel = selectedIds.includes(r.id);
                  return (
                    <tr
                      key={r.id}
                      onClick={() => toggle(r.id)}
                      className={cn(
                        "cursor-pointer border-t border-[var(--border)] transition-colors",
                        sel ? "bg-[var(--accent-softer)]" : "hover:bg-[var(--muted)]/30",
                      )}
                    >
                      <td className="px-2.5 py-2">
                        <Checkbox checked={sel} onChange={() => toggle(r.id)} />
                      </td>
                      <td className="px-2 py-2 font-medium text-[var(--foreground)]">
                        {r.name}
                      </td>
                      <td className="px-2 py-2 text-[var(--muted-fg)]">
                        <span className="line-clamp-1">{r.description}</span>
                      </td>
                      {kind === "technical" ? (
                        <>
                          <td className="px-2 py-2 text-right text-[var(--muted-fg)]">
                            {(r as TechnicalRoleItem).appsCount}
                          </td>
                          <td className="px-2 py-2">
                            <RiskBadge risk={(r as TechnicalRoleItem).risk} />
                          </td>
                        </>
                      ) : (
                        <>
                          <td className="px-2 py-2 text-right text-[var(--muted-fg)]">
                            {(r as BusinessRoleItem).members.toLocaleString()}
                          </td>
                          <td className="px-2 py-2 text-[var(--muted-fg)]">
                            {(r as BusinessRoleItem).owner}
                          </td>
                        </>
                      )}
                      <td className="px-2 py-2 whitespace-nowrap text-[var(--muted-fg)]">
                        {r.lastUpdated}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function RiskBadge({ risk }: { risk: RiskLevel }) {
  const map = {
    Low: "bg-[var(--risk-low-bg)] text-[var(--risk-low-fg)]",
    Medium: "bg-[var(--risk-med-bg)] text-[var(--risk-med-fg)]",
    High: "bg-[var(--risk-high-bg)] text-[var(--risk-high-fg)]",
  } as const;
  return (
    <span
      className={cn(
        "inline-flex h-5 items-center rounded px-1.5 text-[10.5px] font-semibold",
        map[risk],
      )}
    >
      {risk}
    </span>
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
