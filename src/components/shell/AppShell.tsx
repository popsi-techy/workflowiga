"use client";

import { useEffect, useState } from "react";
import { useWorkflowStore } from "@/lib/workflow/store";
import { listPath, policyPath, parseAutomationPath } from "@/lib/workflow/routing";
import { AppSidebar } from "./AppSidebar";
import { TopBar } from "./TopBar";
import { EditorHeader } from "./EditorHeader";
import { WorkflowEditor } from "@/components/workflow/WorkflowEditor";
import { PolicyListPage } from "@/components/workflow/PolicyListPage";
import { ToastHost } from "@/components/workflow/ToastHost";
import { ConfirmDialog } from "@/components/workflow/ConfirmDialog";
import { TourOverlay } from "@/components/workflow/TourOverlay";

/** The path the current store state should map to. */
function pathFromState(
  screen: "list" | "editor",
  listType: "workflow" | "approval",
  editorContext: "workflow" | "approval",
  currentPolicyId: string | null,
): string {
  if (screen === "editor") {
    return currentPolicyId
      ? policyPath(editorContext, currentPolicyId)
      : listPath(editorContext);
  }
  return listPath(listType);
}

export function AppShell() {
  const screen = useWorkflowStore((s) => s.screen);
  const listType = useWorkflowStore((s) => s.listType);
  const editorContext = useWorkflowStore((s) => s.editorContext);
  const currentPolicyId = useWorkflowStore((s) => s.currentPolicyId);
  const syncFromRoute = useWorkflowStore((s) => s.syncFromRoute);

  const [routed, setRouted] = useState(false);

  // On mount: align store to the URL, and keep them in sync on back/forward.
  useEffect(() => {
    function applyUrl() {
      const parsed = parseAutomationPath(window.location.pathname);
      if (parsed) {
        syncFromRoute({
          screen: parsed.screen,
          type: parsed.type,
          policyId: parsed.policyId,
        });
      }
    }
    applyUrl();
    setRouted(true);
    window.addEventListener("popstate", applyUrl);
    return () => window.removeEventListener("popstate", applyUrl);
  }, [syncFromRoute]);

  // Reflect store state into the URL (only after the initial alignment so we
  // don't clobber a deep-linked URL with the default state).
  useEffect(() => {
    if (!routed || typeof window === "undefined") return;
    const next = pathFromState(screen, listType, editorContext, currentPolicyId);
    if (next !== window.location.pathname) {
      window.history.pushState(null, "", next);
    }
  }, [routed, screen, listType, editorContext, currentPolicyId]);

  return (
    <div className="flex h-full w-full overflow-hidden">
      <AppSidebar />
      <div className="flex flex-1 flex-col overflow-hidden">
        <TopBar />
        {!routed ? (
          <div className="flex-1 bg-[var(--canvas-bg)]" />
        ) : screen === "editor" ? (
          <>
            <EditorHeader />
            <WorkflowEditor />
          </>
        ) : (
          <PolicyListPage />
        )}
      </div>
      <ToastHost />
      <ConfirmDialog />
      <TourOverlay />
    </div>
  );
}
