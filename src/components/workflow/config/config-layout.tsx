"use client";

import { useEffect, useRef, useState } from "react";
import { Check, ChevronDown, Info } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/cn";
import { Switch } from "../Switch";

/** Compact (i) control — section hints live here instead of subtitle lines. */
export function ConfigInfoTip({
  text,
  className,
}: {
  text: string;
  className?: string;
}) {
  return (
    <span className={cn("group/tip relative inline-flex shrink-0", className)}>
      <button
        type="button"
        tabIndex={0}
        aria-label={text}
        onClick={(e) => e.stopPropagation()}
        onPointerDown={(e) => e.stopPropagation()}
        className="flex h-4 w-4 items-center justify-center rounded-full text-[var(--muted-fg)] transition-colors hover:bg-[var(--muted)] hover:text-[var(--foreground)] focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[var(--accent)]"
      >
        <Info className="h-3 w-3" strokeWidth={2.25} aria-hidden />
      </button>
      <span
        role="tooltip"
        className="pointer-events-none absolute left-1/2 top-full z-50 mt-1 hidden w-max max-w-[220px] -translate-x-1/2 rounded-md border border-[var(--border)] bg-white px-2 py-1.5 text-[11px] font-normal leading-snug text-[var(--foreground)] shadow-md group-hover/tip:block group-focus-within/tip:block"
      >
        {text}
      </span>
    </span>
  );
}

/** Scrollable config body (right panel or drawer content). */
export function ConfigBody({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex flex-col gap-5 overflow-y-auto px-4 py-4 scrollbar-thin",
        className,
      )}
    >
      {children}
    </div>
  );
}

/** Muted grouping surface — parent tier in the config hierarchy. */
export function ConfigInset({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex flex-col gap-2.5 rounded-lg bg-[var(--muted)]/45 p-2.5",
        className,
      )}
    >
      {children}
    </div>
  );
}

/** White nested surface inside a ConfigInset (fields, sub-groups). */
export function ConfigSurface({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn("flex flex-col gap-2.5 rounded-lg bg-white p-2.5", className)}
    >
      {children}
    </div>
  );
}

/** Section heading + optional nested content (no outer card border). */
export function ConfigSection({
  title,
  subtitle,
  action,
  children,
  inset = true,
}: {
  title: string;
  subtitle?: string;
  /** Accepted for call-site compatibility; section headers no longer render icons. */
  icon?: LucideIcon;
  action?: React.ReactNode;
  children?: React.ReactNode;
  /** Wrap children in a muted inset group (default). */
  inset?: boolean;
}) {
  return (
    <section className="flex flex-col gap-2">
      <div className="flex items-center justify-between gap-2 px-0.5">
        <div className="flex min-w-0 items-center gap-1.5">
          <h4 className="text-[12.5px] font-medium leading-tight tracking-[-0.01em] text-[var(--foreground)]">
            {title}
          </h4>
          {subtitle && <ConfigInfoTip text={subtitle} />}
        </div>
        {action}
      </div>
      {children &&
        (inset ? <ConfigInset>{children}</ConfigInset> : (
          <div className="flex flex-col gap-2.5 px-0.5">{children}</div>
        ))}
    </section>
  );
}

/** Label + control on one row (toggles, enable flags). */
export function ConfigRow({
  label,
  hint,
  action,
  children,
}: {
  label: string;
  hint?: string;
  action: React.ReactNode;
  children?: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center justify-between gap-2">
        <div className="flex min-w-0 items-center gap-1">
          <p className="text-[12px] font-medium text-[var(--foreground)]">{label}</p>
          {hint && <ConfigInfoTip text={hint} />}
        </div>
        {action}
      </div>
      {children}
    </div>
  );
}

const INHERITED_HINT =
  "Inheriting global settings from the parallel branch. Toggle Override to customise.";

export function InheritedNote({
  label,
  value,
  hint = INHERITED_HINT,
}: {
  label: string;
  value: string;
  hint?: string;
}) {
  return (
    <ConfigSurface className="gap-1">
      <div className="flex items-center gap-1">
        <p className="text-[11px] font-medium text-[var(--muted-fg)]">
          {label} (inherited)
        </p>
        <ConfigInfoTip text={hint} />
      </div>
      <p className="text-[12.5px] font-medium text-[var(--foreground)]">{value}</p>
    </ConfigSurface>
  );
}

export function InlineToggle({
  label,
  id,
  enabled,
  onChange,
}: {
  label: string;
  id: string;
  enabled: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <div className="flex items-center gap-2">
      <span className="text-[11px] font-medium text-[var(--muted-fg)]">{label}</span>
      <Switch id={id} enabled={enabled} onChange={onChange} aria-label={label} />
    </div>
  );
}

export function ConfigField({
  label,
  required,
  hint,
  children,
}: {
  label: string;
  required?: boolean;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex items-center gap-1">
        <p className="text-[11.5px] font-medium leading-tight text-[var(--muted-fg)]">
          {label}
          {required && <span className="ml-0.5 text-red-500">*</span>}
        </p>
        {hint && <ConfigInfoTip text={hint} />}
      </div>
      {children}
    </div>
  );
}

export function ConfigSelect({
  id,
  value,
  placeholder,
  options,
  onChange,
  valueMap,
  disabled,
  className,
}: {
  id: string;
  value: string;
  placeholder: string;
  options: string[];
  onChange: (v: string) => void;
  valueMap?: { value: string; label: string }[];
  disabled?: boolean;
  className?: string;
}) {
  return (
    <div className={cn("relative", className)}>
      <select
        id={id}
        value={value}
        disabled={disabled}
        onChange={(e) => onChange(e.target.value)}
        className={cn(
          "w-full appearance-none rounded-lg border border-[var(--border)] bg-white py-2 pl-2.5 pr-7 text-[12.5px] outline-none transition-all focus:border-[var(--accent)] focus:shadow-[var(--ring-accent)] disabled:cursor-not-allowed disabled:bg-[var(--muted)]/60",
          value === "" ? "text-[var(--muted-fg)]" : "text-[var(--foreground)]",
        )}
      >
        {placeholder && (
          <option value="" disabled>
            {placeholder}
          </option>
        )}
        {valueMap
          ? valueMap.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))
          : options.map((o) => (
              <option key={o} value={o}>
                {o}
              </option>
            ))}
      </select>
      <ChevronDown className="pointer-events-none absolute right-2 top-1/2 h-3 w-3 -translate-y-1/2 text-[var(--muted-fg)]" />
    </div>
  );
}

export function ConfigMultiSelect({
  id,
  options,
  value,
  onChange,
  placeholder = "Select…",
  className,
}: {
  id?: string;
  options: { value: string; label: string }[];
  value: string[];
  onChange: (values: string[]) => void;
  placeholder?: string;
  className?: string;
}) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function onPointerDown(e: MouseEvent) {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false);
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    window.addEventListener("mousedown", onPointerDown);
    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("mousedown", onPointerDown);
      window.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const labelByValue = new Map(options.map((o) => [o.value, o.label]));
  const summary =
    value.length === 0
      ? placeholder
      : value.map((v) => labelByValue.get(v) ?? v).join(", ");

  function toggle(v: string) {
    if (value.includes(v)) onChange(value.filter((x) => x !== v));
    else onChange([...value, v]);
  }

  return (
    <div ref={rootRef} className={cn("relative", className)}>
      <button
        id={id}
        type="button"
        aria-haspopup="listbox"
        aria-expanded={open}
        onClick={() => setOpen((o) => !o)}
        className={cn(
          "flex min-h-[34px] w-full items-center gap-2 rounded-lg border border-[var(--border)] bg-white py-1 pl-2.5 pr-7 text-left text-[12.5px] outline-none transition-all focus:border-[var(--accent)] focus:shadow-[var(--ring-accent)]",
          value.length === 0 ? "text-[var(--muted-fg)]" : "text-[var(--foreground)]",
        )}
      >
        <span className="min-w-0 flex-1 truncate leading-snug">{summary}</span>
        <ChevronDown
          className={cn(
            "pointer-events-none absolute right-2 top-1/2 h-3 w-3 -translate-y-1/2 text-[var(--muted-fg)] transition-transform",
            open && "rotate-180",
          )}
        />
      </button>
      {open && (
        <ul
          role="listbox"
          aria-multiselectable
          className="absolute left-0 right-0 top-[calc(100%+4px)] z-50 max-h-48 overflow-auto rounded-lg border border-[var(--border)] bg-white p-1 shadow-[var(--shadow-pop)] scrollbar-thin"
        >
          {options.map((o) => {
            const checked = value.includes(o.value);
            return (
              <li key={o.value} role="option" aria-selected={checked}>
                <button
                  type="button"
                  onClick={() => toggle(o.value)}
                  className={cn(
                    "flex w-full items-center gap-2 rounded px-2 py-1.5 text-left text-[12px] hover:bg-[var(--muted)]",
                    checked && "bg-[var(--accent-softer)]/60",
                  )}
                >
                  <span
                    className={cn(
                      "flex h-3.5 w-3.5 shrink-0 items-center justify-center rounded border",
                      checked
                        ? "border-[var(--accent)] bg-[var(--accent)] text-white"
                        : "border-[var(--border-strong)] bg-white",
                    )}
                  >
                    {checked && <Check className="h-2.5 w-2.5" strokeWidth={3} />}
                  </span>
                  <span className="truncate">{o.label}</span>
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
