"use client";

import { LayoutTemplate, Sparkles } from "lucide-react";
import { useWorkflowStore } from "@/lib/workflow/store";
import { WORKFLOW_TEMPLATES } from "@/lib/workflow/assistant/templates";
import { AMAN_TEST_POLICY_NAME } from "@/lib/workflow/assistant/ladder-workflow";
import { cn } from "@/lib/cn";

interface Props {
  onApplied?: (templateName: string) => void;
}

export function TemplatesTab({ onApplied }: Props) {
  const installAssistantWorkflowPolicy = useWorkflowStore(
    (s) => s.installAssistantWorkflowPolicy,
  );
  const applyAssistantTemplate = useWorkflowStore((s) => s.applyAssistantTemplate);
  const showToast = useWorkflowStore((s) => s.showToast);

  function applyTemplate(id: string) {
    const template = WORKFLOW_TEMPLATES.find((t) => t.id === id);
    if (!template) return;
    const nodes = template.build();
    if (id === "aman_test") {
      installAssistantWorkflowPolicy(AMAN_TEST_POLICY_NAME, nodes);
      showToast(`Policy "${AMAN_TEST_POLICY_NAME}" created on canvas`, "success");
    } else {
      applyAssistantTemplate(nodes);
      showToast(`"${template.name}" applied to canvas`, "success");
    }
    onApplied?.(template.name);
  }

  return (
    <div className="flex flex-col gap-3 p-3">
      <div className="rounded-lg border border-[#eb5424]/15 bg-[#eb5424]/5 px-3 py-2.5">
        <div className="flex items-center gap-2">
          <Sparkles className="h-4 w-4 text-[#eb5424]" />
          <p className="text-[12px] font-medium text-[var(--foreground)]">
            Quick-start patterns
          </p>
        </div>
        <p className="mt-1 text-[11px] text-[var(--muted-fg)]">
          Select a template to instantly generate a workflow on the canvas. You can
          refine any step manually afterward.
        </p>
      </div>

      <div className="flex flex-col gap-2">
        {WORKFLOW_TEMPLATES.map((template) => (
          <button
            key={template.id}
            type="button"
            onClick={() => applyTemplate(template.id)}
            className={cn(
              "group flex flex-col gap-1.5 rounded-lg border border-[var(--border)] bg-white p-3 text-left transition-all",
              "hover:border-[#eb5424]/35 hover:shadow-sm",
            )}
          >
            <div className="flex items-start gap-2">
              <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-[var(--muted)]/60 text-[var(--muted-fg)] group-hover:bg-[#eb5424]/10 group-hover:text-[#eb5424]">
                <LayoutTemplate className="h-4 w-4" />
              </span>
              <div className="min-w-0 flex-1">
                <p className="text-[12.5px] font-semibold text-[var(--foreground)]">
                  {template.name}
                </p>
                <p className="mt-0.5 text-[11px] leading-snug text-[var(--muted-fg)]">
                  {template.description}
                </p>
              </div>
            </div>
            <div className="flex flex-wrap gap-1 pl-10">
              {template.tags.map((tag) => (
                <span
                  key={tag}
                  className="rounded-full bg-[var(--muted)]/50 px-2 py-0.5 text-[9.5px] font-medium text-[var(--muted-fg)]"
                >
                  {tag}
                </span>
              ))}
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}
