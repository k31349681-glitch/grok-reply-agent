import { createFileRoute } from "@tanstack/react-router";
import { AppShell } from "@/components/app-shell";
import { AnalyticsView } from "@/components/views/analytics";

export const Route = createFileRoute("/analytics")({
  component: function AnalyticsPage() {
    return (
      <AppShell title="Analytics">
        <AnalyticsView />
      </AppShell>
    );
  },
});
