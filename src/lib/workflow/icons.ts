import type { LucideIcon } from "lucide-react";
import {
  UserPlus,
  Filter,
  ListChecks,
  SlidersHorizontal,
} from "lucide-react";
import type { NodeKind } from "./types";

export const NODE_META: Record<
  NodeKind | "criteria",
  { label: string; description: string; icon: LucideIcon }
> = {
  event: {
    label: "Event",
    description: "Trigger for the lifecycle workflow",
    icon: UserPlus,
  },
  filter: {
    label: "User Filter",
    description: "Scope the workflow to a user segment",
    icon: Filter,
  },
  task: {
    label: "Block",
    description: "Assign apps, entitlements and roles",
    icon: ListChecks,
  },
  criteria: {
    label: "Assignment Criteria",
    description: "Configured inside Task",
    icon: SlidersHorizontal,
  },
};
