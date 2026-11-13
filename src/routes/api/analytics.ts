import { createFileRoute } from "@tanstack/react-router";
import { authCookie, authorized, xErrorMessage, xFetch } from "@/server/x-oauth.server";

const SUPPORTED = [
  "followers_count and following_count on the authorized user",
  "mention timeline via GET /2/users/:id/mentions",
  "public_metrics on posts this app published (likes, reposts, replies)",
  "follower and following lists via the authorized follows endpoints",
];

const OMITTED = [
  "The full native X notification tab — the API does not expose it",
  "Automated likes, follows, and unfollows — those stay manual",
  "Impressions, unless a later call returns non_public_metrics for an owned post",
];

type XUsers = {
  data?: {
    id: string;
    name?: string;
    username?: string;
    public_metrics?: { followers_count?: number };
  }[];
};

export const Route = createFileRoute("/api/analytics")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const resource = new URL(request.url).searchParams.get("resource");
        if (resource !== "followers" && resource !== "following") {
          return Response.json({ ok: true, supported: SUPPORTED, omitted: OMITTED });
        }

        const gate = await authorized(request);
        if (!gate.auth) {
          return Response.json(
            { ok: false, error: "Connect X with OAuth before reading follower lists." },
            { status: 401, headers: gate.headers },
          );
        }

        let userId = gate.auth.userId;
        const headers = gate.headers;
        if (!userId) {
          const me = await xFetch(gate.auth, "/users/me");
          const id = (me.json as { data?: { id?: string } }).data?.id;
          if (!me.res.ok || !id) {
            return Response.json(
              { ok: false, error: xErrorMessage(me.json, me.res.status) },
              { status: me.res.status, headers },
            );
          }
          userId = id;
          headers.append("Set-Cookie", await authCookie({ ...gate.auth, userId }));
        }

        const path =
          resource === "following"
            ? `/users/${userId}/following?max_results=10&user.fields=public_metrics,username,name`
            : `/users/${userId}/followers?max_results=10&user.fields=public_metrics,username,name`;
        const list = await xFetch(gate.auth, path);
        if (!list.res.ok) {
          return Response.json(
            { ok: false, error: xErrorMessage(list.json, list.res.status) },
            { status: list.res.status, headers },
          );
        }
        const people = ((list.json as XUsers).data ?? []).map((user) => ({
          id: user.id,
          name: user.name ?? user.username ?? "Account",
          handle: user.username ?? "unknown",
          followers: user.public_metrics?.followers_count ?? 0,
          relation: resource === "following" ? "following" : "follows_you",
          intent: null,
          liked: false,
        }));
        return Response.json({ ok: true, resource, people }, { headers });
      },
    },
  },
});
