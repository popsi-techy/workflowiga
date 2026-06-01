"use client";

import { useWorkflowStore } from "@/lib/workflow/store";
import { ConfigBody, ConfigInset, ConfigSection } from "./config-layout";
import { DecisionOutcomesEmpty, DecisionOutcomesSection } from "./ApprovalOutcomes";
import { buildSodDecisionEmbedded } from "@/lib/workflow/sod-decision";
import { addOutcomeRoute, separableOutcomes } from "@/lib/workflow/decision-outcomes";
import type {
  ConditionalBranchData,
  EmbeddedConditionalData,
  SodCheckData,
  WorkflowNode,
} from "@/lib/workflow/types";

export function SodCheckConfig({ node }: { node: WorkflowNode }) {
  const data = node.data as SodCheckData & {
    embeddedConditional?: EmbeddedConditionalData;
  };
  const decisionExists = useWorkflowStore((s) =>
    data.decisionNodeId
      ? s.nodes.some((n) => n.id === data.decisionNodeId)
      : false,
  );
  const isTopLevelNode = useWorkflowStore((s) =>
    s.nodes.some((n) => n.id === node.id),
  );
  const addDecisionForAction = useWorkflowStore((s) => s.addDecisionForAction);
  const updateNode = useWorkflowStore((s) => s.updateNode);

  const hasInlineDecision = !!data.embeddedConditional?.decisionKind;
  const showLinked = !!data.decisionNodeId && decisionExists;
  const showInline = !data.decisionNodeId && hasInlineDecision;
  const showEmpty = !showLinked && !showInline;

  function handleAddOutcome(outcome: string) {
    if (isTopLevelNode) {
      const decisionId = addDecisionForAction(node.id);
      if (!decisionId) return;
      const dnode = useWorkflowStore
        .getState()
        .nodes.find((n) => n.id === decisionId);
      if (!dnode) return;
      const ddata = dnode.data as ConditionalBranchData;
      if (separableOutcomes(ddata).includes(outcome)) {
        updateNode(decisionId, addOutcomeRoute(ddata, outcome));
      }
      return;
    }
    // Branch-level SoD check: (re)create the inline decision on the level.
    let emb = buildSodDecisionEmbedded(node.id);
    if (separableOutcomes(emb).includes(outcome)) {
      emb = addOutcomeRoute(emb, outcome);
    }
    updateNode(node.id, {
      embeddedConditional: emb,
    } as Partial<WorkflowNode["data"]>);
  }

  return (
    <div className="flex h-full flex-col">
      <ConfigBody>
        <ConfigSection
          title="Segregation of Duties check"
          subtitle="Scans the request for conflicting-duty violations before it proceeds."
        >
          <ConfigInset className="gap-1.5">
            <p className="text-[11.5px] font-medium text-[var(--foreground)]">
              This step only runs the check
            </p>
            <p className="text-[11px] leading-snug text-[var(--muted-fg)]">
              What happens next — on a violation, when clear, or by risk level —
              is handled by the outcomes below.
            </p>
          </ConfigInset>
        </ConfigSection>

        {showLinked && (
          <DecisionOutcomesSection decisionNodeId={data.decisionNodeId!} />
        )}
        {showInline && <DecisionOutcomesSection hostLevelId={node.id} />}
        {showEmpty && (
          <DecisionOutcomesEmpty
            decisionKind="sod"
            onAddOutcome={handleAddOutcome}
          />
        )}
      </ConfigBody>
    </div>
  );
}

export function sodCheckSubtitle(data: SodCheckData): string {
  return data.decisionNodeId
    ? "Runs the SoD check · outcomes handled below"
    : "Scans for segregation-of-duties violations";
}
