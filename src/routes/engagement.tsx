import { createFileRoute } from "@tanstack/react-router";
import { AppShell } from "@/components/app-shell";
import { EngagementView } from "@/components/views/engagement";

export const Route = createFileRoute("/engagement")({
  component: function EngagementPage() {
    return (
      <AppShell title="People">
        <EngagementView />
      </AppShell>
    );
  },
});
