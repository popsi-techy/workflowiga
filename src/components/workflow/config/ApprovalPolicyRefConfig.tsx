"use client";

import { useMemo, useState } from "react";
import { ShieldCheck, ExternalLink } from "lucide-react";
import { useWorkflowStore } from "@/lib/workflow/store";
import { SectionCard } from "./SectionCard";
import { EntityPickerDrawer, type PickerItem } from "./EntityPickerDrawer";
import { ConfigBody, ConfigSection } from "./config-layout";
import type { ApprovalPolicyRefData, WorkflowNode } from "@/lib/workflow/types";

export function ApprovalPolicyRefConfig({
  node,
  onPatch,
}: {
  node: WorkflowNode;
  onPatch?: (fields: Partial<ApprovalPolicyRefData>) => void;
}) {
  const data = node.data as ApprovalPolicyRefData;
  const updateNode = useWorkflowStore((s) => s.updateNode);
  const policies = useWorkflowStore((s) => s.policies);
  const openPolicy = useWorkflowStore((s) => s.openPolicy);
  const [drawerOpen, setDrawerOpen] = useState(false);

  function patch(fields: Partial<ApprovalPolicyRefData>) {
    if (onPatch) onPatch(fields);
    else updateNode(node.id, fields as Partial<ApprovalPolicyRefData>);
  }

  // Only active approval policies can be linked — drafts aren't selectable.
  const approvalPolicies = useMemo(
    () => policies.filter((p) => p.type === "approval" && p.status === "active"),
    [policies],
  );

  const items = useMemo<PickerItem[]>(
    () =>
      approvalPolicies.map((p) => ({
        id: p.id,
        primary: p.name,
        secondary: "Active",
        meta: `${p.nodes.length} block${p.nodes.length === 1 ? "" : "s"}`,
        color: "#059669",
      })),
    [approvalPolicies],
  );

  const selected = policies.find((p) => p.id === data.policyId);

  return (
    <div className="flex h-full flex-col">
      <ConfigBody>
        <ConfigSection
          title="Approval Policy"
          subtitle="Linked policy runs at this step"
          icon={ShieldCheck}
        >
          <div className="flex flex-col gap-1">
            <p className="text-[10.5px] font-medium text-[var(--foreground)]">
              Select policy<span className="ml-0.5 text-red-500">*</span>
            </p>
            <SectionCard
              category="modules"
              icon={ShieldCheck}
              title={selected ? selected.name : "Choose an approval policy"}
              description="Pick from your approval policy library"
              summary={
                selected
                  ? `${selected.status === "active" ? "Active" : "Draft"} · ${selected.nodes.length} block${selected.nodes.length === 1 ? "" : "s"}`
                  : null
              }
              count={selected ? 1 : 0}
              onClick={() => setDrawerOpen(true)}
            />
          </div>

          {selected && (
            <button
              onClick={() => openPolicy(selected.id)}
              className="flex items-center gap-1.5 self-start rounded-md border border-[var(--border)] bg-white px-3 py-1.5 text-[12px] font-medium text-[var(--foreground)] transition-colors hover:bg-[var(--muted)]"
            >
              <ExternalLink className="h-3.5 w-3.5 text-[var(--muted-fg)]" />
              Open this policy
            </button>
          )}

          {approvalPolicies.length === 0 && (
            <p className="rounded-md border border-[var(--border)]/60 bg-[var(--muted)]/40 px-2.5 py-1.5 text-[11px] text-[var(--muted-fg)]">
              No active approval policies yet. Only activated policies can be
              linked — activate one from the Approval Policies table, then return
              here.
            </p>
          )}
        </ConfigSection>
      </ConfigBody>

      <EntityPickerDrawer
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        title="Select approval policy"
        description="The chosen policy's approver chain runs at this step"
        icon={ShieldCheck}
        iconCategory="modules"
        items={items}
        selectedIds={data.policyId ? [data.policyId] : []}
        single
        onChange={(ids) => patch({ policyId: ids[0] })}
        searchPlaceholder="Search approval policies…"
        emptyLabel="No approval policies found"
      />
    </div>
  );
}
