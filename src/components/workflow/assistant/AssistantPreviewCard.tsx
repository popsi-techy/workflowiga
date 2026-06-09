"use client";

import { Pencil, X } from "lucide-react";
import { cn } from "@/lib/cn";

interface Props {
  title: string;
  lines: string[];
  onApply: () => void;
  onEdit?: () => void;
  onCancel: () => void;
}

export function AssistantPreviewCard({
  title,
  lines,
  onApply,
  onEdit,
  onCancel,
}: Props) {
  return (
    <div className="rounded-lg border border-[#eb5424]/25 bg-white shadow-sm">
      <div className="border-b border-[var(--border)]/70 px-3 py-2">
        <p className="text-[11px] font-semibold text-[var(--foreground)]">{title}</p>
      </div>
      <div className="space-y-1 px-3 py-2.5">
        {lines.map((line, i) => {
          const isTrue = line.startsWith("TRUE");
          const isFalse = line.startsWith("FALSE");
          const isIf = line.startsWith("IF");
          return (
            <p
              key={i}
              className={cn(
                "text-[11.5px]",
                isTrue && "font-semibold text-emerald-700",
                isFalse && "font-semibold text-rose-700",
                isIf && "font-medium text-[var(--foreground)]",
                !isTrue && !isFalse && !isIf && "text-[var(--muted-fg)]",
              )}
            >
              {line}
            </p>
          );
        })}
      </div>
      <div className="flex items-center gap-2 border-t border-[var(--border)]/70 px-3 py-2">
        <button
          type="button"
          onClick={onApply}
          className="h-7 rounded-md bg-[#eb5424] px-3 text-[11.5px] font-semibold text-white transition-colors hover:bg-[#d44a1f]"
        >
          Apply
        </button>
        {onEdit && (
          <button
            type="button"
            onClick={onEdit}
            className="inline-flex h-7 items-center gap-1 rounded-md border border-[var(--border)] px-2.5 text-[11.5px] font-medium text-[var(--foreground)] hover:bg-[var(--muted)]"
          >
            <Pencil className="h-3 w-3" />
            Edit
          </button>
        )}
        <button
          type="button"
          onClick={onCancel}
          className="ml-auto inline-flex h-7 items-center gap-1 rounded-md px-2 text-[11.5px] font-medium text-[var(--muted-fg)] hover:bg-[var(--muted)] hover:text-[var(--foreground)]"
        >
          <X className="h-3 w-3" />
          Cancel
        </button>
      </div>
    </div>
  );
}
