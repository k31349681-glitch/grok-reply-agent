import { createFileRoute } from "@tanstack/react-router";
import { AppShell } from "@/components/app-shell";
import { InboxView } from "@/components/views/inbox";

export const Route = createFileRoute("/inbox")({
  component: function InboxPage() {
    return (
      <AppShell title="Inbox">
        <InboxView />
      </AppShell>
    );
  },
});
