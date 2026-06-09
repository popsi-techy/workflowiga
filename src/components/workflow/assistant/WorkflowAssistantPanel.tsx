"use client";

import { useState } from "react";
import { ChevronsRight, Sparkles } from "lucide-react";
import { cn } from "@/lib/cn";
import { useWorkflowStore } from "@/lib/workflow/store";
import { AssistantTab } from "./AssistantTab";
import { TemplatesTab } from "./TemplatesTab";

type Tab = "assistant" | "templates";

export function WorkflowAssistantPanel() {
  const setAssistantOpen = useWorkflowStore((s) => s.setAssistantOpen);
  const [tab, setTab] = useState<Tab>("assistant");

  return (
    <aside className="flex h-full w-[440px] flex-col border-l border-[var(--border)] bg-white shadow-[var(--shadow-panel)]">
      <header className="flex shrink-0 items-center gap-2 border-b border-[var(--border)] px-3 py-2.5">
        <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-[#eb5424]/10 text-[#eb5424]">
          <Sparkles className="h-3.5 w-3.5" />
        </span>
        <div className="min-w-0 flex-1">
          <h2 className="text-[13px] font-semibold text-[var(--foreground)]">
            Workflow assistant
          </h2>
          <p className="text-[10.5px] text-[var(--muted-fg)]">
            Guided workflow architect
          </p>
        </div>
        <button
          type="button"
          onClick={() => setAssistantOpen(false)}
          className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md text-[var(--muted-fg)] hover:bg-[var(--muted)]"
          aria-label="Close assistant"
        >
          <ChevronsRight className="h-4 w-4" />
        </button>
      </header>

      <div className="flex shrink-0 border-b border-[var(--border)] px-3">
        {(["assistant", "templates"] as const).map((t) => (
          <button
            key={t}
            type="button"
            onClick={() => setTab(t)}
            className={cn(
              "relative px-3 py-2 text-[12px] font-medium transition-colors",
              tab === t
                ? "text-[#eb5424]"
                : "text-[var(--muted-fg)] hover:text-[var(--foreground)]",
            )}
          >
            {t === "assistant" ? "Assistant" : "Templates"}
            {tab === t && (
              <span className="absolute inset-x-3 -bottom-px h-0.5 rounded-full bg-[#eb5424]" />
            )}
          </button>
        ))}
      </div>

      <div className="flex min-h-0 flex-1 flex-col">
        {tab === "assistant" ? (
          <AssistantTab onSwitchToTemplates={() => setTab("templates")} />
        ) : (
          <div className="min-h-0 flex-1 overflow-y-auto scrollbar-thin">
            <TemplatesTab
              onApplied={() => setTab("assistant")}
            />
          </div>
        )}
      </div>
    </aside>
  );
}
