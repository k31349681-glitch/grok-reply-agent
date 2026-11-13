import { createFileRoute } from "@tanstack/react-router";
import { AppShell } from "@/components/app-shell";
import { PostsView } from "@/components/views/posts";

export const Route = createFileRoute("/posts")({
  component: function PostsPage() {
    return (
      <AppShell title="Posts">
        <PostsView />
      </AppShell>
    );
  },
});
