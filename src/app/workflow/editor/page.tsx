import { redirect } from "next/navigation";

// Legacy entry point — the app now lives under /automation/*.
export default function EditorPage() {
  redirect("/automation/workflow-policies");
}
