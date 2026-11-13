import { createFileRoute } from "@tanstack/react-router";
import { AppShell } from "@/components/app-shell";
import { CommandView } from "@/components/views/command";

export const Route = createFileRoute("/")({
  component: function Home() {
    return (
      <AppShell title="Command">
        <CommandView />
      </AppShell>
    );
  },
});
