"use client";

import { useEffect } from "react";
import { CheckCircle2, AlertCircle, Info } from "lucide-react";
import { useWorkflowStore } from "@/lib/workflow/store";
import { cn } from "@/lib/cn";

export function ToastHost() {
  const toast = useWorkflowStore((s) => s.toast);
  const clearToast = useWorkflowStore((s) => s.clearToast);

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(clearToast, 3200);
    return () => clearTimeout(t);
  }, [toast, clearToast]);

  if (!toast) return null;

  const Icon =
    toast.tone === "success"
      ? CheckCircle2
      : toast.tone === "error"
        ? AlertCircle
        : Info;

  return (
    <div className="pointer-events-none fixed bottom-6 left-1/2 z-50 -translate-x-1/2">
      <div
        role="status"
        className={cn(
          "pointer-events-auto flex items-center gap-2.5 rounded-lg border bg-white px-4 py-2.5 text-[13px] shadow-lg",
          toast.tone === "success" &&
            "border-emerald-200 text-emerald-900",
          toast.tone === "error" && "border-red-200 text-red-900",
          toast.tone === "default" && "border-[var(--border)] text-[var(--foreground)]",
        )}
      >
        <Icon
          className={cn(
            "h-4 w-4",
            toast.tone === "success" && "text-emerald-600",
            toast.tone === "error" && "text-red-600",
            toast.tone === "default" && "text-[var(--muted-fg)]",
          )}
        />
        {toast.message}
      </div>
    </div>
  );
}
