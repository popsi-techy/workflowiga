"use client";

import { useWorkflowStore } from "@/lib/workflow/store";
import type { EventData, WorkflowNode } from "@/lib/workflow/types";
import { ConfigBody, ConfigField } from "./config-layout";

export function EventConfig({ node }: { node: WorkflowNode }) {
  const data = node.data as EventData;
  const updateNode = useWorkflowStore((s) => s.updateNode);

  return (
    <ConfigBody>
      <section>
        <ConfigField
          label="Description"
          hint="Shown on the event card in the canvas"
        >
        <textarea
          rows={2}
          placeholder="Add description"
          value={data.description ?? ""}
          onChange={(e) =>
            updateNode(node.id, { description: e.target.value })
          }
          className="w-full resize-none rounded-md border border-[var(--border)] bg-white px-2.5 py-1.5 text-[12.5px] outline-none transition-colors focus:border-[var(--accent)]"
        />
        </ConfigField>
      </section>
    </ConfigBody>
  );
}
