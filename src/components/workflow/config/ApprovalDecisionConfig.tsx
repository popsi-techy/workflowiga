"use client";

import { DecisionOutcomesSection } from "./ApprovalOutcomes";
import { ConfigBody } from "./config-layout";
import type { WorkflowNode } from "@/lib/workflow/types";

export function ApprovalDecisionConfig({ node }: { node: WorkflowNode }) {
  return (
    <div className="flex h-full flex-col">
      <ConfigBody>
        <DecisionOutcomesSection decisionNodeId={node.id} />
      </ConfigBody>
    </div>
  );
}
