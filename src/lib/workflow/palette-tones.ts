import { cn } from "@/lib/cn";
import type { NodeKind, TaskType, WorkflowNode } from "./types";

/** Palette / canvas category — matches Blocks panel sections. */
export type PaletteCategory = "events" | "filters" | "tasks" | "modules" | "rules";

export interface PaletteTone {
  bg: string;
  icon: string;
  ring: string;
  border: string;
  selectedBorder: string;
  selectedRing: string;
  countChip: string;
  sectionHover: string;
}

export const PALETTE_TONES: Record<PaletteCategory, PaletteTone> = {
  events: {
    bg: "bg-[var(--accent-soft)]",
    icon: "text-[var(--accent)]",
    ring: "ring-[var(--accent)]/10",
    border: "border-l-[var(--accent)]",
    selectedBorder: "border-[var(--accent)]",
    selectedRing: "ring-[var(--accent)]/25",
    countChip: "bg-[var(--accent-soft)] text-[#9A3412]",
    sectionHover:
      "hover:border-[var(--accent)]/50 hover:bg-[var(--accent-softer)]/40",
  },
  filters: {
    bg: "bg-sky-50",
    icon: "text-sky-600",
    ring: "ring-sky-500/10",
    border: "border-l-sky-500",
    selectedBorder: "border-sky-400",
    selectedRing: "ring-sky-500/20",
    countChip: "bg-sky-50 text-sky-700",
    sectionHover: "hover:border-sky-300/60 hover:bg-sky-50/40",
  },
  tasks: {
    bg: "bg-[var(--accent-soft)]",
    icon: "text-[var(--accent)]",
    ring: "ring-[var(--accent)]/10",
    border: "border-l-[var(--accent)]",
    selectedBorder: "border-[var(--accent)]",
    selectedRing: "ring-[var(--accent)]/25",
    countChip: "bg-[var(--accent-soft)] text-[#9A3412]",
    sectionHover:
      "hover:border-[var(--accent)]/50 hover:bg-[var(--accent-softer)]/40",
  },
  modules: {
    bg: "bg-indigo-50",
    icon: "text-indigo-600",
    ring: "ring-indigo-500/10",
    border: "border-l-indigo-500",
    selectedBorder: "border-indigo-400",
    selectedRing: "ring-indigo-500/20",
    countChip: "bg-indigo-50 text-indigo-700",
    sectionHover: "hover:border-indigo-300/60 hover:bg-indigo-50/40",
  },
  rules: {
    bg: "bg-slate-100",
    icon: "text-slate-600",
    ring: "ring-slate-400/12",
    border: "border-l-slate-500",
    selectedBorder: "border-slate-400",
    selectedRing: "ring-slate-400/25",
    countChip: "bg-slate-100 text-slate-700",
    sectionHover: "hover:border-slate-400/60 hover:bg-slate-50",
  },
};

const RULE_TASK_TYPES = new Set<TaskType>([
  "approval_split",
  "conditional_branch",
  "conditional_branch_v2",
  "exit",
  "skip",
]);

const MODULE_TASK_TYPES = new Set<TaskType>(["approval_policy_ref"]);

export function paletteCategoryForTaskType(taskType: TaskType): PaletteCategory {
  if (RULE_TASK_TYPES.has(taskType)) return "rules";
  if (MODULE_TASK_TYPES.has(taskType)) return "modules";
  return "tasks";
}

export function paletteCategoryForNode(
  node: Pick<WorkflowNode, "kind" | "data">,
): PaletteCategory {
  if (node.kind === "event") return "events";
  if (node.kind === "filter") return "filters";
  const taskType = (node.data as { taskType?: TaskType }).taskType;
  if (taskType) return paletteCategoryForTaskType(taskType);
  return "tasks";
}

export function paletteCategoryFromSectionLabel(
  tab: "events" | "tasks",
  sectionLabel: string | null,
): PaletteCategory {
  if (tab === "events") return "events";
  switch (sectionLabel) {
    case "Filters":
      return "filters";
    case "Modules":
      return "modules";
    case "Rules":
      return "rules";
    default:
      return "tasks";
  }
}

export function paletteCategoryFromDrag(
  kind: NodeKind,
  preset?: Record<string, unknown>,
): PaletteCategory {
  if (kind === "event") return "events";
  if (kind === "filter") return "filters";
  const taskType = preset?.taskType as TaskType | undefined;
  if (taskType) return paletteCategoryForTaskType(taskType);
  return "tasks";
}

/** Inline branch block (level) on multisplit / conditional flows. */
export function paletteCategoryForBranchLevel(level: {
  blockType?: string;
}): PaletteCategory {
  if (level.blockType === "exit" || level.blockType === "skip") return "rules";
  if (
    level.blockType === "approval_split" ||
    level.blockType === "sod_check" ||
    level.blockType === "conditional_branch" ||
    level.blockType === "conditional_branch_v2"
  )
    return "rules";
  if (level.blockType === "filter") return "filters";
  if (level.blockType === "approval_policy_ref") return "modules";
  if (level.blockType === "assign_entities") return "tasks";
  return "tasks";
}

/** Icon tile (palette card, node card, config header, section card). */
export function paletteIconTileClass(
  category: PaletteCategory,
  options?: { disabled?: boolean; configured?: boolean },
): string {
  if (options?.disabled) {
    return "bg-[var(--muted)] text-[var(--muted-fg)] ring-transparent";
  }
  const tone = PALETTE_TONES[category];
  if (options?.configured === false) {
    return "bg-[var(--muted)] text-[var(--muted-fg)] ring-1 ring-[var(--border)]";
  }
  return cn("ring-1", tone.bg, tone.icon, tone.ring);
}

/** Selection outline is always the brand accent so the canvas reads
 *  consistently regardless of a node's category tone. */
export function paletteCardSelectionClass(
  _category: PaletteCategory,
  selected: boolean,
): string {
  if (!selected) return "";
  return cn("border-[var(--accent)]", "ring-[var(--accent)]/25", "ring-1");
}

export function paletteCardLeftBorderClass(category: PaletteCategory): string {
  return cn("border-l-[3px]", PALETTE_TONES[category].border);
}

export function palettePillSelectionClass(
  _category: PaletteCategory,
  selected: boolean,
): string {
  if (!selected) return "border-[var(--border-strong)] text-[var(--foreground)]";
  return cn(
    "border-[var(--accent)]",
    "text-[var(--accent)]",
    "ring-2",
    "ring-[var(--accent)]/25",
  );
}
