"use client";

import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { ChevronLeft, ChevronRight, X, Sparkles } from "lucide-react";
import { cn } from "@/lib/cn";
import { useWorkflowStore, hasSeenTour } from "@/lib/workflow/store";
import { TOUR_STEPS } from "@/lib/workflow/tour";

const TOOLTIP_W = 320;
const TOOLTIP_M = 12;
const SPOT_PAD = 6;

export function TourOverlay() {
  const tour = useWorkflowStore((s) => s.tour);
  const startTour = useWorkflowStore((s) => s.startTour);
  const nextStep = useWorkflowStore((s) => s.nextTourStep);
  const prevStep = useWorkflowStore((s) => s.prevTourStep);
  const endTour = useWorkflowStore((s) => s.endTour);

  // Auto-start the tour on the first visit per browser.
  useEffect(() => {
    if (typeof window === "undefined") return;
    if (hasSeenTour()) return;
    const t = setTimeout(() => startTour(), 900);
    return () => clearTimeout(t);
  }, [startTour]);

  const stepIdx = tour.step;
  const step = TOUR_STEPS[stepIdx];

  const [rect, setRect] = useState<DOMRect | null>(null);
  const tooltipRef = useRef<HTMLDivElement | null>(null);
  const [tooltipPos, setTooltipPos] = useState<{ left: number; top: number } | null>(null);

  // Measure the target whenever the active step changes (and on resize).
  useLayoutEffect(() => {
    if (!tour.active || !step) {
      setRect(null);
      return;
    }
    function update() {
      if (!step) return;
      const el = document.querySelector(step.selector);
      if (el instanceof HTMLElement) {
        setRect(el.getBoundingClientRect());
      } else {
        setRect(null);
      }
    }
    update();
    window.addEventListener("resize", update);
    window.addEventListener("scroll", update, true);
    // Some targets render after a tick (transitions, hydration).
    const t1 = setTimeout(update, 60);
    const t2 = setTimeout(update, 250);
    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
      window.removeEventListener("resize", update);
      window.removeEventListener("scroll", update, true);
    };
  }, [tour.active, tour.step, step]);

  // Position the tooltip after the target rect and the tooltip itself are
  // available; flip to the opposite side if there isn't room.
  useLayoutEffect(() => {
    if (!tour.active || !step || !rect || !tooltipRef.current) return;
    const tw = tooltipRef.current.offsetWidth || TOOLTIP_W;
    const th = tooltipRef.current.offsetHeight || 160;
    const vw = window.innerWidth;
    const vh = window.innerHeight;

    function placement(side: TourStep["side"]) {
      let left = 0;
      let top = 0;
      switch (side) {
        case "right":
          left = rect!.right + TOOLTIP_M;
          top = rect!.top + rect!.height / 2 - th / 2;
          break;
        case "left":
          left = rect!.left - tw - TOOLTIP_M;
          top = rect!.top + rect!.height / 2 - th / 2;
          break;
        case "top":
          left = rect!.left + rect!.width / 2 - tw / 2;
          top = rect!.top - th - TOOLTIP_M;
          break;
        case "bottom":
        default:
          left = rect!.left + rect!.width / 2 - tw / 2;
          top = rect!.bottom + TOOLTIP_M;
      }
      return { left, top };
    }

    function fits(p: { left: number; top: number }) {
      return (
        p.left >= 12 &&
        p.left + tw <= vw - 12 &&
        p.top >= 12 &&
        p.top + th <= vh - 12
      );
    }

    const order: TourStep["side"][] = [
      step.side,
      opposite(step.side),
      "bottom",
      "top",
      "right",
      "left",
    ];
    let chosen = placement(step.side);
    for (const s of order) {
      const p = placement(s);
      if (fits(p)) {
        chosen = p;
        break;
      }
    }
    chosen.left = Math.max(12, Math.min(vw - tw - 12, chosen.left));
    chosen.top = Math.max(12, Math.min(vh - th - 12, chosen.top));
    setTooltipPos(chosen);
  }, [tour.active, tour.step, step, rect]);

  if (!tour.active || !step || typeof document === "undefined") return null;

  const isLast = stepIdx === TOUR_STEPS.length - 1;
  const isFirst = stepIdx === 0;
  const TitleIcon = Sparkles;

  // Spotlight rect with padding (clamped to viewport).
  const spot = rect
    ? {
        top: Math.max(0, rect.top - SPOT_PAD),
        left: Math.max(0, rect.left - SPOT_PAD),
        width: rect.width + SPOT_PAD * 2,
        height: rect.height + SPOT_PAD * 2,
      }
    : null;

  return createPortal(
    <div className="pointer-events-none fixed inset-0 z-[80]">
      {/* Backdrop: 4 dim rectangles framing the target, or full screen if no
          target. Each rectangle captures pointer events so clicks outside the
          target don't reach the editor. */}
      {spot ? (
        <>
          <DimRect
            style={{ top: 0, left: 0, right: 0, height: spot.top }}
          />
          <DimRect
            style={{
              top: spot.top,
              left: 0,
              width: spot.left,
              height: spot.height,
            }}
          />
          <DimRect
            style={{
              top: spot.top,
              left: spot.left + spot.width,
              right: 0,
              height: spot.height,
            }}
          />
          <DimRect
            style={{
              top: spot.top + spot.height,
              left: 0,
              right: 0,
              bottom: 0,
            }}
          />
          {/* Spotlight ring */}
          <div
            aria-hidden
            style={{
              position: "absolute",
              top: spot.top,
              left: spot.left,
              width: spot.width,
              height: spot.height,
            }}
            className="pointer-events-none rounded-lg ring-2 ring-[var(--accent)] ring-offset-2 ring-offset-transparent transition-all duration-200"
          />
        </>
      ) : (
        <DimRect style={{ inset: 0 }} />
      )}

      {/* Tooltip — always rendered so it can be measured. Hidden via opacity
          until the first positioning pass completes. */}
      {(
        <div
          ref={tooltipRef}
          role="dialog"
          aria-modal="false"
          aria-label={step.title}
          style={{
            position: "fixed",
            top: tooltipPos?.top ?? 0,
            left: tooltipPos?.left ?? 0,
            width: TOOLTIP_W,
            opacity: tooltipPos ? 1 : 0,
            visibility: tooltipPos ? "visible" : "hidden",
          }}
          className="pointer-events-auto rounded-xl border border-[var(--border)] bg-white p-4 shadow-2xl ring-1 ring-black/5"
        >
          <div className="flex items-start gap-2.5">
            <span className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-[var(--accent-soft)] text-[var(--accent)]">
              <TitleIcon className="h-3.5 w-3.5" />
            </span>
            <div className="min-w-0 flex-1">
              <p className="text-[10.5px] font-semibold uppercase tracking-wide text-[var(--muted-fg)]">
                Step {stepIdx + 1} of {TOUR_STEPS.length}
              </p>
              <h2 className="mt-0.5 text-[14px] font-semibold text-[var(--foreground)]">
                {step.title}
              </h2>
            </div>
            <button
              onClick={endTour}
              aria-label="Skip tour"
              className="-mr-1 -mt-1 flex h-7 w-7 shrink-0 items-center justify-center rounded-md text-[var(--muted-fg)] hover:bg-[var(--muted)] hover:text-[var(--foreground)]"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
          <p className="mt-2.5 text-[12.5px] leading-relaxed text-[var(--muted-fg)]">
            {step.body}
          </p>

          <footer className="mt-3.5 flex items-center justify-between">
            <div className="flex items-center gap-1">
              {TOUR_STEPS.map((_, i) => (
                <span
                  key={i}
                  className={cn(
                    "h-1.5 rounded-full transition-all",
                    i === stepIdx
                      ? "w-4 bg-[var(--accent)]"
                      : "w-1.5 bg-[var(--border-strong)]",
                  )}
                />
              ))}
            </div>
            <div className="flex items-center gap-1.5">
              {!isLast && (
                <button
                  onClick={endTour}
                  className="h-8 rounded-md px-2.5 text-[12.5px] font-medium text-[var(--muted-fg)] hover:bg-[var(--muted)] hover:text-[var(--foreground)]"
                >
                  Skip tour
                </button>
              )}
              {!isFirst && (
                <button
                  onClick={prevStep}
                  className="flex h-8 items-center gap-1 rounded-md border border-[var(--border)] bg-white px-2.5 text-[12.5px] font-medium text-[var(--foreground)] hover:bg-[var(--muted)]"
                >
                  <ChevronLeft className="h-3 w-3" />
                  Back
                </button>
              )}
              {isLast ? (
                <button
                  onClick={endTour}
                  className="h-8 rounded-md bg-[var(--accent)] px-3 text-[12.5px] font-semibold text-white hover:bg-[var(--accent-hover)]"
                >
                  Got it
                </button>
              ) : (
                <button
                  onClick={nextStep}
                  className="flex h-8 items-center gap-1 rounded-md bg-[var(--accent)] px-3 text-[12.5px] font-semibold text-white hover:bg-[var(--accent-hover)]"
                >
                  Next
                  <ChevronRight className="h-3 w-3" />
                </button>
              )}
            </div>
          </footer>
        </div>
      )}
    </div>,
    document.body,
  );
}

function DimRect({ style }: { style: React.CSSProperties }) {
  return (
    <div
      aria-hidden
      style={{ position: "absolute", ...style }}
      className="pointer-events-auto bg-slate-900/45 transition-[top,left,right,bottom,width,height] duration-150 ease-out"
    />
  );
}

type Side = "top" | "right" | "bottom" | "left";
type TourStep = (typeof TOUR_STEPS)[number];
function opposite(s: Side): Side {
  if (s === "top") return "bottom";
  if (s === "bottom") return "top";
  if (s === "left") return "right";
  return "left";
}
