"use client";

import { LogOut } from "lucide-react";
import { cn } from "@/lib/cn";
import type { WorkflowNode } from "@/lib/workflow/types";
import { paletteIconTileClass } from "@/lib/workflow/palette-tones";
import { ConfigBody, ConfigInfoTip, ConfigSurface } from "./config-layout";

/** Exit is a terminal marker — it has no configuration; it just ends the flow. */
export function ExitConfig({ node: _node }: { node: WorkflowNode }) {
  return (
    <ConfigBody>
      <ConfigSurface className="flex-row items-start gap-2">
        <span
          className={cn(
            "flex h-7 w-7 shrink-0 items-center justify-center rounded-md",
            paletteIconTileClass("rules"),
          )}
        >
          <LogOut className="h-3.5 w-3.5" />
        </span>
        <div className="flex items-center gap-1">
          <p className="text-[12px] font-medium text-[var(--foreground)]">
            No configuration needed
          </p>
          <ConfigInfoTip text="When the request reaches this block the flow ends." />
        </div>
      </ConfigSurface>
    </ConfigBody>
  );
}
