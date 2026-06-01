"use client";

import {
  APPROVAL_LEVEL_COMPLETION_OPTIONS,
  approvalLevelApproverCount,
  majorityRequired,
} from "@/lib/workflow/approval-level-completion";
import type { ApprovalLevelData, CompletionMode } from "@/lib/workflow/types";
import { ConfigField, ConfigSection, ConfigSelect } from "./config-layout";

export function ApprovalLevelCompletionSection({
  levelId,
  data,
  onPatch,
}: {
  levelId: string;
  data: Pick<
    ApprovalLevelData,
    "approverType" | "approverRefs" | "completionMode" | "threshold"
  >;
  onPatch: (fields: Partial<ApprovalLevelData>) => void;
}) {
  const approverCount = approvalLevelApproverCount(data);
  const completionMode = data.completionMode ?? "all";
  const threshold = data.threshold ?? 1;

  return (
    <ConfigSection
      title="Completion rule"
      subtitle="How many approvers at this level must act before the step is considered complete."
    >
      <ConfigField label="Select completion mode" required>
        <ConfigSelect
          id={`level-completion-${levelId}`}
          value={completionMode}
          placeholder="Select completion mode"
          options={APPROVAL_LEVEL_COMPLETION_OPTIONS.map((o) => o.label)}
          valueMap={APPROVAL_LEVEL_COMPLETION_OPTIONS}
          onChange={(v) =>
            onPatch({
              completionMode: v as CompletionMode,
              threshold:
                v === "threshold"
                  ? Math.min(threshold, Math.max(1, approverCount))
                  : data.threshold,
            })
          }
        />
      </ConfigField>

      {completionMode === "threshold" && (
        <ConfigField label="Threshold" required>
          <div className="flex items-center gap-3">
            <input
              type="number"
              min={1}
              max={Math.max(1, approverCount)}
              value={threshold}
              onChange={(e) =>
                onPatch({
                  threshold: Math.min(
                    Math.max(1, Number(e.target.value)),
                    Math.max(1, approverCount),
                  ),
                })
              }
              className="w-20 rounded-md border border-[var(--border)] bg-white px-3 py-2 text-[13px] outline-none focus:border-[var(--accent)]"
            />
            <span className="text-[12px] text-[var(--muted-fg)]">
              of {Math.max(1, approverCount)} approver
              {approverCount === 1 ? "" : "s"} must complete
            </span>
          </div>
        </ConfigField>
      )}

      {completionMode === "majority" && (
        <p className="rounded-md border border-[var(--border)]/60 bg-[var(--muted)]/40 px-2.5 py-1.5 text-[11px] text-[var(--muted-fg)]">
          At least{" "}
          <span className="font-medium text-[var(--foreground)]">
            {majorityRequired(approverCount)} of {Math.max(1, approverCount)}
          </span>{" "}
          approvers must complete.
        </p>
      )}
    </ConfigSection>
  );
}
