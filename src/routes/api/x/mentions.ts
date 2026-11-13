import { createFileRoute } from "@tanstack/react-router";
import { authCookie, authorized, xErrorMessage, xFetch, type StoredAuth } from "@/server/x-oauth.server";

type XUser = {
  data?: {
    id: string;
    name?: string;
    username?: string;
    public_metrics?: { followers_count?: number; following_count?: number };
  };
};

type XTweets = {
  data?: { id: string; text: string; author_id?: string; created_at?: string; conversation_id?: string }[];
  includes?: { users?: { id: string; name?: string; username?: string }[] };
  meta?: { result_count?: number };
};

async function loadMe(auth: StoredAuth) {
  const { res, json } = await xFetch(
    auth,
    "/users/me?user.fields=public_metrics,username,name",
  );
  return { res, json: json as XUser };
}

export const Route = createFileRoute("/api/x/mentions")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const gate = await authorized(request);
        const headers = gate.headers;
        const probe = new URL(request.url).searchParams.get("probe") === "1";
        if (!gate.auth) {
          return Response.json(
            {
              ok: false,
              account: null,
              expired: gate.expired,
              error: gate.expired
                ? "X credentials expired. Reconnect the account."
                : "No X account is connected. The native notification tab is not available through the API.",
            },
            { status: probe ? 200 : 401, headers },
          );
        }

        const me = await loadMe(gate.auth);
        if (me.res.status === 429) {
          return Response.json(
            { ok: false, error: "X rate limit reached. Sync again after the window resets." },
            { status: 429, headers },
          );
        }
        if (!me.res.ok || !me.json.data?.id) {
          return Response.json(
            { ok: false, error: xErrorMessage(me.json, me.res.status) },
            { status: me.res.status, headers },
          );
        }

        const auth = { ...gate.auth, userId: me.json.data.id };
        headers.append("Set-Cookie", await authCookie(auth));

        const account = {
          name: me.json.data.name ?? me.json.data.username ?? "X account",
          handle: me.json.data.username ?? "",
          followers: me.json.data.public_metrics?.followers_count ?? 0,
          following: me.json.data.public_metrics?.following_count ?? 0,
          userId: me.json.data.id,
        };

        const probeOnly = new URL(request.url).searchParams.get("probe") === "1";
        if (probeOnly) {
          return Response.json({ ok: true, account, mentions: [] }, { headers });
        }

        const mentions = await xFetch(
          auth,
          `/users/${me.json.data.id}/mentions?max_results=10&tweet.fields=created_at,conversation_id,public_metrics&expansions=author_id&user.fields=name,username`,
        );
        if (mentions.res.status === 429) {
          return Response.json(
            { ok: false, account, error: "X rate limit reached on mentions." },
            { status: 429, headers },
          );
        }
        if (!mentions.res.ok) {
          return Response.json(
            { ok: false, account, error: xErrorMessage(mentions.json, mentions.res.status) },
            { status: mentions.res.status, headers },
          );
        }

        const payload = mentions.json as XTweets;
        const users = new Map((payload.includes?.users ?? []).map((user) => [user.id, user]));
        const items = (payload.data ?? []).map((tweet) => {
          const user = tweet.author_id ? users.get(tweet.author_id) : undefined;
          return {
            id: tweet.id,
            kind: "mention" as const,
            authorName: user?.name ?? "Unknown",
            authorHandle: user?.username ?? "unknown",
            text: tweet.text,
            createdAt: tweet.created_at ?? new Date().toISOString(),
            context: tweet.conversation_id
              ? `Conversation ${tweet.conversation_id}. X did not return the full parent thread on this call.`
              : "Mention returned by GET /2/users/:id/mentions.",
            read: false,
            source: "x" as const,
          };
        });

        return Response.json(
          {
            ok: true,
            account,
            mentions: items,
            note: "Mentions and replies exposed by X API v2. This is not the full native notification tab.",
          },
          { headers },
        );
      },
    },
  },
});
