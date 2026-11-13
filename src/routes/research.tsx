import { createFileRoute } from "@tanstack/react-router";
import { AppShell } from "@/components/app-shell";
import { ResearchView } from "@/components/views/research";

export const Route = createFileRoute("/research")({
  component: function ResearchPage() {
    return (
      <AppShell title="Research">
        <ResearchView />
      </AppShell>
    );
  },
});
