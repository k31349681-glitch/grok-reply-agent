import { createFileRoute } from "@tanstack/react-router";
import { AppShell } from "@/components/app-shell";
import { UsageView } from "@/components/views/usage";

export const Route = createFileRoute("/usage")({
  component: function UsagePage() {
    return (
      <AppShell title="Usage">
        <UsageView />
      </AppShell>
    );
  },
});
