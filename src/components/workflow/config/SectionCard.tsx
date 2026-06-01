"use client";

import { ChevronRight, Plus } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/cn";
import {
  PALETTE_TONES,
  paletteIconTileClass,
  type PaletteCategory,
} from "@/lib/workflow/palette-tones";
import { ConfigInfoTip } from "./config-layout";

interface SectionCardProps {
  icon: LucideIcon;
  category: PaletteCategory;
  title: string;
  description: string;
  /** Short summary line shown when configured (e.g. "3 apps · 5 entitlements"). */
  summary?: string | null;
  /** Number of items configured — shown as a chip. */
  count?: number;
  /** When count > 0, card is in the "configured" visual state. */
  configured?: boolean;
  onClick: () => void;
}

export function SectionCard({
  icon: Icon,
  category,
  title,
  description,
  summary,
  count,
  configured,
  onClick,
}: SectionCardProps) {
  const isConfigured = configured ?? (count != null && count > 0);
  const tone = PALETTE_TONES[category];
  return (
    <button
      onClick={onClick}
      className={cn(
        "group flex w-full items-center gap-2.5 rounded-lg bg-white p-2.5 text-left transition-all duration-150",
        isConfigured
          ? "hover:shadow-[var(--shadow-xs)]"
          : "border border-dashed border-[var(--border-strong)]/55 bg-white/70 hover:border-[var(--border-strong)]",
      )}
    >
      <span
        className={cn(
          "flex h-8 w-8 shrink-0 items-center justify-center rounded-lg transition-colors",
          paletteIconTileClass(category, { configured: isConfigured }),
        )}
      >
        <Icon className="h-3.5 w-3.5" />
      </span>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-1">
          <span className="text-[12px] font-medium leading-tight text-[var(--foreground)]">
            {title}
          </span>
          {!summary && <ConfigInfoTip text={description} />}
          {count != null && count > 0 && (
            <span
              className={cn(
                "inline-flex h-4 min-w-[18px] items-center justify-center rounded-full px-1 text-[10.5px] font-semibold",
                tone.countChip,
              )}
            >
              {count}
            </span>
          )}
        </div>
        {summary && (
          <p className="truncate text-[11px] leading-snug text-[var(--muted-fg)]">
            {summary}
          </p>
        )}
      </div>
      {isConfigured ? (
        <ChevronRight className="h-4 w-4 shrink-0 text-[var(--muted-fg)] transition-transform group-hover:translate-x-0.5" />
      ) : (
        <span className="flex h-7 items-center gap-1 rounded-md bg-[var(--accent)] px-2 text-[12px] font-semibold text-white opacity-0 transition-opacity group-hover:opacity-100">
          <Plus className="h-3 w-3" />
          Configure
        </span>
      )}
    </button>
  );
}
