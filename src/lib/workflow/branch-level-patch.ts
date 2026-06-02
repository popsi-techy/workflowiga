import type {
  ApprovalLevelConfig,
  ApprovalSplitData,
  EmbeddedConditionalData,
  SplitBranchData,
  WorkflowNode,
} from "./types";

/** A level hosts a nested flow when it carries embedded branches. The role
 *  (nested conditional/multisplit vs. an action's inline decision) is decided
 *  by `blockType`, but for tree-walking we just need the embedded branches. */
function hasEmbedded(
  l: ApprovalLevelConfig,
): l is ApprovalLevelConfig & { embeddedConditional: EmbeddedConditionalData } {
  return !!l.embeddedConditional;
}

export function patchBranchesLevels(
  branches: SplitBranchData[],
  levelId: string,
  patch: Partial<ApprovalLevelConfig>,
): { branches: SplitBranchData[]; found: boolean } {
  let found = false;
  const updated = branches.map((b) => ({
    ...b,
    levels: b.levels.map((l) => {
      if (l.id === levelId) {
        found = true;
        const merged = { ...l, ...patch };
        const emb = merged.embeddedConditional;
        if (
          patch.name !== undefined &&
          emb &&
          !emb.decisionKind &&
          (merged.blockType === "conditional_branch" ||
            merged.blockType === "conditional_branch_v2" ||
            merged.blockType === "approval_split")
        ) {
          merged.embeddedConditional = { ...emb, name: patch.name };
        }
        return merged;
      }
      if (hasEmbedded(l)) {
        const inner = patchBranchesLevels(
          l.embeddedConditional.branches,
          levelId,
          patch,
        );
        if (inner.found) {
          found = true;
          return {
            ...l,
            embeddedConditional: {
              ...l.embeddedConditional,
              branches: inner.branches,
            },
          };
        }
      }
      return l;
    }),
  }));
  return { branches: updated, found };
}

export function insertIntoBranches(
  branches: SplitBranchData[],
  branchId: string,
  index: number,
  preset: Partial<ApprovalLevelConfig>,
  createLevel: () => ApprovalLevelConfig,
): { branches: SplitBranchData[]; inserted: boolean } {
  let inserted = false;
  const updated = branches.map((b) => {
    if (b.id !== branchId) return b;
    inserted = true;
    const newLvl = { ...createLevel(), ...preset };
    const nextLevels = [...b.levels];
    nextLevels.splice(index, 0, newLvl);
    return { ...b, levels: nextLevels };
  });
  return { branches: updated, inserted };
}

/** Insert into the embedded flow hosted by `hostLevelId`, found at any depth. */
export function insertIntoEmbeddedBranches(
  branches: SplitBranchData[],
  hostLevelId: string,
  branchId: string,
  index: number,
  preset: Partial<ApprovalLevelConfig>,
  createLevel: () => ApprovalLevelConfig,
): { branches: SplitBranchData[]; inserted: boolean } {
  let inserted = false;
  const updated = branches.map((b) => ({
    ...b,
    levels: b.levels.map((l) => {
      if (!hasEmbedded(l)) return l;
      if (l.id === hostLevelId) {
        const inner = insertIntoBranches(
          l.embeddedConditional.branches,
          branchId,
          index,
          preset,
          createLevel,
        );
        if (!inner.inserted) return l;
        inserted = true;
        return {
          ...l,
          embeddedConditional: {
            ...l.embeddedConditional,
            branches: inner.branches,
          },
        };
      }
      // Recurse deeper — the host may be nested several levels down.
      const deeper = insertIntoEmbeddedBranches(
        l.embeddedConditional.branches,
        hostLevelId,
        branchId,
        index,
        preset,
        createLevel,
      );
      if (!deeper.inserted) return l;
      inserted = true;
      return {
        ...l,
        embeddedConditional: {
          ...l.embeddedConditional,
          branches: deeper.branches,
        },
      };
    }),
  }));
  return { branches: updated, inserted };
}

/** Patch the embedded flow data on `hostLevelId`, found at any depth. */
export function patchEmbeddedConditional(
  branches: SplitBranchData[],
  hostLevelId: string,
  patch: Partial<EmbeddedConditionalData>,
): { branches: SplitBranchData[]; found: boolean } {
  let found = false;
  const updated = branches.map((b) => ({
    ...b,
    levels: b.levels.map((l) => {
      if (!hasEmbedded(l)) return l;
      if (l.id === hostLevelId) {
        found = true;
        return {
          ...l,
          embeddedConditional: { ...l.embeddedConditional, ...patch },
        };
      }
      const deeper = patchEmbeddedConditional(
        l.embeddedConditional.branches,
        hostLevelId,
        patch,
      );
      if (deeper.found) {
        found = true;
        return {
          ...l,
          embeddedConditional: {
            ...l.embeddedConditional,
            branches: deeper.branches,
          },
        };
      }
      return l;
    }),
  }));
  return { branches: updated, found };
}

export function findBranchLevelContext(
  nodes: WorkflowNode[],
  levelId: string,
): {
  parentNode: WorkflowNode;
  hostLevelId?: string;
  level: ApprovalLevelConfig;
} | null {
  function walk(
    levels: ApprovalLevelConfig[],
    hostLevelId: string | undefined,
    parentNode: WorkflowNode,
  ): { parentNode: WorkflowNode; hostLevelId?: string; level: ApprovalLevelConfig } | null {
    for (const l of levels) {
      if (l.id === levelId) return { parentNode, hostLevelId, level: l };
      if (hasEmbedded(l)) {
        for (const eb of l.embeddedConditional.branches) {
          const hit = walk(eb.levels, l.id, parentNode);
          if (hit) return hit;
        }
      }
    }
    return null;
  }

  for (const n of nodes) {
    if (n.kind !== "task") continue;
    const splitData = n.data as ApprovalSplitData;
    if (!("branches" in splitData)) continue;
    for (const b of splitData.branches) {
      const hit = walk(b.levels, undefined, n);
      if (hit) return hit;
    }
  }
  return null;
}
