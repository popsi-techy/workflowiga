"use client";

import { useState } from "react";
import { MessageSquare, Users } from "lucide-react";
import { cn } from "@/lib/cn";
import { useWorkflowStore } from "@/lib/workflow/store";
import {
  NOTIFICATION_AUDIENCE_OPTIONS,
  normalizeNotificationAudiences,
} from "@/lib/workflow/notification-audience";
import { USERS, getUser } from "@/lib/workflow/mock-data";
import {
  ConfigBody,
  ConfigField,
  ConfigMultiSelect,
  ConfigSection,
} from "./config-layout";
import { EntityPickerDrawer, type PickerItem } from "./EntityPickerDrawer";
import { ChannelsField } from "./ChannelsField";
import { SectionCard } from "./SectionCard";
import type {
  NotificationAudience,
  NotificationData,
  WorkflowNode,
} from "@/lib/workflow/types";

export function NotificationConfig({
  node,
  onPatch,
  embedded = false,
}: {
  node: WorkflowNode;
  onPatch?: (fields: Partial<NotificationData>) => void;
  /** True when editing a notification embedded in a branch (not a top-level task). */
  embedded?: boolean;
}) {
  const data = node.data as NotificationData;
  const updateNode = useWorkflowStore((s) => s.updateNode);
  const [recipientsDrawerOpen, setRecipientsDrawerOpen] = useState(false);

  const audiences = normalizeNotificationAudiences(data.audiences ?? data.audience);
  const recipients = data.recipients ?? [];
  const showSpecificUsers = audiences.includes("Specific users");

  const userItems: PickerItem[] = USERS.map((u) => ({
    id: u.id,
    primary: u.name,
    secondary: u.email,
    meta: u.title,
    color: "#0EA5E9",
  }));

  const recipientSummary =
    recipients.length > 0
      ? recipients
          .map((id) => getUser(id)?.name ?? id)
          .slice(0, 2)
          .join(", ") + (recipients.length > 2 ? ` +${recipients.length - 2}` : "")
      : null;

  function apply(fields: Partial<NotificationData>) {
    if (onPatch) onPatch(fields);
    else updateNode(node.id, fields as Partial<NotificationData>);
  }

  return (
    <div className="flex h-full flex-col">
      <ConfigBody>
        {!embedded && (
          <ConfigSection
            title="When to send"
            subtitle="Relative to the previous step in the flow"
            icon={MessageSquare}
          >
            <div className="flex gap-1">
              {(
                [
                  ["started", "On start"],
                  ["completed", "On complete"],
                  ["failed", "On failure"],
                ] as const
              ).map(([value, label]) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => apply({ trigger: value })}
                  className={cn(
                    "flex-1 rounded-md border px-2 py-1.5 text-[11px] font-medium transition-colors",
                    data.trigger === value
                      ? "border-[var(--accent)] bg-[var(--accent-softer)] text-[#9A3412]"
                      : "border-[var(--border)] bg-white text-[var(--muted-fg)] hover:border-[var(--border-strong)]",
                  )}
                >
                  {label}
                </button>
              ))}
            </div>
          </ConfigSection>
        )}

        <ConfigSection
          title="Delivery"
          subtitle="Who receives this and on which channels"
          icon={MessageSquare}
        >
          <ConfigField label="Audience">
            <ConfigMultiSelect
              id={`notification-audience-${node.id}`}
              placeholder="Select audience…"
              options={NOTIFICATION_AUDIENCE_OPTIONS.map((a) => ({
                value: a,
                label: a,
              }))}
              value={audiences}
              onChange={(values) =>
                apply({ audiences: values as NotificationAudience[] })
              }
            />
          </ConfigField>

          {showSpecificUsers && (
            <SectionCard
              category="tasks"
              icon={Users}
              title="Specific users"
              description="Choose who receives this notification"
              summary={recipientSummary}
              count={recipients.length}
              onClick={() => setRecipientsDrawerOpen(true)}
            />
          )}

          <ConfigField label="Channels">
            <ChannelsField
              value={{
                channels: data.channels,
                slackMessage: data.slackMessage,
                emailMessage: data.emailMessage,
              }}
              onChange={apply}
            />
          </ConfigField>

          {audiences.length === 0 && (
            <p className="rounded-md border border-amber-200 bg-amber-50 px-2.5 py-1.5 text-[11px] text-amber-700">
              Pick at least one audience.
            </p>
          )}
          {data.channels.length === 0 && (
            <p className="rounded-md border border-amber-200 bg-amber-50 px-2.5 py-1.5 text-[11px] text-amber-700">
              Pick at least one channel.
            </p>
          )}
          {showSpecificUsers && recipients.length === 0 && (
            <p className="rounded-md border border-amber-200 bg-amber-50 px-2.5 py-1.5 text-[11px] text-amber-700">
              Select at least one user for Specific users.
            </p>
          )}
        </ConfigSection>
      </ConfigBody>

      <EntityPickerDrawer
        open={recipientsDrawerOpen}
        onClose={() => setRecipientsDrawerOpen(false)}
        title="Select recipients"
        description="Users who receive this notification"
        icon={Users}
        items={userItems}
        selectedIds={recipients}
        onChange={(ids) => apply({ recipients: ids })}
        searchPlaceholder="Search users…"
      />
    </div>
  );
}
