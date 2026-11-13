import { createFileRoute } from "@tanstack/react-router";
import { beginAuth, clearAuthHeaders, missingXConfig } from "@/server/x-oauth.server";

export const Route = createFileRoute("/api/x/auth")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const url = new URL(request.url);
        if (url.searchParams.get("check") === "1") {
          const missing = missingXConfig();
          return Response.json({ configured: missing.length === 0, missing });
        }
        const started = await beginAuth();
        if (!started.ok) {
          return Response.json(
            {
              ok: false,
              error: "X OAuth is not configured. Tokens are not stored until every required credential is set.",
              missing: started.missing,
            },
            { status: 503 },
          );
        }
        return new Response(null, { status: 302, headers: started.headers });
      },
      DELETE: async () => {
        return Response.json({ ok: true, disconnected: true }, { headers: clearAuthHeaders() });
      },
    },
  },
});
