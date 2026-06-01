export interface TourStep {
  id: string;
  /** CSS selector for the target element. */
  selector: string;
  /** Anchor side of the tooltip relative to the target. */
  side: "top" | "right" | "bottom" | "left";
  title: string;
  body: string;
}

export const TOUR_STEPS: TourStep[] = [
  {
    id: "components",
    selector: '[data-tour="components"]',
    side: "right",
    title: "Pick a block to begin",
    body: "Switch between Events and Blocks. Drag any card onto the canvas — filters, tasks, and rules live under Blocks — or click a canvas placeholder to pick one inline.",
  },
  {
    id: "add-event",
    selector: '[data-tour="add-event"]',
    side: "left",
    title: "Alternate ways to add block",
    body: "Click this placeholder to choose Joiner, Mover, or Leaver. Once an Event is placed, more drop slots and a hover-+ appear so you can keep building.",
  },
  {
    id: "versions",
    selector: '[data-tour="versions"]',
    side: "bottom",
    title: "Versions of your workflow",
    body: "Open Versions to load, preview or edit any prior version. Editing a loaded version automatically creates a new one when you save.",
  },
  {
    id: "save",
    selector: '[data-tour="save"]',
    side: "bottom",
    title: "Save & Activate",
    body: "Save creates a new draft snapshot. Save & Activate publishes it so the workflow goes live for the joiners it scopes.",
  },
];
