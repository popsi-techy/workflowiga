"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import {
  LayoutDashboard,
  AppWindow,
  ListChecks,
  Workflow,
  Users,
  UserRound,
  Shield,
  ShieldCheck,
  UserCog,
  ScrollText,
  Settings,
  ChevronDown,
  ChevronsLeft,
  Bot,
} from "lucide-react";
import { cn } from "@/lib/cn";
import { useWorkflowStore } from "@/lib/workflow/store";
import type { EditorContext } from "@/lib/workflow/types";

interface NavItem {
  label: string;
  icon?: React.ComponentType<{ className?: string }>;
  href?: string;
  active?: boolean;
  children?: NavItem[];
  initialOpen?: boolean;
  /** If set, clicking this item switches the editor context */
  editorContext?: EditorContext;
}

const NAV: NavItem[] = [
  { label: "Dashboard", icon: LayoutDashboard, href: "#" },
  {
    label: "Applications",
    icon: AppWindow,
    initialOpen: true,
    children: [
      { label: "Application List", href: "#" },
      { label: "Reconciliation", href: "#" },
    ],
  },
  { label: "Provisioning Tasks", icon: ListChecks, href: "#" },
  {
    label: "Automation",
    icon: Bot,
    initialOpen: true,
    active: true,
    children: [
      { label: "Workflow Policies", href: "#", active: true, editorContext: "workflow" },
      { label: "Approval Policies", href: "#", editorContext: "approval" },
    ],
  },
  { label: "Peer Group Analysis", icon: Users, href: "#" },
  {
    label: "Identities",
    icon: UserRound,
    initialOpen: true,
    children: [
      { label: "Human", href: "#" },
      { label: "Non Human", href: "#" },
    ],
  },
  { label: "Entitlement Catalog", icon: Shield, href: "#" },
  {
    label: "Role Management",
    icon: UserCog,
    initialOpen: true,
    children: [
      { label: "Business Roles", href: "#" },
      { label: "Technical Roles", href: "#" },
    ],
  },
  {
    label: "Governance",
    icon: ShieldCheck,
    initialOpen: true,
    children: [
      { label: "IGA Users", href: "#" },
      { label: "Review Levels", href: "#" },
    ],
  },
  { label: "Access Certification", icon: ScrollText, href: "#" },
  { label: "Configuration", icon: Settings, href: "#" },
];

function MiniOrangeLogo({ collapsed }: { collapsed: boolean }) {
  if (collapsed) {
    return (
      <div className="flex items-center justify-center py-3">
        <span className="relative inline-flex h-7 w-7 items-center justify-center rounded-full bg-[var(--accent)] text-[11px] font-bold text-white">
          O
        </span>
      </div>
    );
  }
  return (
    <div className="flex items-center gap-1.5 px-4 py-3">
      <span className="text-[15px] font-semibold tracking-tight text-white">
        mini
      </span>
      <span className="relative inline-flex h-5 w-5 items-center justify-center rounded-full bg-[var(--accent)] text-[10px] font-bold text-white">
        O
      </span>
      <span className="text-[15px] font-semibold tracking-tight text-white">
        range
      </span>
    </div>
  );
}

export function AppSidebar() {
  const collapsed = useWorkflowStore((s) => s.mainNavCollapsed);
  const toggle = useWorkflowStore((s) => s.toggleMainNav);
  // Skip transition until after first client paint to avoid a 240→64
  // flash on reloads where persisted state is `collapsed`.
  const [hydrated, setHydrated] = useState(false);
  useEffect(() => {
    const id = requestAnimationFrame(() => setHydrated(true));
    return () => cancelAnimationFrame(id);
  }, []);

  return (
    <aside
      style={{ width: collapsed ? 64 : 240 }}
      className={cn(
        "sidebar-scroll relative flex h-full shrink-0 flex-col overflow-y-auto overflow-x-hidden border-r border-black/20 bg-[var(--sidebar-bg)] text-[var(--sidebar-fg)]",
        hydrated && "transition-[width] duration-200 ease-out",
      )}
      aria-label="Primary"
    >
      <div className="relative">
        <MiniOrangeLogo collapsed={collapsed} />
        <button
          onClick={toggle}
          aria-label={collapsed ? "Expand navigation" : "Collapse navigation"}
          title={collapsed ? "Expand navigation" : "Collapse navigation"}
          className={cn(
            "absolute top-2 z-10 flex h-6 w-6 items-center justify-center rounded-md text-[var(--sidebar-fg-muted)] hover:bg-[var(--sidebar-hover)] hover:text-white",
            collapsed ? "right-1.5" : "right-2",
          )}
        >
          <ChevronsLeft
            className={cn(
              "h-3.5 w-3.5 transition-transform duration-200",
              collapsed && "rotate-180",
            )}
          />
        </button>
      </div>
      <nav className="flex flex-col px-2 pb-6 pt-1">
        {NAV.map((item) => (
          <NavRow key={item.label} item={item} collapsed={collapsed} />
        ))}
      </nav>
    </aside>
  );
}

function NavRow({ item, collapsed }: { item: NavItem; collapsed: boolean }) {
  const hasChildren = !!item.children?.length;
  const [open, setOpen] = useState(item.initialOpen ?? false);
  const goToList = useWorkflowStore((s) => s.goToList);
  const listType = useWorkflowStore((s) => s.listType);
  const screen = useWorkflowStore((s) => s.screen);
  const editorContext = useWorkflowStore((s) => s.editorContext);

  // A child (Workflow / Approval Policies) is active when its table is showing,
  // or when a policy of that type is open in the editor.
  const isChildActive = (child: NavItem) => {
    if (child.editorContext) {
      const activeType = screen === "editor" ? editorContext : listType;
      return child.editorContext === activeType;
    }
    return child.active ?? false;
  };

  const isParentActive = item.label === "Automation";

  const baseRow =
    "flex w-full items-center gap-2.5 rounded-md px-2.5 py-2 text-[13px] transition-colors";
  const Icon = item.icon;

  if (collapsed) {
    // Items with children get a hover flyout so the user can still reach (and
    // switch between) sub-items — e.g. Automation → Workflow / Approval.
    if (hasChildren) {
      return (
        <CollapsedFlyoutRow item={item} isActive={isParentActive} />
      );
    }
    // Leaf items: icon-only with tooltip.
    return (
      <a
        href={item.href ?? "#"}
        title={item.label}
        aria-label={item.label}
        aria-current={isParentActive ? "page" : undefined}
        className={cn(
          "mb-0.5 flex h-9 w-full items-center justify-center rounded-md transition-colors",
          isParentActive
            ? "bg-[var(--sidebar-active-bg)] text-white shadow-[inset_2px_0_0_var(--accent)]"
            : "text-[var(--sidebar-fg)] hover:bg-[var(--sidebar-hover)] hover:text-white",
        )}
      >
        {Icon && (
          <Icon
            className={cn(
              "h-[18px] w-[18px]",
              isParentActive ? "text-[var(--accent)]" : "text-[var(--sidebar-fg)]",
            )}
          />
        )}
      </a>
    );
  }

  if (hasChildren) {
    return (
      <div className="mb-0.5">
        <button
          onClick={() => setOpen(!open)}
          className={cn(
            baseRow,
            isParentActive
              ? "text-white hover:bg-[var(--sidebar-hover)]"
              : "text-[var(--sidebar-fg)] hover:bg-[var(--sidebar-hover)]",
          )}
        >
          {Icon && <Icon className={cn("h-[18px] w-[18px]", isParentActive ? "text-[var(--accent)]" : "text-[var(--sidebar-fg)]")} />}
          <span className={cn("flex-1 text-left font-medium", isParentActive && "font-semibold")}>{item.label}</span>
          <ChevronDown
            className={cn(
              "h-3.5 w-3.5 transition-transform",
              open ? "rotate-180" : "",
            )}
          />
        </button>
        {open && (
          <div className="mt-0.5 flex flex-col">
            {item.children!.map((c) => {
              const childActive = isChildActive(c);
              return (
                <a
                  key={c.label}
                  href={c.href ?? "#"}
                  onClick={(e) => {
                    if (c.editorContext) {
                      e.preventDefault();
                      goToList(c.editorContext);
                    }
                  }}
                  className={cn(
                    baseRow,
                    "pl-9 text-[12.5px]",
                    childActive
                      ? "bg-[var(--sidebar-active-bg)] font-semibold text-white shadow-[inset_2px_0_0_var(--accent)]"
                      : "text-[var(--sidebar-fg-muted)] hover:bg-[var(--sidebar-hover)] hover:text-white",
                  )}
                  aria-current={childActive ? "page" : undefined}
                >
                  {c.label}
                </a>
              );
            })}
          </div>
        )}
      </div>
    );
  }

  return (
    <a
      href={item.href ?? "#"}
      className={cn(
        baseRow,
        "mb-0.5",
        item.active
          ? "bg-[var(--sidebar-active-bg)] font-semibold text-white shadow-[inset_2px_0_0_var(--accent)]"
          : "hover:bg-[var(--sidebar-hover)] hover:text-white",
      )}
      aria-current={item.active ? "page" : undefined}
    >
      {Icon && (
        <Icon
          className={cn(
            "h-[18px] w-[18px]",
            item.active ? "text-[var(--accent)]" : "text-[var(--sidebar-fg)]",
          )}
        />
      )}
      <span className="font-medium">{item.label}</span>
    </a>
  );
}

/** Collapsed-rail row for a parent item: an icon button that reveals its
 *  sub-items in a hover flyout (portaled so the rail's overflow can't clip it). */
function CollapsedFlyoutRow({
  item,
  isActive,
}: {
  item: NavItem;
  isActive: boolean;
}) {
  const Icon = item.icon;
  const goToList = useWorkflowStore((s) => s.goToList);
  const listType = useWorkflowStore((s) => s.listType);
  const screen = useWorkflowStore((s) => s.screen);
  const editorContext = useWorkflowStore((s) => s.editorContext);
  const [open, setOpen] = useState(false);
  const [rect, setRect] = useState<DOMRect | null>(null);
  const ref = useRef<HTMLDivElement>(null);
  const closeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const isChildActive = (child: NavItem) => {
    if (!child.editorContext) return child.active ?? false;
    const activeType = screen === "editor" ? editorContext : listType;
    return child.editorContext === activeType;
  };

  function show() {
    if (closeTimer.current) {
      clearTimeout(closeTimer.current);
      closeTimer.current = null;
    }
    if (ref.current) setRect(ref.current.getBoundingClientRect());
    setOpen(true);
  }
  function hideSoon() {
    closeTimer.current = setTimeout(() => setOpen(false), 120);
  }

  return (
    <div
      ref={ref}
      className="relative mb-0.5"
      onMouseEnter={show}
      onMouseLeave={hideSoon}
    >
      <button
        type="button"
        aria-label={item.label}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-current={isActive ? "page" : undefined}
        className={cn(
          "flex h-9 w-full items-center justify-center rounded-md transition-colors",
          isActive
            ? "bg-[var(--sidebar-active-bg)] text-white shadow-[inset_2px_0_0_var(--accent)]"
            : "text-[var(--sidebar-fg)] hover:bg-[var(--sidebar-hover)] hover:text-white",
        )}
      >
        {Icon && (
          <Icon
            className={cn(
              "h-[18px] w-[18px]",
              isActive ? "text-[var(--accent)]" : "text-[var(--sidebar-fg)]",
            )}
          />
        )}
      </button>
      {open && rect && typeof document !== "undefined" &&
        createPortal(
          <div
            role="menu"
            style={{ position: "fixed", left: rect.right + 8, top: rect.top }}
            onMouseEnter={show}
            onMouseLeave={hideSoon}
            className="z-50 min-w-[200px] rounded-lg border border-black/20 bg-[var(--sidebar-bg)] p-1.5 text-[var(--sidebar-fg)] shadow-xl"
          >
            <p className="px-2.5 py-1.5 text-[10.5px] font-semibold uppercase tracking-wide text-[var(--sidebar-fg-muted)]">
              {item.label}
            </p>
            <div className="flex flex-col">
              {item.children!.map((c) => {
                const active = isChildActive(c);
                return (
                  <a
                    key={c.label}
                    href={c.href ?? "#"}
                    role="menuitem"
                    onClick={(e) => {
                      if (c.editorContext) {
                        e.preventDefault();
                        goToList(c.editorContext);
                      }
                      setOpen(false);
                    }}
                    aria-current={active ? "page" : undefined}
                    className={cn(
                      "flex items-center gap-2 rounded-md px-2.5 py-2 text-[12.5px] transition-colors",
                      active
                        ? "bg-[var(--sidebar-active-bg)] font-semibold text-white shadow-[inset_2px_0_0_var(--accent)]"
                        : "text-[var(--sidebar-fg-muted)] hover:bg-[var(--sidebar-hover)] hover:text-white",
                    )}
                  >
                    {c.label}
                  </a>
                );
              })}
            </div>
          </div>,
          document.body,
        )}
    </div>
  );
}
