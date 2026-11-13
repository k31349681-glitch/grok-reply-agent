import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/api/cron/monitor")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const secret = process.env.CRON_SECRET;
        const header = request.headers.get("authorization") ?? "";
        if (!secret || header !== `Bearer ${secret}`) {
          return Response.json({ ok: false, error: "Unauthorized" }, { status: 401 });
        }
        return Response.json({
          ok: true,
          ranAt: new Date().toISOString(),
          posted: false,
          liked: false,
          followed: false,
          detail:
            "Authenticated monitor tick. This job does not post, like, or follow. Mention sync is per connected user and uses only official X API v2 endpoints. The native notification tab is not requested because the API does not expose it.",
        });
      },
    },
  },
});
