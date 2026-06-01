"use client";

import { useEffect, useRef, useState } from "react";
import {
  ArrowLeft,
  CheckCircle2,
  CircleSlash,
  MoreVertical,
  History,
  Trash2,
  Pin,
  PinOff,
} from "lucide-react";
import { useWorkflowStore } from "@/lib/workflow/store";
import { cn } from "@/lib/cn";

export function EditorHeader() {
  const nodes = useWorkflowStore((s) => s.nodes);
  const showToast = useWorkflowStore((s) => s.showToast);
  const openVersions = useWorkflowStore((s) => s.openVersions);
  const rightPanelOpen = useWorkflowStore((s) => s.rightPanelOpen);
  const rightPanelView = useWorkflowStore((s) => s.rightPanelView);
  const setRightPanelOpen = useWorkflowStore((s) => s.setRightPanelOpen);
  const editorContext = useWorkflowStore((s) => s.editorContext);
  const currentPolicyId = useWorkflowStore((s) => s.currentPolicyId);
  const policies = useWorkflowStore((s) => s.policies);
  const goToList = useWorkflowStore((s) => s.goToList);
  const renameCurrentPolicy = useWorkflowStore((s) => s.renameCurrentPolicy);
  const commitCurrentPolicy = useWorkflowStore((s) => s.commitCurrentPolicy);
  const deletePolicy = useWorkflowStore((s) => s.deletePolicy);
  const requestConfirm = useWorkflowStore((s) => s.requestConfirm);

  const [menuOpen, setMenuOpen] = useState(false);
  const [pinning, setPinning] = useState<"idle" | "saving" | "done" | "error">("idle");
  const menuRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!menuOpen) return;
    function onDown(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    }
    window.addEventListener("mousedown", onDown);
    return () => window.removeEventListener("mousedown", onDown);
  }, [menuOpen]);

  const currentPolicy = policies.find((p) => p.id === currentPolicyId);

  /** Writes the current policy into user-seeds.json via the dev-only API route. */
  async function onPinToSeed() {
    if (!currentPolicy) return;
    setMenuOpen(false);
    setPinning("saving");
    try {
      const res = await fetch("/api/dev/save-seed", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(currentPolicy),
      });
      if (!res.ok) {
        const { error } = (await res.json()) as { error?: string };
        showToast(error ?? "Failed to pin policy", "error");
        setPinning("error");
      } else {
        showToast(`"${currentPolicy.name}" pinned to seed — commit user-seeds.json to deploy`, "success");
        setPinning("done");
      }
    } catch {
      showToast("Could not reach the dev API", "error");
      setPinning("error");
    }
    setTimeout(() => setPinning("idle"), 3000);
  }

  async function onUnpinFromSeed() {
    if (!currentPolicy) return;
    setMenuOpen(false);
    try {
      await fetch("/api/dev/save-seed", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: currentPolicy.id }),
      });
      showToast(`"${currentPolicy.name}" removed from seed`, "default");
    } catch {
      showToast("Could not reach the dev API", "error");
    }
  }
  const isConfigured =
    nodes.length > 0 && nodes.every((n) => n.status === "configured");
  const versionsActive = rightPanelOpen && rightPanelView === "versions";

  const headerInitial = editorContext === "approval" ? "A" : "V";

  // Local mirror of the policy name so typing stays smooth.
  const [name, setName] = useState(currentPolicy?.name ?? "");
  useEffect(() => {
    setName(currentPolicy?.name ?? "");
  }, [currentPolicy?.name]);

  function commitName() {
    const clean = name.trim();
    if (clean && clean !== currentPolicy?.name) {
      renameCurrentPolicy(clean);
    } else if (!clean) {
      setName(currentPolicy?.name ?? "");
    }
  }

  function onSave() {
    if (nodes.length === 0) {
      showToast("Add at least an Event before saving", "error");
      return;
    }
    commitCurrentPolicy();
    showToast("Policy saved", "success");
  }
  function onActivate() {
    const hasEvent = nodes.some((n) => n.kind === "event");
    const hasTask = nodes.some((n) => n.kind === "task");
    if (!hasEvent || !hasTask || !isConfigured) {
      showToast("Complete the Event and a Block before activating", "error");
      return;
    }
    commitCurrentPolicy("active");
    showToast("Policy activated", "success");
  }
  function onDeactivate() {
    commitCurrentPolicy("draft");
    showToast("Policy deactivated", "default");
  }
  function onDeletePolicy() {
    setMenuOpen(false);
    if (!currentPolicy) return;
    requestConfirm({
      title: `Delete "${currentPolicy.name}"?`,
      message: "This policy and its canvas will be permanently removed.",
      confirmLabel: "Delete",
      tone: "danger",
      onConfirm: () => {
        const type = currentPolicy.type;
        deletePolicy(currentPolicy.id);
        goToList(type);
        showToast(`"${currentPolicy.name}" deleted`, "default");
      },
    });
  }
  function onToggleVersions() {
    if (versionsActive) {
      setRightPanelOpen(false);
    } else {
      openVersions();
    }
  }

  return (
    <div className="flex h-16 shrink-0 items-center justify-between gap-4 border-b border-[var(--border)] bg-white px-5">
      <div className="flex min-w-0 flex-1 items-center gap-3">
        <button
          onClick={() => goToList(editorContext)}
          className="flex h-8 w-8 items-center justify-center rounded-md text-[var(--muted-fg)] transition-colors hover:bg-[var(--muted)]"
          aria-label="Back to policies"
          title="Back to policies"
        >
          <ArrowLeft className="h-4 w-4" />
        </button>
        <span
          className={cn(
            "flex h-8 w-8 items-center justify-center rounded-md text-[12px] font-bold uppercase",
            editorContext === "approval"
              ? "bg-emerald-50 text-emerald-700"
              : "bg-[var(--accent-soft)] text-[#9A3412]",
          )}
        >
          {headerInitial}
        </span>
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          onBlur={commitName}
          onKeyDown={(e) => {
            if (e.key === "Enter") (e.target as HTMLInputElement).blur();
            if (e.key === "Escape") {
              setName(currentPolicy?.name ?? "");
              (e.target as HTMLInputElement).blur();
            }
          }}
          placeholder="Untitled Policy"
          aria-label="Policy name"
          title={name || undefined}
          className="min-w-0 flex-1 max-w-[min(420px,100%)] truncate rounded-md border border-transparent bg-transparent px-1.5 py-1 text-[15px] font-semibold tracking-tight text-[var(--foreground)] outline-none transition-colors hover:border-[var(--border)] focus:border-[var(--accent)] focus:overflow-x-auto"
        />
      </div>

      <div className="flex shrink-0 items-center gap-2">
        <StatusChip active={currentPolicy?.status === "active"} />
        <span className="mx-1 h-5 w-px bg-[var(--border)]" aria-hidden />
        <button
          onClick={onToggleVersions}
          aria-pressed={versionsActive}
          aria-label="Open versions"
          data-tour="versions"
          className={cn(
            "flex h-9 items-center gap-1.5 rounded-lg px-3 text-[13px] font-medium transition-colors",
            versionsActive
              ? "bg-[var(--accent-softer)] text-[#9A3412]"
              : "text-[var(--muted-fg)] hover:bg-[var(--muted)] hover:text-[var(--foreground)]",
          )}
        >
          <History className="h-3.5 w-3.5" />
          Versions
        </button>
        <button
          onClick={onSave}
          className="flex h-9 items-center gap-1.5 rounded-lg border border-[var(--border)] bg-white px-3.5 text-[13px] font-medium text-[var(--foreground)] shadow-[var(--shadow-xs)] transition-all hover:border-[var(--border-strong)] hover:bg-[var(--muted)] active:scale-[0.98]"
        >
          <CheckCircle2 className="h-3.5 w-3.5 text-[var(--muted-fg)]" />
          Save
        </button>
        {currentPolicy?.status === "active" ? (
          <button
            onClick={onDeactivate}
            data-tour="save"
            className="flex h-9 items-center gap-1.5 rounded-lg border border-[var(--border)] bg-white px-3.5 text-[13px] font-semibold text-[#9A3412] shadow-[var(--shadow-xs)] transition-all hover:border-[var(--border-strong)] hover:bg-[var(--muted)] active:scale-[0.98]"
          >
            <CircleSlash className="h-3.5 w-3.5" />
            Deactivate
          </button>
        ) : (
          <button
            onClick={onActivate}
            data-tour="save"
            className="flex h-9 items-center gap-1.5 rounded-lg bg-[var(--accent)] px-3.5 text-[13px] font-semibold text-white shadow-[var(--shadow-sm)] transition-all hover:bg-[var(--accent-hover)] hover:shadow-[var(--shadow-card-hover)] active:scale-[0.98]"
          >
            <CheckCircle2 className="h-3.5 w-3.5" />
            Save &amp; Activate
          </button>
        )}
        <div className="relative" ref={menuRef}>
          <button
            onClick={() => setMenuOpen((o) => !o)}
            aria-label="More options"
            aria-haspopup="menu"
            aria-expanded={menuOpen}
            className={cn(
              "flex h-9 w-9 items-center justify-center rounded-lg text-[var(--muted-fg)] transition-colors hover:bg-[var(--muted)] hover:text-[var(--foreground)]",
              menuOpen && "bg-[var(--muted)]",
            )}
          >
            <MoreVertical className="h-4 w-4" />
          </button>
          {menuOpen && (
            <div
              role="menu"
              className="absolute right-0 top-full z-50 mt-1.5 w-48 overflow-hidden rounded-xl border border-[var(--border)] bg-white py-1 shadow-[var(--shadow-pop)]"
            >
              <button
                role="menuitem"
                onClick={onPinToSeed}
                disabled={pinning === "saving"}
                className="flex w-full items-center gap-2 px-3 py-2 text-left text-[13px] font-medium text-[var(--foreground)] transition-colors hover:bg-[var(--muted)] disabled:opacity-50"
              >
                <Pin className="h-3.5 w-3.5 text-[var(--accent)]" />
                {pinning === "saving" ? "Saving…" : pinning === "done" ? "Pinned ✔" : "Pin to seed"}
              </button>
              <button
                role="menuitem"
                onClick={onUnpinFromSeed}
                className="flex w-full items-center gap-2 px-3 py-2 text-left text-[13px] font-medium text-[var(--muted-fg)] transition-colors hover:bg-[var(--muted)]"
              >
                <PinOff className="h-3.5 w-3.5" />
                Unpin from seed
              </button>
              <div className="my-1 h-px bg-[var(--border)]" />
              <button
                role="menuitem"
                onClick={onDeletePolicy}
                className="flex w-full items-center gap-2 px-3 py-2 text-left text-[13px] font-medium text-red-600 transition-colors hover:bg-red-50"
              >
                <Trash2 className="h-3.5 w-3.5" />
                Delete policy
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function StatusChip({ active }: { active: boolean }) {
  if (active) {
    return (
      <span className="inline-flex h-7 items-center gap-1.5 rounded-md bg-emerald-50 px-2.5 text-[12px] font-medium text-emerald-700">
        <span className="inline-block h-1.5 w-1.5 rounded-full bg-emerald-500" />
        Active
      </span>
    );
  }
  return (
    <span className="inline-flex h-7 items-center gap-1.5 rounded-md bg-[var(--draft-bg)] px-2.5 text-[12px] font-medium text-[#854D0E]">
      <span className="inline-block h-1.5 w-1.5 rounded-full bg-[var(--draft)]" />
      Draft
    </span>
  );
}
