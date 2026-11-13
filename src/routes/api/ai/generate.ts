import { createFileRoute } from "@tanstack/react-router";
import { draftReply, parseDraftInput } from "@/server/draft-reply.server";

export const Route = createFileRoute("/api/ai/generate")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        try {
          const input = parseDraftInput(await request.json());
          return Response.json(await draftReply(input));
        } catch (error) {
          const message = error instanceof Error ? error.message : "Could not draft a reply";
          return Response.json({ ok: false, error: message }, { status: 400 });
        }
      },
    },
  },
});
