import { createFileRoute } from "@tanstack/react-router";
import { AppShell } from "@/components/app-shell";
import { StudioView } from "@/components/views/studio";

export const Route = createFileRoute("/studio")({
  component: function StudioPage() {
    return (
      <AppShell title="Replies">
        <StudioView />
      </AppShell>
    );
  },
});
