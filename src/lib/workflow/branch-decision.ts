import { uid, defaultApprovalLevelConfig } from "./defaults";
import { buildApprovalDecisionEmbedded } from "./approval-decision";
import { buildSodDecisionEmbedded } from "./sod-decision";
import type { ApprovalLevelConfig } from "./types";

/** Approval level for a branch, with its inline decision (Approved / else)
 *  attached so outcomes render directly below it — parity with top level. */
export function defaultBranchApprovalLevel(): ApprovalLevelConfig {
  const id = uid("lvl");
  return {
    ...defaultApprovalLevelConfig(),
    id,
    blockType: "approval_level",
    name: "Approval Level",
    embeddedConditional: buildApprovalDecisionEmbedded(id),
  };
}

/** SoD check for a branch, with its inline decision (violation / no violation)
 *  attached so the result routing renders directly below it. */
export function defaultBranchSodCheckLevel(): ApprovalLevelConfig {
  const id = uid("lvl");
  return {
    ...defaultApprovalLevelConfig(),
    id,
    blockType: "sod_check",
    name: "SoD Check",
    embeddedConditional: buildSodDecisionEmbedded(id),
  };
}

/** True when this branch level is an action whose inline decision should be
 *  rendered as a separate flow directly beneath the action card. */
export function hasInlineDecision(level: ApprovalLevelConfig): boolean {
  return (
    (level.blockType === "approval_level" || level.blockType === "sod_check") &&
    !!level.embeddedConditional?.decisionKind
  );
}

/** True when this branch level *is* a nested flow (conditional or multisplit)
 *  and should be rendered as that flow rather than a plain card. */
export function isNestedFlowLevel(level: ApprovalLevelConfig): boolean {
  return (
    (level.blockType === "conditional_branch" ||
      level.blockType === "approval_split") &&
    !!level.embeddedConditional
  );
}
