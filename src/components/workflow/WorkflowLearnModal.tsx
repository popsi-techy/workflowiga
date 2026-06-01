"use client";

import { useEffect } from "react";
import { createPortal } from "react-dom";
import {
  ArrowRightLeft,
  Bell,
  Filter,
  GitFork,
  ListChecks,
  LogOut,
  ShieldCheck,
  SkipForward,
  Split,
  UserPlus,
  X,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/cn";
import {
  paletteIconTileClass,
  type PaletteCategory,
} from "@/lib/workflow/palette-tones";

interface EntityRow {
  icon: LucideIcon;
  category: PaletteCategory;
  name: string;
  description: string;
}

const WORKFLOW_ENTITIES: { title: string; items: EntityRow[] }[] = [
  {
    title: "Events",
    items: [
      {
        icon: UserPlus,
        category: "events",
        name: "Joiner",
        description:
          "Starts the workflow when a new identity is created. Every policy begins with one event.",
      },
      {
        icon: ArrowRightLeft,
        category: "events",
        name: "Mover / Leaver",
        description:
          "Run logic when an identity's attributes change or when they are deactivated (coming soon).",
      },
    ],
  },
  {
    title: "Filters",
    items: [
      {
        icon: Filter,
        category: "filters",
        name: "User Filter",
        description:
          "Narrows the workflow to users who match attribute rules — e.g. department or role — before any tasks run.",
      },
    ],
  },
  {
    title: "Tasks",
    items: [
      {
        icon: ListChecks,
        category: "tasks",
        name: "Assign Entities",
        description:
          "Provisions apps, entitlements, and roles to the requester when this step runs.",
      },
      {
        icon: Bell,
        category: "tasks",
        name: "Notification",
        description:
          "Sends Slack or email alerts when a step completes, fails, or starts.",
      },
    ],
  },
  {
    title: "Modules",
    items: [
      {
        icon: ShieldCheck,
        category: "modules",
        name: "Approval Policy",
        description:
          "Embeds a saved approval policy so sign-off runs as part of this workflow.",
      },
    ],
  },
  {
    title: "Rules",
    items: [
      {
        icon: GitFork,
        category: "rules",
        name: "Multisplit Branch",
        description:
          "Runs parallel paths at once — e.g. different departments — then merges before the next step. You can place filters, modules, and tasks inside each branch.",
      },
      {
        icon: Split,
        category: "rules",
        name: "Conditional Branch",
        description:
          "Routes the request down the first branch whose IF condition matches; unmatched requests follow the ELSE path.",
      },
      {
        icon: SkipForward,
        category: "rules",
        name: "Skip",
        description:
          "Bypasses a branch route while the rest of the workflow continues after the split.",
      },
      {
        icon: LogOut,
        category: "rules",
        name: "Exit",
        description:
          "Ends that path immediately — no further steps run on that route.",
      },
    ],
  },
];

export function WorkflowLearnModal({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open || typeof document === "undefined") return null;

  return createPortal(
    <div
      role="presentation"
      className="fixed inset-0 z-[60] flex items-center justify-center px-4 py-8"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        aria-hidden
        className="absolute inset-0 bg-slate-900/35 backdrop-blur-[1px]"
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="workflow-learn-title"
        className="node-enter relative flex max-h-[min(640px,calc(100vh-4rem))] w-[480px] max-w-full flex-col overflow-hidden rounded-xl border border-[var(--border)] bg-white shadow-2xl"
      >
        <header className="flex shrink-0 items-start gap-3 border-b border-[var(--border)] px-5 py-4">
          <div className="min-w-0 flex-1">
            <h2
              id="workflow-learn-title"
              className="text-[15px] font-semibold text-[var(--foreground)]"
            >
              Learn about workflows
            </h2>
            <p className="mt-1 text-[12.5px] leading-relaxed text-[var(--muted-fg)]">
              Workflows automate identity lifecycle steps. Drag blocks from the
              left panel onto the canvas — they run top to bottom after the
              trigger event.
            </p>
          </div>
          <button
            onClick={onClose}
            aria-label="Close"
            className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md text-[var(--muted-fg)] hover:bg-[var(--muted)] hover:text-[var(--foreground)]"
          >
            <X className="h-4 w-4" />
          </button>
        </header>

        <div className="flex-1 overflow-y-auto px-5 py-4 scrollbar-thin">
          <div className="flex flex-col gap-5">
            {WORKFLOW_ENTITIES.map((section) => (
              <section key={section.title}>
                <p className="mb-2 text-[10.5px] font-semibold uppercase tracking-[0.06em] text-[var(--muted-fg)]">
                  {section.title}
                </p>
                <ul className="flex flex-col gap-2">
                  {section.items.map((item) => {
                    const Icon = item.icon;
                    return (
                      <li
                        key={item.name}
                        className="flex gap-2.5 rounded-lg border border-[var(--border)]/80 bg-[var(--muted)]/20 px-3 py-2.5"
                      >
                        <span
                          className={cn(
                            "flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ring-1",
                            paletteIconTileClass(item.category),
                          )}
                        >
                          <Icon className="h-3.5 w-3.5" />
                        </span>
                        <div className="min-w-0">
                          <p className="text-[13px] font-semibold text-[var(--foreground)]">
                            {item.name}
                          </p>
                          <p className="mt-0.5 text-[11.5px] leading-snug text-[var(--muted-fg)]">
                            {item.description}
                          </p>
                        </div>
                      </li>
                    );
                  })}
                </ul>
              </section>
            ))}
          </div>
        </div>

        <footer className="shrink-0 border-t border-[var(--border)] bg-[var(--muted)]/30 px-5 py-3">
          <button
            onClick={onClose}
            className="h-9 w-full rounded-md bg-[var(--accent)] text-[13px] font-semibold text-white transition-colors hover:bg-[var(--accent-hover)]"
          >
            Got it
          </button>
        </footer>
      </div>
    </div>,
    document.body,
  );
}
