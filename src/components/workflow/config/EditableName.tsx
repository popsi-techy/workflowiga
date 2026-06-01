"use client";

import { Pencil } from "lucide-react";
import { cn } from "@/lib/cn";

/** Editable title used in config-panel headers. A faint pencil hints that the
 *  name is editable; it brightens on hover/focus. */
export function EditableName({
  value,
  onChange,
  placeholder = "Name",
  className,
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  className?: string;
}) {
  return (
    <div className="group/name relative flex items-center">
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className={cn(
          "w-full rounded-md border border-transparent bg-transparent py-0.5 pl-0.5 pr-6 text-[13px] font-semibold leading-tight text-[var(--foreground)] outline-none transition-colors hover:border-[var(--border)] focus:border-[var(--accent)]",
          className,
        )}
      />
      <Pencil
        aria-hidden
        className="pointer-events-none absolute right-2 h-3.5 w-3.5 text-[var(--muted-fg)] opacity-40 transition-opacity group-hover/name:opacity-90"
      />
    </div>
  );
}
