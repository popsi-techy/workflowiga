"use client";

import { useId } from "react";
import { Plus, X } from "lucide-react";
import { cn } from "@/lib/cn";
import { ATTRIBUTES, OPERATORS } from "@/lib/workflow/mock-data";
import type { AttributeDef, Condition, Logic, Operator } from "@/lib/workflow/types";

const MAX_CONDITIONS = 10;

interface Props {
  logic: Logic;
  conditions: Condition[];
  onLogicChange: (l: Logic) => void;
  onChange: (c: Condition[]) => void;
  /** Hide outer card chrome (used inside tabs) */
  flush?: boolean;
  /** Attribute set to offer. Defaults to identity ATTRIBUTES. */
  attributes?: AttributeDef[];
}

export function ConditionBuilder({
  logic,
  conditions,
  onLogicChange,
  onChange,
  flush = false,
  attributes = ATTRIBUTES,
}: Props) {
  const id = useId();

  function addCondition() {
    if (conditions.length >= MAX_CONDITIONS) return;
    const c: Condition = {
      id: `${id}-${conditions.length}-${Date.now().toString(36)}`,
      attribute: "",
      operator: "equals",
      value: "",
    };
    onChange([...conditions, c]);
  }

  function updateRow(i: number, patch: Partial<Condition>) {
    onChange(conditions.map((c, idx) => (idx === i ? { ...c, ...patch } : c)));
  }

  function removeRow(i: number) {
    onChange(conditions.filter((_, idx) => idx !== i));
  }

  return (
    <div
      className={cn(
        !flush &&
          "rounded-lg border border-[var(--border)] bg-white",
      )}
    >
      <div
        className={cn(
          "flex items-center justify-between gap-3 border-b border-[var(--border)] px-3 py-2.5",
          flush && "border-0 px-0 pt-0",
        )}
      >
        <div className="flex items-center gap-2">
          <Segmented
            value={logic}
            onChange={onLogicChange}
            options={[
              { value: "AND", label: "AND" },
              { value: "OR", label: "OR" },
            ]}
          />
          <span className="text-[12px] text-[var(--muted-fg)]">
            {logic === "AND" ? "All conditions must match" : "Any condition matches"}
          </span>
        </div>
        <span className="text-[11.5px] font-medium text-[var(--muted-fg)]">
          {conditions.length} / {MAX_CONDITIONS}
        </span>
      </div>

      {conditions.length === 0 ? (
        <div
          className={cn(
            "flex flex-col items-center justify-center gap-1 px-4 py-7 text-center text-[12.5px] text-[var(--muted-fg)]",
            flush && "px-0",
          )}
        >
          <p className="font-medium">No conditions yet</p>
          <p className="text-[11.5px]">Add a condition to define who this applies to</p>
        </div>
      ) : (
        <div className={cn("flex flex-col", flush && "")}>
          {conditions.map((c, i) => (
            <ConditionRow
              key={c.id}
              condition={c}
              logic={logic}
              showJoin={i > 0}
              onChange={(patch) => updateRow(i, patch)}
              onRemove={() => removeRow(i)}
              flush={flush}
              attributes={attributes}
            />
          ))}
        </div>
      )}

      <div className={cn("border-t border-[var(--border)] px-3 py-2", flush && "border-0 px-0")}>
        <button
          onClick={addCondition}
          disabled={conditions.length >= MAX_CONDITIONS}
          className="inline-flex h-8 items-center gap-1.5 rounded-md px-2 text-[12.5px] font-medium text-[var(--accent)] transition-colors hover:bg-[var(--accent-softer)] disabled:cursor-not-allowed disabled:text-[var(--muted-fg)]"
        >
          <Plus className="h-3.5 w-3.5" />
          Add Condition
        </button>
        {conditions.length >= MAX_CONDITIONS && (
          <span className="ml-2 text-[11.5px] text-[var(--muted-fg)]">
            Maximum of {MAX_CONDITIONS} conditions reached
          </span>
        )}
      </div>
    </div>
  );
}

function ConditionRow({
  condition,
  logic,
  showJoin,
  onChange,
  onRemove,
  flush,
  attributes,
}: {
  condition: Condition;
  logic: Logic;
  showJoin: boolean;
  onChange: (patch: Partial<Condition>) => void;
  onRemove: () => void;
  flush: boolean;
  attributes: AttributeDef[];
}) {
  const attr = attributes.find((a) => a.value === condition.attribute);
  const usesSelect = attr?.type === "select";
  const usesList =
    condition.operator === "in" || condition.operator === "not_in";

  return (
    <div
      className={cn(
        "px-3 py-2.5",
        !flush && "border-b border-[var(--border)] last:border-b-0",
        flush && "px-0",
      )}
    >
      {showJoin && (
        <div className="mb-2 flex items-center gap-2">
          <span className="rounded bg-[var(--muted)] px-1.5 py-0.5 text-[10.5px] font-semibold uppercase tracking-wide text-[var(--muted-fg)]">
            {logic}
          </span>
          <div className="h-px flex-1 bg-[var(--border)]" />
        </div>
      )}
      <div className="flex items-center gap-2">
        <Select
          value={condition.attribute}
          placeholder="Attribute"
          onChange={(v) =>
            onChange({
              attribute: v,
              value: usesList ? [] : "",
            })
          }
          options={attributes.map((a) => ({ value: a.value, label: a.label }))}
          className="w-[34%]"
        />
        <Select
          value={condition.operator}
          onChange={(v) =>
            onChange({
              operator: v as Operator,
              value:
                v === "in" || v === "not_in"
                  ? Array.isArray(condition.value)
                    ? condition.value
                    : []
                  : Array.isArray(condition.value)
                    ? ""
                    : condition.value,
            })
          }
          options={OPERATORS.map((o) => ({ value: o.value, label: o.label }))}
          className="w-[28%]"
        />
        <ValueInput
          attribute={attr}
          operator={condition.operator}
          value={condition.value}
          usesSelect={usesSelect}
          onChange={(v) => onChange({ value: v })}
        />
        <button
          onClick={onRemove}
          aria-label="Remove condition"
          className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md text-[var(--muted-fg)] hover:bg-[var(--muted)] hover:text-red-600"
        >
          <X className="h-3.5 w-3.5" />
        </button>
      </div>
    </div>
  );
}

function ValueInput({
  attribute,
  operator,
  value,
  usesSelect,
  onChange,
}: {
  attribute: AttributeDef | undefined;
  operator: Operator;
  value: string | string[];
  usesSelect: boolean;
  onChange: (v: string | string[]) => void;
}) {
  const isList = operator === "in" || operator === "not_in";

  if (!attribute) {
    return (
      <input
        disabled
        placeholder="Select attribute"
        className="flex h-8 min-w-0 flex-1 rounded-md border border-[var(--border)] bg-[var(--muted)]/30 px-2.5 text-[12.5px] text-[var(--muted-fg)] outline-none"
      />
    );
  }

  if (isList && usesSelect && attribute.options) {
    return (
      <MultiSelect
        options={attribute.options}
        value={Array.isArray(value) ? value : []}
        onChange={onChange}
        className="min-w-0 flex-1"
      />
    );
  }

  if (usesSelect && attribute.options) {
    return (
      <Select
        value={typeof value === "string" ? value : ""}
        placeholder="Select value"
        onChange={(v) => onChange(v)}
        options={attribute.options.map((o) => ({ value: o, label: o }))}
        className="min-w-0 flex-1"
      />
    );
  }

  if (attribute.type === "number") {
    return (
      <div className="flex h-8 min-w-0 flex-1 items-center rounded-md border border-[var(--border)] bg-white px-2.5 focus-within:border-[var(--accent)]">
        {attribute.unit && (
          <span className="mr-1 shrink-0 text-[12.5px] text-[var(--muted-fg)]">
            {attribute.unit}
          </span>
        )}
        <input
          type="number"
          inputMode="decimal"
          placeholder="0"
          value={typeof value === "string" ? value : ""}
          onChange={(e) => onChange(e.target.value)}
          className="min-w-0 flex-1 bg-transparent text-[12.5px] outline-none"
        />
      </div>
    );
  }

  return (
    <input
      type="text"
      placeholder="Enter value"
      value={
        Array.isArray(value)
          ? value.join(", ")
          : value
      }
      onChange={(e) =>
        onChange(
          isList
            ? e.target.value.split(",").map((v) => v.trim()).filter(Boolean)
            : e.target.value,
        )
      }
      className="flex h-8 min-w-0 flex-1 rounded-md border border-[var(--border)] bg-white px-2.5 text-[12.5px] outline-none transition-colors focus:border-[var(--accent)]"
    />
  );
}

function Select({
  value,
  onChange,
  options,
  placeholder,
  className,
}: {
  value: string;
  onChange: (v: string) => void;
  options: { value: string; label: string }[];
  placeholder?: string;
  className?: string;
}) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className={cn(
        "h-8 min-w-0 rounded-md border border-[var(--border)] bg-white px-2 text-[12.5px] outline-none transition-colors focus:border-[var(--accent)]",
        !value && "text-[var(--muted-fg)]",
        className,
      )}
    >
      <option value="">{placeholder ?? "Select"}</option>
      {options.map((o) => (
        <option key={o.value} value={o.value}>
          {o.label}
        </option>
      ))}
    </select>
  );
}

function MultiSelect({
  options,
  value,
  onChange,
  className,
}: {
  options: string[];
  value: string[];
  onChange: (v: string[]) => void;
  className?: string;
}) {
  function toggle(v: string) {
    if (value.includes(v)) onChange(value.filter((x) => x !== v));
    else onChange([...value, v]);
  }
  return (
    <details className={cn("group relative", className)}>
      <summary
        className="flex h-8 cursor-pointer list-none items-center gap-1.5 overflow-hidden rounded-md border border-[var(--border)] bg-white px-2 text-[12.5px] outline-none transition-colors focus:border-[var(--accent)]"
        aria-haspopup="listbox"
      >
        {value.length === 0 ? (
          <span className="text-[var(--muted-fg)]">Select values</span>
        ) : (
          <span className="truncate">{value.join(", ")}</span>
        )}
        <span className="ml-auto text-[var(--muted-fg)]">▾</span>
      </summary>
      <div className="absolute right-0 left-0 top-9 z-10 max-h-52 overflow-auto rounded-md border border-[var(--border)] bg-white p-1 shadow-lg scrollbar-thin">
        {options.map((o) => {
          const checked = value.includes(o);
          return (
            <button
              type="button"
              key={o}
              onClick={() => toggle(o)}
              className={cn(
                "flex w-full items-center gap-2 rounded px-2 py-1.5 text-left text-[12.5px] hover:bg-[var(--muted)]",
                checked && "bg-[var(--accent-softer)]",
              )}
            >
              <span
                className={cn(
                  "flex h-3.5 w-3.5 items-center justify-center rounded-sm border",
                  checked
                    ? "border-[var(--accent)] bg-[var(--accent)] text-white"
                    : "border-[var(--border-strong)] bg-white",
                )}
              >
                {checked && <X className="h-2.5 w-2.5 rotate-45" strokeWidth={3} />}
              </span>
              {o}
            </button>
          );
        })}
      </div>
    </details>
  );
}

function Segmented<T extends string>({
  value,
  onChange,
  options,
}: {
  value: T;
  onChange: (v: T) => void;
  options: { value: T; label: string }[];
}) {
  return (
    <div className="flex h-7 items-center rounded-md bg-[var(--muted)] p-0.5">
      {options.map((o) => (
        <button
          key={o.value}
          onClick={() => onChange(o.value)}
          className={cn(
            "h-6 rounded px-2.5 text-[11.5px] font-semibold transition-colors",
            value === o.value
              ? "bg-white text-[var(--foreground)] shadow-sm"
              : "text-[var(--muted-fg)] hover:text-[var(--foreground)]",
          )}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}
