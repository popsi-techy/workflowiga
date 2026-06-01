import { AppShell } from "@/components/shell/AppShell";

// Optional catch-all so every /automation/* URL (tables and per-policy editor)
// resolves to the same client shell, which reads the path to pick the screen.
export default function AutomationPage() {
  return <AppShell />;
}
