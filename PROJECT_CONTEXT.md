# Workflowiga — Project Context for AI Agents

> Read this file before doing anything non-trivial. It explains the project's
> shape, the design system, the **drawer / config-panel patterns**, and the
> conventions every new feature must follow so the UI stays consistent.

### Changelog (keep this current)

| Date       | Summary |
| ---------- | ------- |
| 2026-06-02 | **Conditional Type 2 drag-and-drop nesting**: Added full support for nesting `conditional_branch_v2` blocks inside branch columns. Extended `EmbeddedConditionalData` schema in [types.ts](file:///c:/Users/Aman%20kumar/Desktop/workflowiga/src/lib/workflow/types.ts) with V2 properties, and added nested flow state synchronization inside [boolean-branch.ts](file:///c:/Users/Aman%20kumar/Desktop/workflowiga/src/lib/workflow/boolean-branch.ts) and [branch-blocks.ts](file:///c:/Users/Aman%20kumar/Desktop/workflowiga/src/lib/workflow/branch-blocks.ts). Refactored `ConditionalBranchV2Flow` in [NodeCard.tsx](file:///c:/Users/Aman%20kumar/Desktop/workflowiga/src/components/workflow/nodes/NodeCard.tsx) to support both top-level and embedded rendering modes, resolving intermediate row container height stretching (`grow`) to fix vertical line breaks. Added mock node building in `ConfigPanel.tsx` and `onPatch` update delegates in [ConditionalBranchV2Config.tsx](file:///c:/Users/Aman%20kumar/Desktop/workflowiga/src/components/workflow/config/ConditionalBranchV2Config.tsx) for embedded configurations. Extracted `isLevelConfigured` validator in [defaults.ts](file:///c:/Users/Aman%20kumar/Desktop/workflowiga/src/lib/workflow/defaults.ts) to recursively compute status. |
| 2026-06-01 | **Seeds (v23)**: `buildVmwareImageApprovalNodes` — "VMware image example" approval policy: top-level conditional "Check Department" (`isAnyOwnerSameDeptAsSubject`) → nested "Check Owner and line manager" (`isLineManagerSameDeptAsSubject`) → innermost "Is Line Manager DG" (`isRequesterSameCompanyAsSubject` / `isAnyOwnerSameCompanyAsSubject`) → Manager approval levels ("Delegated Approval" / "Line Manager Approval") with inline Approved-only outcome decision. New file `vmware-image-seed.ts`; persist version bumped to **v23**. |
| 2026-06-01 | **Workflow multisplit branch blocks**: workflow multisplit branches accept **`filter`** and **`approval_policy_ref`** (`blockType` on `ApprovalLevelConfig`) at any insert slot — drag from palette or `BranchAddMenu` (`workflowMultisplit` mode). Helpers in `branch-blocks.ts` (`defaultBranchFilterConfig`, `defaultBranchModuleConfig`, `levelToFilterNode`, `levelToModuleNode`, patch helpers). **Learn about workflows**: `WorkflowLearnModal` + footer link in `ComponentsPanel` (workflow editor only). **Multisplit branch SLA**: approval levels inside multisplit branches show **`ApprovalSlaSection` only** (no per-level outcome routing); combined outcomes stay on the multisplit's `decisionNodeId`. **Drawer**: default sticky **Save** footer when `footer` prop omitted. **Seeds (v22)**: `buildJoinerHighRiskWorkflowNodes` — top-level user filter → department multisplit with branch filter + assign / module + assign → conditional; `buildSodDualApprovalNodes` branch levels get per-approver SLA. **Migration v22** refreshes `pol_ap_sod_dual` + `pol_wf_joiner_high_risk`. |
| 2026-06-01 | **Multisplit simplification (v21)**: approval multisplits are now *parallel-approver* actions — each branch holds **one approval level only** (no SoD, nested flows, etc. inside multisplit branches). Per-level inline outcomes inside those branches are gone; a **single combined outcome decision** sits below the whole multisplit (top-level via `ApprovalSplitData.decisionNodeId`, nested via auto-managed sibling `isMultisplitDecisionLevel`). Outcomes are configured in `ApprovalSplitConfig` / `EmbeddedMultisplitConfig` via `DecisionOutcomesSection`. **New module** `multisplit-decision.ts` (`branchParentIsMultisplit`, `syncNestedMultisplitDecisions`, `buildMultisplitDecisionNode`). **Migration v21** collapses legacy multisplit branches and links/adopts sibling outcome conditionals. **UI**: `BranchAddMenu` `approvalMultisplitOnly` mode; branch add slots hidden when full; drag-drop guarded in `WorkflowEditor`. |
| 2026-06-01 | **SLA → No-Action outcome**: standalone "SLA Settings" and **global SLA** (multisplit/conditional branch defaults) are gone. SLA is now per-approver and owned by the **No Action / SLA Breached** approval outcome: adding that rule enables the SLA and reveals an inline editor (deadline + **On timeout**: `Auto Reject` (default) / `Auto Approve` / `Proceed to next step`); removing it disables SLA. Editor lives in `DecisionOutcomesSection` and patches the source action via `sourceActionId` / host level. New consts in `approval-decision.ts` (`NO_ACTION_OUTCOME`, `APPROVAL_SLA_TIMEOUT_ACTIONS`, defaults). **Decision outcomes UX**: every outcome row is removable (removing the last drops the decision → empty state); SoD "No violation" is now an addable chip with the catch-all shown as an "All other requests" note; the **catch-all ELSE is hidden (canvas + panel) once all outcomes are routed**. **Layout fix**: `nestedConditionalWidth` now widens a branch column for *any* level hosting an embedded flow (inline decisions included), so inline decisions inside multisplit/conditional branches no longer overlap. `ApprovalSplitData` / `ConditionalBranchData` `globalSla*` fields are now optional + `@deprecated`; seeds/defaults updated. |
| 2026-05-31 | **Action → Decision refactor (Phases 1–4)**: Approval Level and SoD Check are action-only blocks; a linked Conditional decision block auto-creates below them (top level via `decisionNodeId`, inside branches via inline `embeddedConditional`). Outcomes route on `approval_outcome` / `sod_result` with progressive chips (Rejection, Delegation, No Action / risk levels). **Branches**: `BranchAddMenu` offers all block types; nested conditional + multisplit; inline decisions for branch approval/SoD; insert slot above first branch block. **Migration v20**: links legacy action+sibling-conditionals, remaps `access_decision` → `approval_outcome`, attaches branch inline decisions; refreshes demo seeds. **New modules**: `approval-decision.ts`, `sod-decision.ts`, `decision-outcomes.ts`, `branch-decision.ts`, `action-decision-migrate.ts`, `EmbeddedMultisplitConfig.tsx`, `BranchAddMenu.tsx`. |
| 2026-05-29 | **Config panel**: live apply via `updateNode`; no ConfigPanel footer; block names in header `EditableName`. **Layout**: shared `config-layout.tsx` primitives (replace per-file `Section`/`Field`). **Channels**: `ChannelsField` + `ChannelsModal` for Slack/Email + messages (Notification, SoD Check, Approval Level alerts). **Approvers**: `CustomApproverDrawer` for custom-attribute resolver + apply-when rules. **Routing**: `RoutingBranchLadder` for IF/ELSE IF/ELSE branches. **Palette**: left tab **Blocks**; category tones in `palette-tones.ts`; canvas selection always orange. **Tasks**: 9 types incl. `sod_check`; multisplit single-attribute shows per-branch value inputs. **Attributes**: `ACCESS_CONTEXT_ATTRIBUTES` (policy type, business role, SoD violation, risk score); notification audience includes Owner. **Seeds**: `sod-violation-policy-seed.ts` ("SoD Violation — Intern High-Risk"); outcome branches notify-only (no trailing Exit blocks). **Docs**: `docs/Workflowiga-Blocks-Configuration-Reference.docx` via `scripts/generate-blocks-doc.py`. |

---

## 1. What this app is

**Workflowiga** is an enterprise IAM (Identity Access Management) workflow
builder modelled after miniOrange's product. Two policy types live in the same
canvas-based editor:

| Editor context | What you build                                              |
| -------------- | ----------------------------------------------------------- |
| `workflow`     | Joiner / Mover / Leaver lifecycle automations               |
| `approval`     | Multi-level approval policies (referenced by workflow blocks) |

Users compose **policies** by dragging **nodes** (Event → Filter → Tasks) onto
a vertical canvas. Clicking a node opens a **right-side ConfigPanel**. Heavy
inputs (entity pickers, condition builders, etc.) live inside **Drawers** that
slide in from the far right on top of the ConfigPanel.

The whole UI is read/written through a single **Zustand store**.

---

## 2. Tech stack

- **Next.js 16.2.6** with React 19 (App Router, single catch-all route at
  `src/app/automation/[[...slug]]/page.tsx`).
- **Tailwind CSS v4** via `@tailwindcss/postcss` (config-less, theme tokens
  live in `src/app/globals.css`).
- **Zustand 5** with `persist` middleware → `sessionStorage`
  (`src/lib/workflow/store.ts`).
- **@dnd-kit/core** for drag-and-drop on the canvas.
- **lucide-react** for icons.
- **clsx + tailwind-merge** combined as `cn(...)` (`src/lib/cn.ts`).

> ⚠️ This is the new Next.js — APIs may differ from your training data. If you
> need framework specifics, read `node_modules/next/dist/docs/` first.

---

## 3. Directory map

```
src/
├── app/                              # Next.js App Router entry points
│   ├── automation/[[...slug]]/page.tsx  # Single page that renders <AppShell />
│   ├── layout.tsx                       # Inter font, html/body shell
│   ├── globals.css                      # Theme tokens + custom CSS
│   └── page.tsx                         # Root redirect → /automation/workflow-policies
│
├── components/
│   ├── shell/                        # Top-level chrome
│   │   ├── AppShell.tsx                 # Routes URL → screen (list / editor)
│   │   ├── AppSidebar.tsx               # Dark left-rail nav
│   │   ├── TopBar.tsx                   # Global top bar
│   │   └── EditorHeader.tsx             # Per-policy header (name, Save, etc.)
│   │
│   └── workflow/
│       ├── WorkflowEditor.tsx           # DndContext + 3-column editor layout
│       ├── Canvas.tsx                   # Pan/zoom canvas with Start/End pills
│       ├── ComponentsPanel.tsx          # Left palette (Events/Filters/Blocks)
│       ├── ConfigPanel.tsx              # ★ Right panel — routes by node type
│       ├── VersionsPanel.tsx            # Right panel alt view (history)
│       ├── Drawer.tsx                   # ★ Reusable slide-in drawer primitive
│       ├── Switch.tsx                   # 34×20 track-and-knob toggle
│       ├── ConfirmDialog.tsx            # Modal confirmer
│       ├── WorkflowLearnModal.tsx       # "Learn about workflows" entity guide
│       ├── ToastHost.tsx                # Bottom-center toast
│       ├── TourOverlay.tsx              # Onboarding tour
│       ├── AddPicker.tsx                # "+" popover for the canvas connectors
│       ├── CanvasToolbar.tsx            # Zoom / outline / detailed view toggle
│       ├── PolicyListPage.tsx           # Table screen (lists all policies)
│       ├── nodes/                       # Card renderers used inside Canvas
│       │   ├── NodeCard.tsx                # Renders any node (huge file)
│       │   ├── DropSlot.tsx                # Drop targets + Connector lines
│       │   └── Pills.tsx                   # Start / End rounded pills
│       └── config/                   # ★ One file per node-type config screen
│           ├── config-layout.tsx            ★ Shared ConfigBody/Section/Field primitives
│           ├── EventConfig.tsx
│           ├── FilterConfig.tsx
│           ├── AssignEntitiesConfig.tsx       (workflow Block)
│           ├── ApprovalLevelConfig.tsx        (approval Block)
│           ├── ApprovalSplitConfig.tsx        (multisplit parent)
│           ├── ConditionalBranchConfig.tsx    (conditional parent)
│           ├── ApprovalOutcomes.tsx         ★ DecisionOutcomesSection + ApprovalSlaSection
│           ├── EmbeddedConditionalConfig.tsx  (nested conditional in branch)
│           ├── EmbeddedMultisplitConfig.tsx   (nested multisplit in branch)
│           ├── RoutingBranchLadder.tsx          ★ IF/ELSE IF branch rows + condition drawer
│           ├── ApprovalPolicyConfig.tsx       (approval event)
│           ├── ApprovalPolicyRefConfig.tsx    (workflow → linked approval)
│           ├── SodCheckConfig.tsx             (SoD pre-check task)
│           ├── NotificationConfig.tsx
│           ├── ChannelsField.tsx / ChannelsModal.tsx  ★ Shared channel picker + message editor
│           ├── CustomApproverDrawer.tsx       ★ Custom-attribute approver resolver
│           ├── ExitConfig.tsx / SkipConfig.tsx (no-config blocks)
│           ├── SectionCard.tsx                ★ Reusable "open this drawer" tile
│           ├── EntityPickerDrawer.tsx         ★ Generic searchable-list drawer
│           ├── ConditionBuilder.tsx           ★ AND/OR rule row builder
│           ├── EditableName.tsx               Inline-edit title (used in ConfigPanel header)
│           ├── AppsEntitlementsPicker.tsx     2-step picker rendered IN drawer
│           └── RolesPicker.tsx                Table rendered IN drawer
│
└── lib/
    ├── cn.ts                         # cn() = twMerge(clsx(...))
    └── workflow/
        ├── store.ts                  # ★ Zustand store — single source of truth
        ├── types.ts                  # ★ All TS types (read this first)
        ├── defaults.ts               # default* factories + computeStatus()
        ├── icons.ts                  # NODE_META — icon + label per node kind
        ├── palette.ts                # PaletteItem definitions for the left rail
        ├── palette-tones.ts          # ★ Category colors (events/filters/tasks/modules/rules)
        ├── validation.ts             # canPlace() — drop validation
        ├── routing.ts                # URL ↔ store path helpers
        ├── mock-data.ts              # APPS, USERS, ATTRIBUTES, CONDITIONAL_ATTRIBUTES, …
        ├── notification-audience.ts
        ├── split-by-attribute.ts     # Multisplit branch attribute sync
        ├── routing-branch.ts           # IF / ELSE IF / ELSE keyword helpers
        ├── branch-blocks.ts          # Embedded branch level factories (+ filter/module)
        ├── multisplit-decision.ts    # Approval multisplit combined-outcome sync
        ├── approval-decision.ts / sod-decision.ts / decision-outcomes.ts
        ├── approval-flow-seed.ts / sod-policy-seeds.ts / sod-violation-policy-seed.ts
        └── tour.ts                   # Onboarding tour steps

docs/
└── Workflowiga-Blocks-Configuration-Reference.docx  # Block + config reference (regenerate via scripts/generate-blocks-doc.py)
```

---

## 4. State management — `useWorkflowStore`

Everything UI-stateful lives in **one** Zustand store
(`src/lib/workflow/store.ts`). Key slices:

```ts
nodes: WorkflowNode[]              // the working canvas
selectedId: string | null          // currently-selected node (or nested level id)
rightPanelOpen: boolean
rightPanelView: "config" | "versions"
leftPanelCollapsed / mainNavCollapsed
view: "outline" | "detailed"
zoom: number
history: { past, future }          // undo/redo (50-snapshot ring buffer)
toast: { id, message, tone }
confirm: ConfirmRequest | null     // modal-confirmation request
versions: WorkflowVersion[]        // saved snapshots
editorContext: "workflow" | "approval"
policies: Policy[]                 // all saved policies (both types)
currentPolicyId: string | null
screen: "list" | "editor"
listType: "workflow" | "approval"
```

Most consumers select a single slice:

```tsx
const open = useWorkflowStore((s) => s.rightPanelOpen);
const updateNode = useWorkflowStore((s) => s.updateNode);
```

### Mutation rules

- **All node edits** go through `updateNode(id, partial)` which auto-recomputes
  `node.status` via `computeStatus(node)` from `defaults.ts`.
- `updateNode` is **deeply aware**: if `id` matches a level nested inside an
  `approval_split` / `conditional_branch` branch, it patches that level in
  place. Use the same `id` you got from `node.id` on the canvas.
- **Every mutation** is snapshotted to `history.past` for undo/redo — do not
  bypass the store.
- Persisted to `sessionStorage` under `iam-workflow-draft` (versioned with
  `migrate`).

### Seeded demo policies

`seedPolicies()` in `store.ts` registers demo workflow + approval policies
(including **Joiner — High-Risk Provisioning** with branch filters/modules,
**SoD Pre-check — Manager & Owner (Parallel)** with combined multisplit outcome,
**SoD Violation — Intern High-Risk** from `sod-violation-policy-seed.ts`, and
**VMware image example** from `vmware-image-seed.ts` — nested department/ownership
conditional routing to Manager approval levels).
Migrations re-sync seeded policy nodes when shapes change — bump `version` in
`persist` when altering seed structure (currently **v23**).

---

## 5. Type system — `src/lib/workflow/types.ts`

Read this file first when adding a new block type. Highlights:

- `NodeKind = "event" | "filter" | "task"` — top-level node classes.
- `TaskType` — discriminator for task sub-shapes: `assign_entities`,
  `approval_level`, `approval_split`, `conditional_branch`,
  `approval_policy_ref`, `exit`, `skip`, `notification`, `sod_check`.
- `WorkflowNode = { id, kind, data, status }` where `status` is
  `"configured" | "incomplete" | "warning"`.
- `AnyTaskData` is a discriminated union over `TaskType` — narrow with
  `(node.data as AnyTaskData).taskType`.
- `ApprovalLevelConfig` is the **embedded** level shape used inside branches.
  A branch level may be `approval_level | exit | assign_entities | skip |
  notification | conditional_branch | approval_split | sod_check | filter |
  approval_policy_ref` via `blockType`. Don't confuse it with
  `ApprovalLevelData` (the top-level task version).
- **Approval multisplit branches** (approval editor): one `approval_level` per
  branch; per-level **SLA only** (`ApprovalSlaSection`); combined outcomes on
  `ApprovalSplitData.decisionNodeId` below the multisplit.
- **Workflow multisplit branches**: any number of levels; **filters** and
  **modules** can be inserted at any slot (plus tasks, rules, etc.).
- `Policy { id, name, type, status, nodes, createdAt, updatedAt }` — what the
  list page renders and the editor reads/writes via `commitCurrentPolicy()`.

### Adding a new task type — checklist

1. Add the literal to `TaskType` and the new data interface in `types.ts`.
2. Add it to `AnyTaskData` union.
3. Add a `default…()` factory in `defaults.ts`.
4. Extend `computeStatus()` for the new branch.
5. Add a `PaletteItem` with `preset: { taskType: "your_type" }` in
   `palette.ts` and put it in the right section (`TASK_ITEMS`,
   `APPROVAL_TASK_ITEMS`, etc.).
6. Handle the preset in `insertNode` in `store.ts`.
7. Add a `<YourTypeConfig>` in `components/workflow/config/` and route to it
   in `ConfigPanel.tsx`.
8. Add card rendering in `nodes/NodeCard.tsx` (title, subtitle, optional
   pills / banners).

### Notable task types

| `taskType`           | Config file              | Notes |
| -------------------- | ------------------------ | ----- |
| `sod_check`          | `SodCheckConfig.tsx`     | Pre-approval SoD scan; `violationAction`: notify / continue / exit; optional `ChannelsField` when notify. No block-name field in body (header only). |
| `approval_split`     | `ApprovalSplitConfig.tsx`| **Approval**: one approver per branch + combined outcome below. **Workflow**: parallel paths; filters/modules allowed in branches. |
| `conditional_branch` | `ConditionalBranchConfig.tsx` + `RoutingBranchLadder` | IF/ELSE IF/ELSE routing; nested blocks via `EmbeddedConditionalConfig`. |
| `approval_level`     | `ApprovalLevelConfig.tsx`| Custom-attribute approver opens `CustomApproverDrawer`; assignment alerts use `ChannelsField`. Inside **approval multisplit** branches: SLA section only (no outcome ladder). |

---

## 6. Layout & visual system

### Three-column editor (`WorkflowEditor.tsx`)

```
┌────────────────────────────────────────────────────────────────┐
│ AppSidebar │ ComponentsPanel │      Canvas      │ ConfigPanel  │
│   (dark)   │  collapsible    │   pan / zoom     │ 400px right  │
│            │  288 ↔ 48 px    │   DnD drop zone  │ slides in    │
└────────────────────────────────────────────────────────────────┘
                                         ▲
                                         │ Drawer (fixed, z-50)
                                         │ slides over ConfigPanel
                                         │ from far right when a
                                         │ SectionCard is clicked
```

### Theme tokens (CSS variables in `globals.css`)

Always reference these instead of hard-coding colors:

| Token                         | Purpose                                 |
| ----------------------------- | --------------------------------------- |
| `--accent` / `--accent-hover` | Orange brand (#f97316 / #ea580c)        |
| `--accent-soft`               | Light orange fill for icon tiles        |
| `--accent-softer`             | Faintest orange (selected rows)         |
| `--background`                | Page bg (slate-50)                      |
| `--foreground`                | Primary text (slate-900)                |
| `--muted` / `--muted-fg`      | Muted bg / muted text                   |
| `--border` / `--border-strong`| Hairline / stronger border              |
| `--canvas-bg` / `--grid-dot`  | Canvas dot-grid                         |
| `--sidebar-*`                 | Dark left-rail (slate-800 family)       |
| `--risk-{low,med,high}-{bg,fg}` | Risk pills                            |

Common Tailwind tones (use exact values, not shorthand colors):

- Text: `text-[var(--foreground)]`, `text-[var(--muted-fg)]`.
- Borders: `border-[var(--border)]`, `hover:border-[var(--border-strong)]`.
- Inputs focus ring: `focus:border-[var(--accent)]`.
- Statuses: emerald (success), amber (incomplete/SLA), red (warning/danger).

### Typography scale used everywhere

| Token in code      | Used for                                     |
| ------------------ | -------------------------------------------- |
| `text-[10.5px]`    | Tiny chips, counters                         |
| `text-[11px]`      | Uppercase eyebrow labels, captions           |
| `text-[12px]`      | Helper text under titles                     |
| `text-[12.5px]`    | List item secondary text, drawer body        |
| `text-[13px]`      | Buttons, field values, select options        |
| `text-[13.5px]`    | Card titles                                  |
| `text-[14.5px]`    | Drawer titles, editable names                |
| `text-[15px]`      | Editor header policy name                    |

Component-level radii: `rounded-md` (8 px) for buttons / inputs, `rounded-lg`
(10 px) for cards, `rounded-xl` (14 px) for outer section cards, `rounded-full`
for pills/chips.

---

## 7. ★ The Drawer pattern (`Drawer.tsx`)

`Drawer` is the **only** primitive used for any "secondary surface" that needs
heavy input. Use it for: entity pickers, condition builders, multi-step forms,
anything that doesn't fit comfortably in the 400 px ConfigPanel.

### Anatomy

```
[backdrop (full screen, dimmed, click to close)]
└─ [aside] right-anchored, default 620px wide, full height, white, shadow-2xl
   ├─ header (h-16, icon tile + title + description + countChip + ✕)
   ├─ body   (flex-1, overflow-y-auto, scrollbar-thin, px-5 py-4)
   └─ footer (h-14, sticky, right-aligned, optional — pass via prop)
```

### Props (copy-paste reference)

```ts
interface DrawerProps {
  open: boolean;
  onClose: () => void;
  title: string;
  description?: string;
  icon?: LucideIcon;
  countChip?: string | number;  // tiny orange-tinted chip in header
  width?: number;               // default 620 (use 520 for pickers)
  children: React.ReactNode;
  footer?: React.ReactNode;     // usually <Cancel /> + <Apply />
}
```

### Behaviour you get for free

- Escape closes it.
- Backdrop click closes it.
- 200 ms slide-in transition (`translate-x-full` → `translate-x-0`).
- Backdrop is `bg-slate-900/20 backdrop-blur-[1px]`.
- z-index 40 (backdrop) / 50 (panel) — sits above ConfigPanel.

### Standard footer ("Cancel" + "Apply")

When `footer` is **omitted**, `Drawer` renders a default sticky footer with
**Save** (primary) that closes the drawer — use for simple pickers. For
multi-step or draft state, pass an explicit `footer` with Cancel + Apply.

Drawers that host pickers or complex editors often expose Cancel + Apply.
**ConfigPanel itself has no Apply** — most inline edits are live via
`updateNode`. Drawer Apply is usually **confirm-and-close** (e.g.
`FilterConfig` already persists conditions on each `ConditionBuilder`
change; Apply just closes and toasts). Entity pickers may stage selection
until Apply — follow the pattern of the nearest sibling config.

```tsx
<Drawer
  open={openDrawer === "apps"}
  onClose={closeDrawer}
  icon={AppWindow}
  title="Add Apps & Entitlements"
  description="Select applications, then refine with entitlements"
  countChip={appIds.length + entitlementIds.length || undefined}
  footer={
    <>
      <button
        onClick={closeDrawer}
        className="h-9 rounded-md px-3.5 text-[13px] font-medium text-[var(--muted-fg)] hover:bg-[var(--muted)]"
      >
        Cancel
      </button>
      <button
        onClick={applyDrawer}
        className="h-9 rounded-md bg-[var(--accent)] px-3.5 text-[13px] font-semibold text-white hover:bg-[var(--accent-hover)]"
      >
        Apply
      </button>
    </>
  }
>
  {/* drawer body */}
</Drawer>
```

Single-purpose pickers (e.g. select governance group) often use **just**
a "Done" button instead.

### When you'd use a centred modal instead of Drawer

Use **`ChannelsModal`** (via **`ChannelsField`**) for Slack/Email channel
toggles + per-channel message templates with variable insertion and preview.
Implemented with `createPortal(..., document.body)` — see
`ChannelsField.tsx` / `ChannelsModal.tsx`. Also used by SoD Check violation
alerts and Approval Level assignment alerts. Prefer `Drawer` for list pickers
and condition builders.

---

## 8. ★ The Config-panel pattern

`ConfigPanel.tsx` is a **router**: it reads `selectedId` from the store
(including deeply-nested levels inside `approval_split` / `conditional_branch`
branches), resolves the corresponding `WorkflowNode`, and renders one of the
`config/*Config.tsx` components based on `kind` + `taskType`.

### Live apply — no footer

All config changes go through `updateNode` **immediately**. ConfigPanel has
**no Close / Apply footer** — only a collapse (✕) control in the header.
Block names are edited via **`EditableName` in the ConfigPanel header**, not
duplicated inside each `XxxConfig` body.

### Structure of every `XxxConfig` component

Use shared primitives from **`config-layout.tsx`** — do not copy local
`Section` / `Field` helpers into each file.

```tsx
<div className="flex h-full flex-col">
  <ConfigBody>
    <ConfigSection title="…" subtitle="…" action={<Switch … />}>
      <ConfigField label="…">
        <ConfigSelect … />
      </ConfigField>
      <ConfigInset>           {/* grey grouping surface */}
        <ConfigRow label="…" hint="…" action={<Switch … />}>
          …nested controls…
        </ConfigRow>
      </ConfigInset>
      <SectionCard category="tasks" … onClick={() => setDrawer("xyz")} />
    </ConfigSection>
  </ConfigBody>
  <Drawer open={drawer === "xyz"} … />
</div>
```

**Layout hierarchy** (low-noise, no outer boxy cards):

| Primitive        | Role                                              |
| ---------------- | ------------------------------------------------- |
| `ConfigBody`     | Scrollable panel body (`px-4 py-4`, gap-5)       |
| `ConfigSection`  | Title row + optional `ConfigInset` wrapper         |
| `ConfigInset`    | Muted grey group (`bg-[var(--muted)]/45`)         |
| `ConfigSurface`  | White nested surface inside an inset              |
| `ConfigField`    | Label + control stack                             |
| `ConfigRow`      | Label + hint on left, control on right (toggles)  |
| `ConfigSelect` / `ConfigMultiSelect` | Styled selects / multi-select chips |

**Section headers**: `font-medium` (not semibold). **No icons** in section
headers — pass `icon` only for backward compatibility; it is ignored.
Use `ConfigInfoTip` on the title row for subtitles instead of long caption lines.

### Local drawer state

```tsx
type DrawerKey = "approver" | "fallback" | "customAttr" | null;
const [drawer, setDrawer] = useState<DrawerKey>(null);
```

Only one drawer open at a time per config component.

---

## 9. ★ The SectionCard + Drawer "click to configure" pattern

When a setting is too rich to render inline, render a **`SectionCard`** that
summarises the current value, and open a **`Drawer`** on click.

```
┌──────────────────────────────────────────────────────┐
│ [icon] Add Apps & Entitlements              [chip] ›│  ← SectionCard
│        3 apps · 5 entitlements                       │
└──────────────────────────────────────────────────────┘
```

```tsx
<SectionCard
  category="tasks"   // events | filters | tasks | modules | rules — drives icon tile tint
  icon={AppWindow}
  title="Add Apps & Entitlements"
  description="Select applications, then refine with entitlements"
  summary={appIds.length ? `${appIds.length} apps · …` : null}
  count={appIds.length + entitlementIds.length}
  onClick={() => setDrawer("apps")}
/>
```

Category tones live in `palette-tones.ts` (`paletteIconTileClass`,
`paletteCardSelectionClass`). **Canvas selection outline is always brand
orange** (`var(--accent)`) regardless of block category; category tints apply
to icon tiles and left borders only.

`SectionCard` props (see `config/SectionCard.tsx`):

| Prop          | Effect                                                       |
| ------------- | ------------------------------------------------------------ |
| `icon`        | Lucide icon shown in 36 × 36 tile                            |
| `title`       | Bold 13 px label                                             |
| `description` | Used when nothing is configured yet                         |
| `summary`     | Shown when configured (overrides `description`)              |
| `count`       | If > 0 → orange chip next to title + "configured" visual    |
| `configured`  | Override of `count > 0`                                      |
| `onClick`     | Opens the corresponding drawer                               |

**Visual states**

- Empty: dashed border, muted icon tile, hidden "+ Configure" CTA on hover.
- Configured: solid border, orange icon tile, count chip, chevron-right.

Use this consistently for: app pickers, role pickers, condition rules,
approver pickers, fallback approver pickers, etc. Don't create a different
visual idiom for "open this drawer" interactions.

### The drawer state convention

In each `XxxConfig`, use a single state with a `null | "key"` union so only
one drawer can be open at a time:

```tsx
type DrawerKey = "apps" | "tech" | "business" | "criteria" | null;
const [openDrawer, setOpenDrawer] = useState<DrawerKey>(null);
```

Then render every drawer with `open={openDrawer === "apps"}`.

---

## 10. Specialised drawer bodies (reusable)

These live in `components/workflow/config/` and are dropped **inside** a
`<Drawer>` body — they do **not** render their own `<Drawer>`:

| Component                  | Purpose                                                        |
| -------------------------- | -------------------------------------------------------------- |
| `AppsEntitlementsPicker`   | 2-step picker: app grid → entitlements table with pagination   |
| `RolesPicker`              | Searchable table of technical / business roles                 |
| `ConditionBuilder`         | AND/OR rule rows with attribute / operator / value selectors   |
| `RoutingBranchLadder`      | IF / ELSE IF / ELSE branch rows; opens drawer per branch for conditions |
| `CustomApproverDrawer`     | Pick custom-attribute resolver + optional "Apply when" rules   |
| `ChannelsField`            | SectionCard trigger → `ChannelsModal` (Slack/Email + messages) |
| `EmbeddedConditionalConfig`| Config for nested conditional inside a branch column           |

**`EntityPickerDrawer`** is the only one that's *itself* a Drawer — it
wraps `Drawer` to provide a search + checkboxed list. Use it for selecting
governance groups, users, fallback approvers, custom attributes, etc.

```tsx
<EntityPickerDrawer
  open={drawer === "approver"}
  onClose={() => setDrawer(null)}
  title="Select Governance Group"
  description="Choose who approves at this level"
  icon={UsersRound}
  items={GOVERNANCE_GROUPS.map((g) => ({
    id: g.id, primary: g.name, secondary: g.description,
    meta: `${g.members} members`, color: "#6366F1",
  }))}
  selectedIds={approverRefs}
  onChange={(ids) => patch({ approverRefs: ids })}
  searchPlaceholder="Search governance groups…"
  single={false}   // set true for radio-style single-pick
/>
```

When adding any new "pick from a list" experience: use **EntityPickerDrawer**.
Don't build a fresh table.

---

## 11. ConditionBuilder & attribute sets

`ConditionBuilder.tsx` is the canonical AND/OR rule builder, used in:

- Filter node (`FilterConfig`) — identity `ATTRIBUTES`
- Assignment criteria (`AssignEntitiesConfig`)
- Conditional-branch routing (`RoutingBranchLadder` drawer per branch)
- Custom-attribute approver rules (`CustomApproverDrawer`)
- Multisplit branch attribute values (via attribute defs in split config)

It enforces a **10-condition cap**. Pass a custom `attributes` `AttributeDef[]`:

| Constant                    | Used for                                      |
| --------------------------- | --------------------------------------------- |
| `ATTRIBUTES`                | User filter, assignment criteria (identity)   |
| `APPROVAL_ATTRIBUTES`       | Skip rules, custom approver apply-when        |
| `CONDITIONAL_ATTRIBUTES`    | Conditional / routing branches (full set)     |
| `WORKFLOW_SPLIT_ATTRIBUTES` | Multisplit attribute picker (workflow editor)   |
| `ACCESS_CONTEXT_ATTRIBUTES` | Policy type, business role, SoD violation, access decisions, etc. |

**Routing keywords** (`routing-branch.ts`): first branch = IF, last = ELSE
(catch-all, always "All other requests"), middle = ELSE IF — positional, not
data-driven.

Value input rendering is automatic based on `AttributeDef.type`
(`select | text | number`) and `operator` (`in` / `not_in` → multi-select).

### Notification audiences

`NOTIFICATION_AUDIENCE_OPTIONS`: Requester, Manager, Owner, Specific users.
Configure channels via `ChannelsField` (not inline toggles).

---

## 12. Side-effects: toasts and confirms

- **Toast**: `useWorkflowStore.getState().showToast(message, "success" | "error" | "default")`.
  Auto-dismisses after 3.2 s. Use for "Changes applied", "Policy saved",
  validation errors, etc.
- **Confirm dialog**: `requestConfirm({ title, message, confirmLabel,
  tone: "danger" | "default", onConfirm })`. Used for destructive deletes
  (e.g. removing a configured node, deleting a policy).

Do not use `window.confirm` / `alert`.

---

## 13. Canvas, drag-and-drop, validation

- `Canvas.tsx` renders nodes vertically with `Connector` lines and
  `DropSlot` indicators. **`Exit` blocks terminate the flow** — no connector
  below them; branches ending in Exit do not draw merge lines.
- Branching nodes (`approval_split` / `conditional_branch`) render SVG
  branches inline in `NodeCard.tsx` → `SplitBranchesFlow`.
- Left palette tab is **Blocks** (not "Tasks"); workflow editor groups
  Filters + Tasks + Modules + Rules under Blocks. Adding a joiner event
  auto-switches to Blocks. Footer links: **Learn about workflows** (modal) and
  **Take a tour** (workflow editor only for the learn link).
- Drops validated by `validation.canPlace(kind, index, nodes)` — filters
  are **not** allowed in approval policies.
- Palette uses `@dnd-kit/core`; drag presets mapped in `WorkflowEditor.tsx`
  `onDragEnd`.
- `CanvasToolbar`: zoom / view mode only (no directional pan buttons).

---

## 14. Conventions you must follow

1. **Use `cn(...)`** for any conditional className. Don't string-concatenate.
2. **No new colour constants** — extend `globals.css` variables instead and
   reference them with `var(--token)`. The accent is orange; status colours are
   emerald/amber/red (Tailwind defaults).
3. **All node mutation** goes through `updateNode(id, partial)`. Never
   mutate `data` in place; the store snapshots for undo/redo.
4. **One drawer open at a time per config** — use `useState<DrawerKey>(null)`.
5. **Headers in configs/drawers** always: icon tile → title → small
   description → optional count chip → close affordance. Stick to the visual.
6. **Don't introduce a new toggle / picker UI.** Use `Switch`, `SectionCard`,
   `EntityPickerDrawer`, `ConditionBuilder`. If a new primitive is *really*
   needed, put it in `components/workflow/` and reuse it.
7. **Status must be derivable** — `computeStatus(node)` is the single source
   of truth for whether a node is `configured | incomplete | warning`. Extend
   it for new task types.
8. **All client components start with `"use client"`** (we lean heavily on
   the Zustand store).
9. **Persist with care** — only fields in `partialize` in `store.ts` survive
   reload. Add new top-level state there if it should persist; bump
   `version` and write a `migrate` step if the shape changes.
10. **Don't add narrative comments.** Code comments should only explain
    non-obvious intent, never narrate what's happening (consistent with the
    existing codebase).
11. **Config panel = live apply.** Don't add Close/Apply footers to
    `ConfigPanel` or duplicate block-name inputs inside config bodies.
12. **Block documentation** — regenerate
    `docs/Workflowiga-Blocks-Configuration-Reference.docx` with
    `python scripts/generate-blocks-doc.py` when adding blocks or materially
    changing config shapes.

---

## 15. Quick "design something similar" recipe

Use this when the user asks "add a new block / config screen":

1. **Define the type** in `types.ts` → add to `TaskType` and `AnyTaskData`.
2. **Add a factory** `defaultXyz()` in `defaults.ts` and extend
   `computeStatus()`.
3. **Wire palette entry** in `palette.ts` (right section: workflow tasks,
   approval tasks, approval rules, or workflow modules).
4. **Handle insertion** in `store.ts` → `insertNode` (preset branch).
5. **Create `config/XyzConfig.tsx`**:
   - Body only: `<ConfigBody>` + `<ConfigSection>` from `config-layout.tsx`.
   - Block name lives in ConfigPanel header — don't duplicate a name field.
   - Use `<ConfigField>`, `<ConfigInset>`, `<ConfigRow>`, `<Switch>`.
   - Heavy inputs: **`SectionCard` → Drawer** or **`ChannelsField`**.
   - Lists: `EntityPickerDrawer`. Rules: `ConditionBuilder`.
6. **Route to it** in `ConfigPanel.tsx` (+ `panelHeader` hint if new task type).
7. **Render the card** in `nodes/NodeCard.tsx` — pick title/subtitle, add
   chips/pills if needed (match the existing `ApprovalMetaPills` style).
8. **Smoke test in your head**: status correctly toggles configured /
   incomplete; nothing throws when the drawer is closed mid-edit.

If you find yourself reinventing one of the primitives in §7–§11, stop and
reuse the existing one.
