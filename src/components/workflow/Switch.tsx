"use client";

import { cn } from "@/lib/cn";

interface SwitchProps {
  id?: string;
  enabled: boolean;
  onChange: (v: boolean) => void;
  disabled?: boolean;
  "aria-label"?: string;
}

/** Minimal track-and-knob switch matching the enterprise theme. */
export function Switch({
  id,
  enabled,
  onChange,
  disabled,
  "aria-label": ariaLabel,
}: SwitchProps) {
  return (
    <button
      id={id}
      type="button"
      role="switch"
      aria-checked={enabled}
      aria-label={ariaLabel}
      disabled={disabled}
      onClick={() => !disabled && onChange(!enabled)}
      className={cn(
        "relative inline-flex h-[20px] w-[34px] shrink-0 items-center rounded-full transition-colors duration-150 outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)] focus-visible:ring-offset-1",
        enabled ? "bg-[var(--accent)]" : "bg-[var(--border-strong)]",
        disabled ? "cursor-not-allowed opacity-50" : "cursor-pointer",
      )}
    >
      <span
        className={cn(
          "inline-block h-[16px] w-[16px] transform rounded-full bg-white shadow-sm transition-transform duration-150",
          enabled ? "translate-x-[16px]" : "translate-x-[2px]",
        )}
      />
    </button>
  );
}
