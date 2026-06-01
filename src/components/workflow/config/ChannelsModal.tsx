"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Mail, MessageSquare, X, ChevronDown } from "lucide-react";
import { cn } from "@/lib/cn";
import { Switch } from "../Switch";
import type { NotificationChannel } from "@/lib/workflow/types";

export const DEFAULT_CHANNEL_MESSAGE = `{{requester.name}}'s request for {{entitlement.name}} on {{application.name}} is {{status}}.

> Requester: {{requester.name}}
> Application: {{application.name}}
> Entitlement: {{entitlement.name}}
> Policy: {{policy.name}}
> Status: {{status}}`;

const VARIABLES = [
  "requester.name",
  "requester.email",
  "request.type",
  "application.name",
  "entitlement.name",
  "policy.name",
  "approver.name",
  "status",
];

const SAMPLE: Record<string, string> = {
  "requester.name": "Aisha Khan",
  "requester.email": "aisha.khan@acme.com",
  "request.type": "Entitlement access",
  "application.name": "GitHub",
  "entitlement.name": "Repo: payments-api (Write)",
  "policy.name": "Entitlement Request — Owner then Manager",
  "approver.name": "Diego Alvarez",
  status: "Approved",
};

function renderPreview(msg: string): string {
  return msg.replace(/\{\{\s*([\w.]+)\s*\}\}/g, (_m, k: string) => SAMPLE[k] ?? `{{${k}}}`);
}

export interface ChannelsModalValue {
  channels: NotificationChannel[];
  slackMessage?: string;
  emailMessage?: string;
}

/** Shared modal to enable channels and edit a per-channel message template. */
export function ChannelsModal({
  title = "Configure notifications",
  value,
  onClose,
  onSave,
}: {
  title?: string;
  value: ChannelsModalValue;
  onClose: () => void;
  onSave: (fields: ChannelsModalValue) => void;
}) {
  const [channels, setChannels] = useState<NotificationChannel[]>(value.channels);
  const [slackMessage, setSlackMessage] = useState(
    value.slackMessage ?? DEFAULT_CHANNEL_MESSAGE,
  );
  const [emailMessage, setEmailMessage] = useState(
    value.emailMessage ?? DEFAULT_CHANNEL_MESSAGE,
  );
  const [active, setActive] = useState<NotificationChannel>(value.channels[0] ?? "slack");
  const [tab, setTab] = useState<"edit" | "preview">("edit");
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  function toggle(ch: NotificationChannel, on: boolean) {
    setChannels((prev) => {
      const set = new Set(prev);
      if (on) set.add(ch);
      else set.delete(ch);
      return [...set];
    });
    if (on) setActive(ch);
  }

  const message = active === "slack" ? slackMessage : emailMessage;
  const setMessage = active === "slack" ? setSlackMessage : setEmailMessage;

  function insertVar(token: string) {
    const el = textareaRef.current;
    const snippet = `{{${token}}}`;
    if (!el) {
      setMessage((m) => m + snippet);
      return;
    }
    const start = el.selectionStart ?? message.length;
    const end = el.selectionEnd ?? message.length;
    const next = message.slice(0, start) + snippet + message.slice(end);
    setMessage(next);
    requestAnimationFrame(() => {
      el.focus();
      const pos = start + snippet.length;
      el.setSelectionRange(pos, pos);
    });
  }

  if (typeof document === "undefined") return null;

  return createPortal(
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center bg-black/40 p-4"
      onMouseDown={onClose}
    >
      <div
        role="dialog"
        aria-label={title}
        onMouseDown={(e) => e.stopPropagation()}
        className="flex max-h-[88vh] w-full max-w-[920px] flex-col overflow-hidden rounded-xl border border-[var(--border)] bg-white shadow-2xl"
      >
        {/* Header */}
        <div className="flex shrink-0 items-center justify-between border-b border-[var(--border)] px-5 py-3.5">
          <h2 className="text-[15px] font-semibold text-[var(--foreground)]">{title}</h2>
          <button
            onClick={onClose}
            aria-label="Close"
            className="flex h-8 w-8 items-center justify-center rounded-md text-[var(--muted-fg)] hover:bg-[var(--muted)]"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Body */}
        <div className="flex min-h-0 flex-1">
          {/* Left — channel toggles */}
          <div className="w-[320px] shrink-0 overflow-y-auto border-r border-[var(--border)] p-4 scrollbar-thin">
            <div className="mb-4 rounded-lg border border-[var(--border)] bg-[var(--muted)]/40 p-3 text-[12px] leading-snug text-[var(--muted-fg)]">
              <span className="font-semibold text-[var(--foreground)]">Delivery note:</span>{" "}
              Turn a channel on, then edit its message on the right.
            </div>

            <div className="flex flex-col gap-2.5">
              <ChannelToggleCard
                icon={MessageSquare}
                label="Slack"
                enabled={channels.includes("slack")}
                active={active === "slack"}
                onToggle={(v) => toggle("slack", v)}
                onSelect={() => setActive("slack")}
              />
              <ChannelToggleCard
                icon={Mail}
                label="Email"
                enabled={channels.includes("email")}
                active={active === "email"}
                onToggle={(v) => toggle("email", v)}
                onSelect={() => setActive("email")}
              />
            </div>
          </div>

          {/* Right — message editor */}
          <div className="flex min-w-0 flex-1 flex-col p-5">
            <p className="text-[14px] font-semibold capitalize text-[var(--foreground)]">
              {active}
            </p>
            <div className="mt-2 flex items-center gap-4 border-b border-[var(--border)]">
              {(["edit", "preview"] as const).map((t) => (
                <button
                  key={t}
                  onClick={() => setTab(t)}
                  className={cn(
                    "-mb-px border-b-2 px-1 pb-2 text-[13px] font-medium transition-colors",
                    tab === t
                      ? "border-[var(--accent)] text-[var(--foreground)]"
                      : "border-transparent text-[var(--muted-fg)] hover:text-[var(--foreground)]",
                  )}
                >
                  {t === "edit" ? "Edit Message" : "Preview"}
                </button>
              ))}
            </div>

            {tab === "edit" ? (
              <>
                <textarea
                  ref={textareaRef}
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  spellCheck={false}
                  className="mt-3 min-h-[220px] flex-1 resize-none rounded-md border border-[var(--border)] bg-white p-3 font-mono text-[12.5px] leading-relaxed text-[var(--foreground)] outline-none focus:border-[var(--accent)]"
                />
                <div className="mt-3">
                  <p className="mb-1.5 text-[11px] font-semibold text-[var(--muted-fg)]">
                    Insert variable
                  </p>
                  <div className="flex flex-wrap gap-1.5">
                    {VARIABLES.map((v) => (
                      <button
                        key={v}
                        onClick={() => insertVar(v)}
                        className="rounded-md border border-[var(--border)] bg-[var(--muted)]/40 px-2 py-1 font-mono text-[11px] text-[var(--foreground)] transition-colors hover:border-[var(--accent)] hover:bg-[var(--accent-soft)]"
                      >
                        {`{{${v}}}`}
                      </button>
                    ))}
                  </div>
                </div>
              </>
            ) : (
              <div className="mt-3 min-h-[220px] flex-1 overflow-y-auto whitespace-pre-wrap rounded-md border border-[var(--border)] bg-[var(--muted)]/20 p-3 text-[13px] leading-relaxed text-[var(--foreground)] scrollbar-thin">
                {renderPreview(message)}
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="flex shrink-0 items-center justify-end gap-2 border-t border-[var(--border)] px-5 py-3">
          <button
            onClick={onClose}
            className="h-9 rounded-md border border-[var(--border)] bg-white px-3.5 text-[13px] font-medium text-[var(--foreground)] hover:bg-[var(--muted)]"
          >
            Cancel
          </button>
          <button
            onClick={() => onSave({ channels, slackMessage, emailMessage })}
            className="h-9 rounded-md bg-[var(--accent)] px-3.5 text-[13px] font-semibold text-white hover:bg-[var(--accent-hover)]"
          >
            Save
          </button>
        </div>
      </div>
    </div>,
    document.body,
  );
}

function ChannelToggleCard({
  icon: Icon,
  label,
  enabled,
  active,
  onToggle,
  onSelect,
}: {
  icon: typeof Mail;
  label: string;
  enabled: boolean;
  active: boolean;
  onToggle: (v: boolean) => void;
  onSelect: () => void;
}) {
  return (
    <div
      role="button"
      tabIndex={0}
      onClick={onSelect}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onSelect();
        }
      }}
      className={cn(
        "flex w-full cursor-pointer items-center gap-2.5 rounded-lg border bg-white px-3 py-2.5 text-left transition-colors",
        active
          ? "border-[var(--accent)] ring-1 ring-[var(--accent-soft)]"
          : "border-[var(--border)] hover:border-[var(--border-strong)]",
      )}
    >
      <span onClick={(e) => e.stopPropagation()}>
        <Switch
          id={`modal-channel-${label.toLowerCase()}`}
          aria-label={label}
          enabled={enabled}
          onChange={onToggle}
        />
      </span>
      <Icon className="h-4 w-4 shrink-0 text-[var(--muted-fg)]" />
      <span className="flex-1 text-[13px] font-medium text-[var(--foreground)]">{label}</span>
      <ChevronDown
        className={cn(
          "h-4 w-4 text-[var(--muted-fg)] transition-transform",
          active && "rotate-180",
        )}
      />
    </div>
  );
}
