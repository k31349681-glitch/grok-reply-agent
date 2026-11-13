import { createFileRoute } from "@tanstack/react-router";
import { authorized } from "@/server/x-oauth.server";

export const Route = createFileRoute("/api/x/publish")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const body = (await request.json().catch(() => null)) as {
          text?: unknown;
          confirm?: unknown;
          replyTo?: unknown;
        } | null;
        if (!body || body.confirm !== true) {
          return Response.json(
            { ok: false, error: "Publishing requires an explicit confirmation." },
            { status: 400 },
          );
        }
        if (typeof body.text !== "string" || !body.text.trim()) {
          return Response.json({ ok: false, error: "Write something before publishing." }, { status: 400 });
        }
        if (body.text.length > 280) {
          return Response.json({ ok: false, error: "X posts are limited to 280 characters." }, { status: 400 });
        }

        const gate = await authorized(request);
        if (!gate.auth) {
          return Response.json(
            {
              ok: false,
              localOnly: true,
              error: "No live X token. Nothing was sent. Confirm again after connecting OAuth, or keep it in this workspace.",
            },
            { status: 409, headers: gate.headers },
          );
        }

        const payload: { text: string; reply?: { in_reply_to_tweet_id: string } } = {
          text: body.text.trim(),
        };
        if (typeof body.replyTo === "string" && /^\d{5,}$/.test(body.replyTo)) {
          payload.reply = { in_reply_to_tweet_id: body.replyTo };
        }

        const write = await fetch("https://api.twitter.com/2/tweets", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${gate.auth.access}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify(payload),
          signal: AbortSignal.timeout(12000),
        });
        const json = (await write.json().catch(() => ({}))) as {
          data?: { id?: string };
          detail?: string;
          title?: string;
        };
        if (!write.ok || !json.data?.id) {
          return Response.json(
            { ok: false, error: json.detail || json.title || `X publish failed (${write.status})` },
            { status: write.status || 502, headers: gate.headers },
          );
        }
        return Response.json({ ok: true, id: json.data.id }, { headers: gate.headers });
      },
    },
  },
});
