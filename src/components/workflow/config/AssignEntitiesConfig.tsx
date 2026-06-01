"use client";

import { useState } from "react";
import {
  AppWindow,
  Wrench,
  Briefcase,
  SlidersHorizontal,
  ChevronRight,
  type LucideIcon,
} from "lucide-react";
import { cn } from "@/lib/cn";
import { useWorkflowStore } from "@/lib/workflow/store";
import type { TaskData, WorkflowNode } from "@/lib/workflow/types";
import { TECHNICAL_ROLES, BUSINESS_ROLES } from "@/lib/workflow/mock-data";
import { paletteIconTileClass } from "@/lib/workflow/palette-tones";
import { SectionCard } from "./SectionCard";
import { ConfigBody, ConfigInset } from "./config-layout";
import { Drawer } from "../Drawer";
import { AppsEntitlementsPicker } from "./AppsEntitlementsPicker";
import { RolesPicker } from "./RolesPicker";
import { ConditionBuilder } from "./ConditionBuilder";

type DrawerKey = "apps" | "tech" | "business" | "criteria" | null;

interface DrawerMeta {
  icon: LucideIcon;
  title: string;
  description: string;
}

const DRAWERS: Record<Exclude<DrawerKey, null>, DrawerMeta> = {
  apps: {
    icon: AppWindow,
    title: "Add Apps & Entitlements",
    description: "Select applications, then refine with entitlements",
  },
  tech: {
    icon: Wrench,
    title: "Add Technical Roles",
    description: "Bundle reusable entitlements across applications",
  },
  business: {
    icon: Briefcase,
    title: "Add Business Roles",
    description: "Assign role bundles modelled to your organisation",
  },
  criteria: {
    icon: SlidersHorizontal,
    title: "Apply Assignment Criteria",
    description: "Refine who within the filter receives this task",
  },
};

export function AssignEntitiesConfig({
  node,
  embedded = false,
}: {
  node: WorkflowNode;
  /** True when editing assign-entities inside a multisplit/conditional branch column. */
  embedded?: boolean;
}) {
  const data = node.data as TaskData;
  const updateNode = useWorkflowStore((s) => s.updateNode);
  const showToast = useWorkflowStore((s) => s.showToast);
  const [openDrawer, setOpenDrawer] = useState<DrawerKey>(null);

  const validCriteriaCount = data.criteria.conditions.filter(
    (c) => c.attribute && c.value,
  ).length;

  type SectionDef = {
    key: Exclude<DrawerKey, null>;
    count: number;
    summary: string | null;
  };

  const assignmentSections: SectionDef[] = [
    {
      key: "apps",
      count: data.appIds.length + data.entitlementIds.length,
      summary:
        data.appIds.length === 0
          ? null
          : `${data.appIds.length} app${data.appIds.length === 1 ? "" : "s"}${
              data.entitlementIds.length
                ? ` · ${data.entitlementIds.length} entitlement${data.entitlementIds.length === 1 ? "" : "s"}`
                : ""
            }`,
    },
    {
      key: "tech",
      count: data.techRoleIds.length,
      summary:
        data.techRoleIds.length === 0
          ? null
          : `${data.techRoleIds.length} role${data.techRoleIds.length === 1 ? "" : "s"} selected`,
    },
    {
      key: "business",
      count: data.businessRoleIds.length,
      summary:
        data.businessRoleIds.length === 0
          ? null
          : `${data.businessRoleIds.length} role${data.businessRoleIds.length === 1 ? "" : "s"} selected`,
    },
  ];

  const criteriaSection = {
    key: "criteria" as const,
    count: validCriteriaCount,
    summary:
      validCriteriaCount === 0
        ? null
        : `${validCriteriaCount} ${validCriteriaCount === 1 ? "rule" : "rules"} · ${data.criteria.logic}`,
  };

  function closeDrawer() {
    setOpenDrawer(null);
  }
  function applyDrawer() {
    showToast("Changes applied", "success");
    closeDrawer();
  }

  return (
    <div className="flex h-full flex-col">
      <ConfigBody>
        <p className="px-0.5 text-[10.5px] font-medium uppercase tracking-[0.06em] text-[var(--muted-fg)]">
          What to assign
        </p>
        <ConfigInset>
          {assignmentSections.map((s) => {
            const meta = DRAWERS[s.key];
            return (
              <SectionCard
                key={s.key}
                category="tasks"
                icon={meta.icon}
                title={meta.title}
                description={meta.description}
                summary={s.summary}
                count={s.count}
                onClick={() => setOpenDrawer(s.key)}
              />
            );
          })}
        </ConfigInset>

        {!embedded && (
          <>
            <p className="px-0.5 text-[10.5px] font-medium uppercase tracking-[0.06em] text-[var(--muted-fg)]">
              Assignment criteria
            </p>
            <ConfigInset>
              <CriteriaCard
                section={criteriaSection}
                onClick={() => setOpenDrawer(criteriaSection.key)}
              />
            </ConfigInset>
          </>
        )}
      </ConfigBody>

      {/* Drawers */}
      <Drawer
        open={openDrawer === "apps"}
        onClose={closeDrawer}
        iconCategory="tasks"
        icon={DRAWERS.apps.icon}
        title={DRAWERS.apps.title}
        description={DRAWERS.apps.description}
        countChip={data.appIds.length + data.entitlementIds.length || undefined}
        footer={
          <>
            <button
              onClick={closeDrawer}
              className="h-8 rounded-md px-3 text-[12.5px] font-medium text-[var(--muted-fg)] hover:bg-[var(--muted)]"
            >
              Cancel
            </button>
            <button
              onClick={applyDrawer}
              className="h-8 rounded-md bg-[var(--accent)] px-3 text-[12.5px] font-semibold text-white hover:bg-[var(--accent-hover)]"
            >
              Apply
            </button>
          </>
        }
      >
        <AppsEntitlementsPicker
          appIds={data.appIds}
          entitlementIds={data.entitlementIds}
          onAppsChange={(appIds) => updateNode(node.id, { appIds })}
          onEntitlementsChange={(entitlementIds) =>
            updateNode(node.id, { entitlementIds })
          }
        />
      </Drawer>

      <Drawer
        open={openDrawer === "tech"}
        onClose={closeDrawer}
        iconCategory="tasks"
        icon={DRAWERS.tech.icon}
        title={DRAWERS.tech.title}
        description={DRAWERS.tech.description}
        countChip={data.techRoleIds.length || undefined}
        footer={
          <>
            <button
              onClick={closeDrawer}
              className="h-8 rounded-md px-3 text-[12.5px] font-medium text-[var(--muted-fg)] hover:bg-[var(--muted)]"
            >
              Cancel
            </button>
            <button
              onClick={applyDrawer}
              className="h-8 rounded-md bg-[var(--accent)] px-3 text-[12.5px] font-semibold text-white hover:bg-[var(--accent-hover)]"
            >
              Apply
            </button>
          </>
        }
      >
        <RolesPicker
          kind="technical"
          rows={TECHNICAL_ROLES}
          selectedIds={data.techRoleIds}
          onChange={(ids) => updateNode(node.id, { techRoleIds: ids })}
        />
      </Drawer>

      <Drawer
        open={openDrawer === "business"}
        onClose={closeDrawer}
        iconCategory="tasks"
        icon={DRAWERS.business.icon}
        title={DRAWERS.business.title}
        description={DRAWERS.business.description}
        countChip={data.businessRoleIds.length || undefined}
        footer={
          <>
            <button
              onClick={closeDrawer}
              className="h-8 rounded-md px-3 text-[12.5px] font-medium text-[var(--muted-fg)] hover:bg-[var(--muted)]"
            >
              Cancel
            </button>
            <button
              onClick={applyDrawer}
              className="h-8 rounded-md bg-[var(--accent)] px-3 text-[12.5px] font-semibold text-white hover:bg-[var(--accent-hover)]"
            >
              Apply
            </button>
          </>
        }
      >
        <RolesPicker
          kind="business"
          rows={BUSINESS_ROLES}
          selectedIds={data.businessRoleIds}
          onChange={(ids) => updateNode(node.id, { businessRoleIds: ids })}
        />
      </Drawer>

      {!embedded && (
      <Drawer
        open={openDrawer === "criteria"}
        onClose={closeDrawer}
        iconCategory="tasks"
        icon={DRAWERS.criteria.icon}
        title={DRAWERS.criteria.title}
        description={DRAWERS.criteria.description}
        countChip={validCriteriaCount || undefined}
        footer={
          <>
            <button
              onClick={closeDrawer}
              className="h-8 rounded-md px-3 text-[12.5px] font-medium text-[var(--muted-fg)] hover:bg-[var(--muted)]"
            >
              Cancel
            </button>
            <button
              onClick={applyDrawer}
              className="h-8 rounded-md bg-[var(--accent)] px-3 text-[12.5px] font-semibold text-white hover:bg-[var(--accent-hover)]"
            >
              Apply
            </button>
          </>
        }
      >
        <p className="mb-3 text-[12px] text-[var(--muted-fg)]">
          Apply additional conditions to refine who within the filtered user set
          receives this task. Up to 10 conditions.
        </p>
        <ConditionBuilder
          logic={data.criteria.logic}
          conditions={data.criteria.conditions}
          onLogicChange={(l) =>
            updateNode(node.id, {
              criteria: { ...data.criteria, logic: l },
            })
          }
          onChange={(c) =>
            updateNode(node.id, {
              criteria: { ...data.criteria, conditions: c },
            })
          }
        />
      </Drawer>
      )}
    </div>
  );
}

function CriteriaCard({
  section,
  onClick,
}: {
  section: { key: "criteria"; count: number; summary: string | null };
  onClick: () => void;
}) {
  const meta = DRAWERS.criteria;
  const Icon = meta.icon;
  const isConfigured = section.count > 0;
  return (
    <button
      onClick={onClick}
      className="group relative flex w-full items-center gap-3 overflow-hidden rounded-lg bg-white p-3 text-left transition-all hover:shadow-[var(--shadow-xs)]"
    >
      <span
        className={cn(
          "flex h-9 w-9 shrink-0 items-center justify-center rounded-md",
          paletteIconTileClass("tasks", { configured: isConfigured }),
        )}
      >
        <Icon className="h-4 w-4" />
      </span>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <span className="text-[13px] font-medium text-[var(--foreground)]">
            {meta.title}
          </span>
          <span className="rounded bg-white px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wide text-[var(--muted-fg)] ring-1 ring-[var(--border)]">
            Conditional
          </span>
          {section.count > 0 && (
            <span className="inline-flex h-4 min-w-[18px] items-center justify-center rounded-full bg-[var(--accent)] px-1 text-[10.5px] font-semibold text-white">
              {section.count}
            </span>
          )}
        </div>
        <p className="mt-0.5 truncate text-[12px] text-[var(--muted-fg)]">
          {section.summary ?? meta.description}
        </p>
      </div>
      <ChevronRight className="h-4 w-4 shrink-0 text-[var(--muted-fg)] transition-transform group-hover:translate-x-0.5" />
    </button>
  );
}
