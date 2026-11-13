import { createFileRoute } from "@tanstack/react-router";
import { finishAuth, htmlPage } from "@/server/x-oauth.server";

export const Route = createFileRoute("/api/x/callback")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        try {
          const headers = await finishAuth(request);
          return new Response(null, { status: 302, headers });
        } catch (error) {
          const message = error instanceof Error ? error.message : "X connection failed";
          return htmlPage("X connection failed", message, 400);
        }
      },
    },
  },
});
