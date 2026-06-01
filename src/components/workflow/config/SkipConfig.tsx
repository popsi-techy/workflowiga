"use client";

import { SkipForward } from "lucide-react";
import { cn } from "@/lib/cn";
import { paletteIconTileClass } from "@/lib/workflow/palette-tones";
import type { WorkflowNode } from "@/lib/workflow/types";
import { ConfigBody, ConfigInfoTip, ConfigSurface } from "./config-layout";

/** Skip is a route-bypass marker — no configuration; the flow continues after. */
export function SkipConfig({ node: _node }: { node: WorkflowNode }) {
  return (
    <ConfigBody>
      <ConfigSurface className="flex-row items-start gap-2">
        <span
          className={cn(
            "flex h-7 w-7 shrink-0 items-center justify-center rounded-md",
            paletteIconTileClass("rules"),
          )}
        >
          <SkipForward className="h-3.5 w-3.5" />
        </span>
        <div className="flex items-center gap-1">
          <p className="text-[12px] font-medium text-[var(--foreground)]">
            No configuration needed
          </p>
          <ConfigInfoTip text="Bypasses this branch; the flow continues with the next step." />
        </div>
      </ConfigSurface>
    </ConfigBody>
  );
}
