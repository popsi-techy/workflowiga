"use client";

import { useMemo, useState } from "react";
import { Search, Check } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/cn";
import type { PaletteCategory } from "@/lib/workflow/palette-tones";
import { Drawer } from "../Drawer";

export interface PickerItem {
  id: string;
  primary: string;
  secondary?: string;
  /** Right-aligned small label (e.g. "6 members", job title). */
  meta?: string;
  /** Optional avatar text; falls back to initials of `primary`. */
  initials?: string;
  /** Optional avatar background color. */
  color?: string;
}

interface EntityPickerDrawerProps {
  open: boolean;
  onClose: () => void;
  title: string;
  description?: string;
  icon?: LucideIcon;
  iconCategory?: PaletteCategory;
  items: PickerItem[];
  selectedIds: string[];
  onChange: (ids: string[]) => void;
  /** Restrict to a single selection. */
  single?: boolean;
  searchPlaceholder?: string;
  emptyLabel?: string;
}

export function EntityPickerDrawer({
  open,
  onClose,
  title,
  description,
  icon,
  iconCategory = "tasks",
  items,
  selectedIds,
  onChange,
  single = false,
  searchPlaceholder = "Search…",
  emptyLabel = "No matches",
}: EntityPickerDrawerProps) {
  const [q, setQ] = useState("");

  const filtered = useMemo(() => {
    const term = q.trim().toLowerCase();
    if (!term) return items;
    return items.filter(
      (it) =>
        it.primary.toLowerCase().includes(term) ||
        (it.secondary ?? "").toLowerCase().includes(term) ||
        (it.meta ?? "").toLowerCase().includes(term),
    );
  }, [items, q]);

  function toggle(id: string) {
    if (single) {
      onChange(selectedIds[0] === id ? [] : [id]);
      return;
    }
    if (selectedIds.includes(id)) onChange(selectedIds.filter((x) => x !== id));
    else onChange([...selectedIds, id]);
  }

  return (
    <Drawer
      open={open}
      onClose={onClose}
      title={title}
      description={description}
      icon={icon}
      iconCategory={iconCategory}
      countChip={selectedIds.length || undefined}
      width={520}
      footer={
        <>
          {!single && selectedIds.length > 0 && (
            <button
              onClick={() => onChange([])}
              className="mr-auto h-9 rounded-md px-2.5 text-[12.5px] font-medium text-[var(--muted-fg)] hover:bg-[var(--muted)] hover:text-[var(--foreground)]"
            >
              Clear all
            </button>
          )}
          <button
            onClick={onClose}
            className="h-9 rounded-md bg-[var(--accent)] px-3.5 text-[13px] font-semibold text-white hover:bg-[var(--accent-hover)]"
          >
            Done
          </button>
        </>
      }
    >
      <div className="relative mb-3">
        <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-[var(--muted-fg)]" />
        <input
          type="text"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder={searchPlaceholder}
          className="h-9 w-full rounded-md border border-[var(--border)] bg-white pl-8 pr-3 text-[12.5px] outline-none transition-colors focus:border-[var(--accent)]"
        />
      </div>

      <div className="flex flex-col gap-1.5">
        {filtered.length === 0 ? (
          <div className="rounded-lg border border-dashed border-[var(--border)] bg-[var(--muted)]/30 px-4 py-8 text-center text-[12.5px] text-[var(--muted-fg)]">
            {emptyLabel}
          </div>
        ) : (
          filtered.map((it) => {
            const sel = selectedIds.includes(it.id);
            const avatar =
              it.initials ??
              it.primary
                .split(" ")
                .map((w) => w[0])
                .slice(0, 2)
                .join("")
                .toUpperCase();
            return (
              <button
                key={it.id}
                onClick={() => toggle(it.id)}
                className={cn(
                  "flex items-center gap-3 rounded-lg border p-2.5 text-left transition-all",
                  sel
                    ? "border-[var(--accent)] bg-[var(--accent-softer)]"
                    : "border-[var(--border)] hover:border-[var(--border-strong)] hover:bg-[var(--muted)]/40",
                )}
              >
                <span
                  className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-[10.5px] font-semibold text-white"
                  style={{ backgroundColor: it.color ?? "#64748B" }}
                >
                  {avatar}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-[13px] font-medium text-[var(--foreground)]">
                    {it.primary}
                  </p>
                  {it.secondary && (
                    <p className="truncate text-[11.5px] text-[var(--muted-fg)]">
                      {it.secondary}
                    </p>
                  )}
                </div>
                {it.meta && (
                  <span className="shrink-0 text-[11px] text-[var(--muted-fg)]">
                    {it.meta}
                  </span>
                )}
                <span
                  className={cn(
                    "flex h-4.5 w-4.5 shrink-0 items-center justify-center rounded border transition-colors",
                    single && "rounded-full",
                    sel
                      ? "border-[var(--accent)] bg-[var(--accent)] text-white"
                      : "border-[var(--border-strong)] bg-white",
                  )}
                  style={{ height: 18, width: 18 }}
                >
                  {sel && <Check className="h-3 w-3" strokeWidth={3} />}
                </span>
              </button>
            );
          })
        )}
      </div>
    </Drawer>
  );
}
