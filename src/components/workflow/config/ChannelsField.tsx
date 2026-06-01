"use client";

import { useState } from "react";
import { ChevronDown, MessageSquare } from "lucide-react";
import { cn } from "@/lib/cn";
import {
  paletteIconTileClass,
  type PaletteCategory,
} from "@/lib/workflow/palette-tones";
import { ChannelsModal, type ChannelsModalValue } from "./ChannelsModal";

/**
 * Trigger button + modal for enabling delivery channels and editing their
 * per-channel message. Shared by Notification, SoD pre-check, and approver
 * alert configs so every channel picker also lets you configure the message.
 */
export function ChannelsField({
  value,
  onChange,
  category = "tasks",
  title,
}: {
  value: ChannelsModalValue;
  onChange: (fields: ChannelsModalValue) => void;
  category?: PaletteCategory;
  title?: string;
}) {
  const [open, setOpen] = useState(false);
  const summary =
    value.channels.length > 0
      ? value.channels.map((c) => (c === "slack" ? "Slack" : "Email")).join(", ")
      : null;

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className={cn(
          "group flex w-full items-center gap-2 rounded-md border bg-white p-2 text-left transition-all",
          summary
            ? "border-[var(--border)] hover:border-[var(--border-strong)] hover:shadow-sm"
            : "border-dashed border-[var(--border)] hover:border-[var(--border-strong)] hover:bg-[var(--muted)]/30",
        )}
      >
        <span
          className={cn(
            "flex h-7 w-7 shrink-0 items-center justify-center rounded-md",
            paletteIconTileClass(category, { configured: !!summary }),
          )}
        >
          <MessageSquare className="h-3.5 w-3.5" />
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-[12px] font-medium text-[var(--foreground)]">
            Configure channels
          </p>
          <p className="truncate text-[11px] text-[var(--muted-fg)]">
            {summary ?? "No channel selected yet"}
          </p>
        </div>
        <ChevronDown className="h-4 w-4 -rotate-90 text-[var(--muted-fg)]" />
      </button>

      {open && (
        <ChannelsModal
          title={title}
          value={value}
          onClose={() => setOpen(false)}
          onSave={(fields) => {
            onChange(fields);
            setOpen(false);
          }}
        />
      )}
    </>
  );
}
