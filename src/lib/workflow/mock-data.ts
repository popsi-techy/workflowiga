import type {
  AppItem,
  AttributeDef,
  BusinessRoleItem,
  EntitlementItem,
  OperatorDef,
  TechnicalRoleItem,
} from "./types";
import {
  APPROVAL_V2_ATTRIBUTES,
  APPROVAL_V2_ATTRIBUTE_GROUPS,
  RELATIONSHIP_BOOLEAN_ATTRIBUTES,
} from "./approval-conditional-v2";

export { APPROVAL_V2_ATTRIBUTES, APPROVAL_V2_ATTRIBUTE_GROUPS };

export const OPERATORS: OperatorDef[] = [
  { value: "equals", label: "equals" },
  { value: "not_equals", label: "does not equal" },
  { value: "contains", label: "contains" },
  { value: "starts_with", label: "starts with" },
  { value: "in", label: "is one of" },
  { value: "not_in", label: "is not one of" },
  { value: "greater_than", label: "greater than" },
  { value: "less_than", label: "less than" },
  { value: "gte", label: "at least (≥)" },
  { value: "lte", label: "at most (≤)" },
];

export const ATTRIBUTES: AttributeDef[] = [
  {
    value: "designation",
    label: "Designation",
    type: "select",
    options: [
      "SDE Intern",
      "Software Engineer",
      "Senior Engineer",
      "Staff Engineer",
      "Engineering Manager",
      "Product Manager",
      "Finance Analyst",
      "HR Business Partner",
    ],
  },
  {
    value: "department",
    label: "Department",
    type: "select",
    options: ["Engineering", "Product", "Finance", "HR", "Sales", "Marketing", "Operations"],
  },
  {
    value: "sub_team",
    label: "Sub-team",
    type: "select",
    options: ["WP", "Identity", "Platform", "Growth", "Data", "Core"],
  },
  {
    value: "location",
    label: "Location",
    type: "select",
    options: ["Pune", "Bangalore", "Hyderabad", "San Francisco", "London", "Singapore", "Shanghai"],
  },
  {
    value: "country",
    label: "Country",
    type: "select",
    options: ["India", "United States", "United Kingdom", "Singapore", "China", "Germany"],
  },
  {
    value: "employee_type",
    label: "Employee Type",
    type: "select",
    options: ["Full-time", "Contractor", "Intern", "Part-time"],
  },
  { value: "manager", label: "Manager", type: "text" },
  { value: "cost_center", label: "Cost Center", type: "text" },
  {
    value: "job_family",
    label: "Job Family",
    type: "select",
    options: ["Engineering", "Product", "Design", "GTM", "Operations", "Finance"],
  },
  {
    value: "grade",
    label: "Grade",
    type: "select",
    options: ["L1", "L2", "L3", "L4", "L5", "L6", "L7"],
  },
];

export const APPS: AppItem[] = [
  { id: "app_salesforce", name: "Salesforce", initials: "SF", color: "#00A1E0", category: "CRM", baselineAccess: "Standard User" },
  { id: "app_workday", name: "Workday", initials: "WD", color: "#F38B00", category: "HCM", baselineAccess: "Employee Self-Service" },
  { id: "app_github", name: "GitHub", initials: "GH", color: "#24292E", category: "DevOps", baselineAccess: "Member" },
  { id: "app_jira", name: "Jira", initials: "JI", color: "#0052CC", category: "PM Tool", baselineAccess: "Project Member" },
  { id: "app_slack", name: "Slack", initials: "SL", color: "#4A154B", category: "Comms", baselineAccess: "Member" },
  { id: "app_aws", name: "AWS", initials: "AW", color: "#FF9900", category: "Cloud", baselineAccess: "ReadOnly" },
  { id: "app_okta", name: "Okta", initials: "OK", color: "#007DC1", category: "Identity", baselineAccess: "User" },
  { id: "app_servicenow", name: "ServiceNow", initials: "SN", color: "#62D84E", category: "ITSM", baselineAccess: "ITIL User" },
  { id: "app_m365", name: "Microsoft 365", initials: "M3", color: "#D83B01", category: "Productivity", baselineAccess: "E3 License" },
  { id: "app_zoom", name: "Zoom", initials: "ZM", color: "#2D8CFF", category: "Comms", baselineAccess: "Licensed User" },
  { id: "app_confluence", name: "Confluence", initials: "CO", color: "#172B4D", category: "Docs", baselineAccess: "Member" },
  { id: "app_sap", name: "SAP", initials: "SA", color: "#0FAAFF", category: "ERP", baselineAccess: "Display Role" },
  { id: "app_stripe", name: "Stripe", initials: "ST", color: "#635BFF", category: "Finance", baselineAccess: "Standard User" },
];

/**
 * Access-request context attributes — describe the request being approved
 * (the app/entitlement asked for and what the user already holds). Used by
 * approval-step skip rules, e.g. "skip App Owner if user already has baseline
 * access to the requested app".
 */
export const ACCESS_CONTEXT_ATTRIBUTES: AttributeDef[] = [
  {
    value: "policy_type",
    label: "Policy type",
    type: "select",
    options: ["attributeBased", "roleBased", "riskBased"],
  },
  {
    value: "business_role",
    label: "Business role",
    type: "select",
    options: [
      "Software Intern",
      "Software Engineer",
      "Engineering Manager",
      "Product Manager",
      "Finance Analyst",
      "HR Business Partner",
      "Sales Representative",
      "Customer Support",
      "Contractor — Engineering",
    ],
  },
  {
    value: "user_access_risk_score",
    label: "User access risk score",
    type: "number",
  },
  {
    value: "has_baseline_access",
    label: "Has baseline access",
    type: "select",
    options: ["Yes", "No"],
  },
  {
    value: "access_decision",
    label: "Access decision",
    type: "select",
    options: ["Approved", "Rejected", "Delegated"],
  },
  {
    value: "approval_outcome",
    label: "Approval outcome",
    type: "select",
    options: [
      "Approved",
      "Rejected",
      "Delegated",
      "No Action / SLA Breached",
    ],
  },
  {
    value: "sod_violation",
    label: "SoD violation",
    type: "select",
    options: ["Detected", "Not detected"],
  },
  {
    value: "sod_result",
    label: "SoD check result",
    type: "select",
    options: [
      "Violation detected",
      "No violation",
      "Risk: Low",
      "Risk: Medium",
      "Risk: High",
    ],
  },
  {
    value: "has_requested_entitlement",
    label: "Already holds requested entitlement",
    type: "select",
    options: ["Yes", "No"],
  },
  {
    value: "requested_app",
    label: "Requested application",
    type: "select",
    options: APPS.map((a) => a.name),
  },
  {
    value: "requested_entitlement_risk",
    label: "Requested entitlement risk",
    type: "select",
    options: ["Low", "Medium", "High"],
  },
  {
    value: "requested_entitlement_type",
    label: "Requested entitlement type",
    type: "select",
    options: ["Permission", "Group", "Role", "License"],
  },
];

/** Requester / owner / line-manager relationship signals (boolean). Approval conditional branches only. */
export const APPROVAL_RELATIONSHIP_ATTRIBUTES: AttributeDef[] =
  RELATIONSHIP_BOOLEAN_ATTRIBUTES;

/** Attribute key + values the auto-created SoD decision block routes on. */
export const SOD_RESULT_ATTR = "sod_result";
export type SodResult =
  | "Violation detected"
  | "No violation"
  | "Risk: Low"
  | "Risk: Medium"
  | "Risk: High";

/** Attribute key + values the auto-created approval decision block routes on. */
export const APPROVAL_OUTCOME_ATTR = "approval_outcome";
export type ApprovalOutcome =
  | "Approved"
  | "Rejected"
  | "Delegated"
  | "No Action / SLA Breached";
export const APPROVAL_OUTCOMES: ApprovalOutcome[] = [
  "Approved",
  "Rejected",
  "Delegated",
  "No Action / SLA Breached",
];

/**
 * Attribute set offered to approval-step skip conditions: access-request
 * context first, then the identity attributes (so rules like "skip if
 * requester grade is L6" are also expressible).
 */
export const APPROVAL_ATTRIBUTES: AttributeDef[] = [
  ...ACCESS_CONTEXT_ATTRIBUTES,
  ...ATTRIBUTES,
];

/**
 * Numeric/risk request signals used by conditional-branch routing rules, e.g.
 * "Amount > $50,000" or "Risk score > 40". Combined with access + identity
 * attributes for full expressiveness.
 */
export const ROUTING_SIGNAL_ATTRIBUTES: AttributeDef[] = [
  { value: "request_amount", label: "Amount", type: "number", unit: "$" },
  { value: "risk_score", label: "Risk score", type: "number" },
  { value: "entitlement_count", label: "Entitlement count", type: "number" },
];

/** Attribute set offered to conditional-branch routing conditions. */
export const CONDITIONAL_ATTRIBUTES: AttributeDef[] = [
  ...ROUTING_SIGNAL_ATTRIBUTES,
  ...ACCESS_CONTEXT_ATTRIBUTES,
  ...ATTRIBUTES,
];

/** Approval-policy conditional branches — workflow signals + relationship booleans + entity attributes. */
export const APPROVAL_CONDITIONAL_ATTRIBUTES: AttributeDef[] = [
  ...CONDITIONAL_ATTRIBUTES,
  ...APPROVAL_RELATIONSHIP_ATTRIBUTES,
  ...APPROVAL_V2_ATTRIBUTES,
];

/** Attributes offered when splitting workflow branches by request context. */
export const WORKFLOW_SPLIT_ATTRIBUTES: AttributeDef[] = [
  ...ATTRIBUTES.filter((a) => a.type === "select" && (a.options?.length ?? 0) > 0),
  ...ROUTING_SIGNAL_ATTRIBUTES,
  ...ACCESS_CONTEXT_ATTRIBUTES.filter(
    (a) => a.value === "requested_app" || a.value === "requested_entitlement_risk",
  ),
];

export const ENTITLEMENTS: EntitlementItem[] = [
  // Salesforce
  { id: "ent_sf_1", name: "Sales Cloud — Standard User", appId: "app_salesforce", type: "License", risk: "Low" },
  { id: "ent_sf_2", name: "Sales Cloud — System Admin", appId: "app_salesforce", type: "Role", risk: "High" },
  { id: "ent_sf_3", name: "Reports & Dashboards (Read)", appId: "app_salesforce", type: "Permission", risk: "Low" },
  { id: "ent_sf_4", name: "Opportunity Management", appId: "app_salesforce", type: "Permission", risk: "Medium" },

  // Workday
  { id: "ent_wd_1", name: "HR Partner", appId: "app_workday", type: "Role", risk: "High" },
  { id: "ent_wd_2", name: "Compensation Partner", appId: "app_workday", type: "Role", risk: "High" },
  { id: "ent_wd_3", name: "Time Tracking", appId: "app_workday", type: "Permission", risk: "Low" },
  { id: "ent_wd_4", name: "Expense Submitter", appId: "app_workday", type: "Permission", risk: "Low" },

  // GitHub
  { id: "ent_gh_1", name: "Repo: api-server (Read)", appId: "app_github", type: "Permission", risk: "Low" },
  { id: "ent_gh_2", name: "Repo: api-server (Write)", appId: "app_github", type: "Permission", risk: "Medium" },
  { id: "ent_gh_3", name: "Org Owner", appId: "app_github", type: "Role", risk: "High" },
  { id: "ent_gh_4", name: "Engineering Team", appId: "app_github", type: "Group", risk: "Low" },

  // Jira
  { id: "ent_ji_1", name: "Project: PLATFORM — Developer", appId: "app_jira", type: "Group", risk: "Low" },
  { id: "ent_ji_2", name: "Project: PLATFORM — Admin", appId: "app_jira", type: "Role", risk: "High" },
  { id: "ent_ji_3", name: "Service Desk Agent", appId: "app_jira", type: "Role", risk: "Medium" },

  // Slack
  { id: "ent_sl_1", name: "Channel: #eng-platform", appId: "app_slack", type: "Group", risk: "Low" },
  { id: "ent_sl_2", name: "Channel: #incident-bridge", appId: "app_slack", type: "Group", risk: "Medium" },
  { id: "ent_sl_3", name: "Workspace Admin", appId: "app_slack", type: "Role", risk: "High" },

  // AWS
  { id: "ent_aws_1", name: "AWS Dev Account — ReadOnly", appId: "app_aws", type: "Role", risk: "Low" },
  { id: "ent_aws_2", name: "AWS Prod Account — Operator", appId: "app_aws", type: "Role", risk: "High" },
  { id: "ent_aws_3", name: "S3 Bucket: app-logs (Read)", appId: "app_aws", type: "Permission", risk: "Medium" },

  // Okta
  { id: "ent_ok_1", name: "App Assignment: SSO Bundle", appId: "app_okta", type: "Group", risk: "Low" },
  { id: "ent_ok_2", name: "Okta Admin Console", appId: "app_okta", type: "Role", risk: "High" },

  // ServiceNow
  { id: "ent_sn_1", name: "ITIL — Incident Manager", appId: "app_servicenow", type: "Role", risk: "Medium" },
  { id: "ent_sn_2", name: "Change Approver", appId: "app_servicenow", type: "Role", risk: "High" },
  { id: "ent_sn_3", name: "Self-Service Portal", appId: "app_servicenow", type: "Permission", risk: "Low" },

  // M365
  { id: "ent_m3_1", name: "E3 License", appId: "app_m365", type: "License", risk: "Low" },
  { id: "ent_m3_2", name: "Exchange Online — Mailbox", appId: "app_m365", type: "Permission", risk: "Low" },
  { id: "ent_m3_3", name: "Teams — Standard", appId: "app_m365", type: "Permission", risk: "Low" },
  { id: "ent_m3_4", name: "SharePoint — Site Owner", appId: "app_m365", type: "Role", risk: "Medium" },

  // Zoom
  { id: "ent_zm_1", name: "Licensed User", appId: "app_zoom", type: "License", risk: "Low" },
  { id: "ent_zm_2", name: "Webinar Add-on", appId: "app_zoom", type: "License", risk: "Low" },

  // Confluence
  { id: "ent_co_1", name: "Space: Engineering", appId: "app_confluence", type: "Group", risk: "Low" },
  { id: "ent_co_2", name: "Space Admin: Engineering", appId: "app_confluence", type: "Role", risk: "Medium" },

  // SAP
  { id: "ent_sa_1", name: "Display Role", appId: "app_sap", type: "Role", risk: "Low" },
  { id: "ent_sa_2", name: "Finance Posting Role", appId: "app_sap", type: "Role", risk: "High" },
  { id: "ent_sa_3", name: "Procurement Approver", appId: "app_sap", type: "Role", risk: "High" },
];

export const TECHNICAL_ROLES: TechnicalRoleItem[] = [
  { id: "tr_1", name: "AWS-EC2-Operator", description: "Bundles EC2 read/start/stop across non-prod accounts", appsCount: 2, risk: "Medium", lastUpdated: "2026-04-22" },
  { id: "tr_2", name: "GitHub-Repo-Maintainer", description: "Maintainer access to all engineering repos", appsCount: 1, risk: "Medium", lastUpdated: "2026-04-18" },
  { id: "tr_3", name: "Okta-App-Admin", description: "Manage SSO app assignments only", appsCount: 1, risk: "High", lastUpdated: "2026-03-30" },
  { id: "tr_4", name: "M365-Collab-Bundle", description: "Teams + SharePoint contributor access", appsCount: 1, risk: "Low", lastUpdated: "2026-04-02" },
  { id: "tr_5", name: "Jira-Project-Lead", description: "Admin in PLATFORM, GROWTH, CORE projects", appsCount: 1, risk: "Medium", lastUpdated: "2026-04-15" },
  { id: "tr_6", name: "SAP-Finance-ReadOnly", description: "Read-only display across finance modules", appsCount: 1, risk: "Low", lastUpdated: "2026-04-10" },
  { id: "tr_7", name: "Salesforce-Sales-Standard", description: "Standard user with opportunity management", appsCount: 1, risk: "Low", lastUpdated: "2026-04-25" },
  { id: "tr_8", name: "ServiceNow-Agent", description: "Service desk agent with incident management", appsCount: 1, risk: "Medium", lastUpdated: "2026-04-19" },
  { id: "tr_9", name: "Workday-Self-Service", description: "Employee self-service baseline", appsCount: 1, risk: "Low", lastUpdated: "2026-03-28" },
  { id: "tr_10", name: "Slack-Workspace-Member", description: "Default Slack workspace + eng channels", appsCount: 1, risk: "Low", lastUpdated: "2026-04-26" },
];

export const BUSINESS_ROLES: BusinessRoleItem[] = [
  { id: "br_intern", name: "Software Intern", description: "Time-bound intern access with elevated review", members: 18, owner: "P. Mehta", lastUpdated: "2026-05-28" },
  { id: "br_1", name: "Software Engineer", description: "Baseline access for engineering ICs", members: 342, owner: "P. Mehta", lastUpdated: "2026-04-12" },
  { id: "br_2", name: "Engineering Manager", description: "Engineering manager bundle: people-mgmt + repo admin", members: 41, owner: "P. Mehta", lastUpdated: "2026-04-08" },
  { id: "br_3", name: "Product Manager", description: "Product analytics + roadmap tools", members: 28, owner: "S. Iyer", lastUpdated: "2026-04-21" },
  { id: "br_4", name: "Finance Analyst", description: "SAP read + Workday compensation viewer", members: 18, owner: "R. Kapoor", lastUpdated: "2026-04-05" },
  { id: "br_5", name: "HR Business Partner", description: "Workday HR Partner + ServiceNow agent", members: 12, owner: "N. Sharma", lastUpdated: "2026-04-17" },
  { id: "br_6", name: "Sales Representative", description: "Salesforce standard + lead routing", members: 96, owner: "V. Rao", lastUpdated: "2026-04-22" },
  { id: "br_7", name: "Customer Support", description: "ServiceNow agent + Slack support channels", members: 64, owner: "T. Singh", lastUpdated: "2026-04-09" },
  { id: "br_8", name: "Contractor — Engineering", description: "Time-bound limited engineering access", members: 22, owner: "P. Mehta", lastUpdated: "2026-04-29" },
];

export function entitlementsForApps(appIds: string[]): EntitlementItem[] {
  if (appIds.length === 0) return [];
  const set = new Set(appIds);
  return ENTITLEMENTS.filter((e) => set.has(e.appId));
}

export function getApp(id: string): AppItem | undefined {
  return APPS.find((a) => a.id === id);
}

export function getEntitlement(id: string): EntitlementItem | undefined {
  return ENTITLEMENTS.find((e) => e.id === id);
}

export function getAttribute(value: string): AttributeDef | undefined {
  return ATTRIBUTES.find((a) => a.value === value);
}

// ── Approver entities ─────────────────────────────────────────────────────────

export interface UserItem {
  id: string;
  name: string;
  email: string;
  title: string;
  department: string;
}

export const USERS: UserItem[] = [
  { id: "usr_pmehta", name: "Priya Mehta", email: "priya.mehta@acme.com", title: "Engineering Director", department: "Engineering" },
  { id: "usr_siyer", name: "Sandeep Iyer", email: "sandeep.iyer@acme.com", title: "Head of Product", department: "Product" },
  { id: "usr_rkapoor", name: "Riya Kapoor", email: "riya.kapoor@acme.com", title: "Finance Controller", department: "Finance" },
  { id: "usr_nsharma", name: "Neha Sharma", email: "neha.sharma@acme.com", title: "HR Business Partner", department: "HR" },
  { id: "usr_vrao", name: "Vikram Rao", email: "vikram.rao@acme.com", title: "Sales Director", department: "Sales" },
  { id: "usr_tsingh", name: "Tara Singh", email: "tara.singh@acme.com", title: "Support Lead", department: "Support" },
  { id: "usr_achen", name: "Alan Chen", email: "alan.chen@acme.com", title: "Security Engineer", department: "Security" },
  { id: "usr_jdoe", name: "Jordan Doe", email: "jordan.doe@acme.com", title: "IT Administrator", department: "IT" },
  { id: "usr_mfarah", name: "Maya Farah", email: "maya.farah@acme.com", title: "Compliance Manager", department: "Compliance" },
  { id: "usr_lwang", name: "Lily Wang", email: "lily.wang@acme.com", title: "Platform Lead", department: "Engineering" },
];

export interface GovernanceGroupItem {
  id: string;
  name: string;
  description: string;
  members: number;
}

export const GOVERNANCE_GROUPS: GovernanceGroupItem[] = [
  { id: "gg_sod_risk", name: "SoD / Risk Officer", description: "Segregation of Duties and access-risk reviewers", members: 4 },
  { id: "gg_secops", name: "Security Operations", description: "Reviews high-risk access requests", members: 6 },
  { id: "gg_iga", name: "IGA Governance Board", description: "Identity governance & certification owners", members: 4 },
  { id: "gg_app_owners", name: "Application Owners", description: "Owners of business-critical applications", members: 11 },
  { id: "gg_finance", name: "Finance Controllers", description: "Approves finance-system access", members: 5 },
  { id: "gg_data", name: "Data Stewards", description: "Owners of regulated data domains", members: 7 },
  { id: "gg_compliance", name: "Compliance & Audit", description: "SOX / audit oversight group", members: 3 },
];

export interface CustomApproverAttr {
  id: string;
  label: string;
  description: string;
}

export const CUSTOM_APPROVER_ATTRS: CustomApproverAttr[] = [
  { id: "ca_app_owner", label: "Application Owner", description: "Resolved from the requested application's owner" },
  { id: "ca_dept_head", label: "Department Head", description: "Head of the requester's department" },
  { id: "ca_cost_center_owner", label: "Cost Center Owner", description: "Owner of the requester's cost center" },
  { id: "ca_data_steward", label: "Data Steward", description: "Steward for the data domain of the entitlement" },
  { id: "ca_skip_manager", label: "Skip-level Manager", description: "The requester's manager's manager" },
];

export function getUser(id: string): UserItem | undefined {
  return USERS.find((u) => u.id === id);
}
export function getGovernanceGroup(id: string): GovernanceGroupItem | undefined {
  return GOVERNANCE_GROUPS.find((g) => g.id === id);
}
export function getCustomApproverAttr(id: string): CustomApproverAttr | undefined {
  return CUSTOM_APPROVER_ATTRS.find((c) => c.id === id);
}
