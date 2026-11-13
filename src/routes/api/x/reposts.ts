import { createFileRoute } from "@tanstack/react-router";
import { authorized, xErrorMessage, xFetch } from "@/server/x-oauth.server";

type UserResponse = {
  data?: { id: string; name?: string; username?: string };
};

type TimelineTweet = {
  id: string;
  text: string;
  author_id?: string;
  created_at?: string;
  referenced_tweets?: { type: string; id: string }[];
};

type TimelineResponse = {
  data?: TimelineTweet[];
  includes?: { users?: { id: string; name?: string; username?: string }[] };
};

function cleanHandle(value: unknown) {
  const handle = typeof value === "string" ? value.trim().replace(/^@+/, "") : "";
  if (!/^[A-Za-z0-9_]{1,15}$/.test(handle)) throw new Error("Enter a valid X handle, such as @elonmusk.");
  return handle;
}

export const Route = createFileRoute("/api/x/reposts")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const gate = await authorized(request);
        if (!gate.auth) {
          return Response.json(
            { ok: false, error: "Connect X before searching public reposts." },
            { status: 401, headers: gate.headers },
          );
        }

        try {
          const body = (await request.json().catch(() => ({}))) as { handle?: unknown };
          const handle = cleanHandle(body.handle);
          const user = await xFetch(
            gate.auth,
            `/users/by/username/${encodeURIComponent(handle)}?user.fields=name,username`,
          );
          if (!user.res.ok || !(user.json as UserResponse).data?.id) {
            return Response.json(
              { ok: false, error: xErrorMessage(user.json, user.res.status) },
              { status: user.res.status, headers: gate.headers },
            );
          }

          const userData = (user.json as UserResponse).data!;
          const timeline = await xFetch(
            gate.auth,
            `/users/${userData.id}/timelines/reverse_chronological?max_results=100&tweet.fields=created_at,referenced_tweets,author_id&expansions=author_id&user.fields=name,username`,
          );
          if (!timeline.res.ok) {
            return Response.json(
              { ok: false, error: xErrorMessage(timeline.json, timeline.res.status) },
              { status: timeline.res.status, headers: gate.headers },
            );
          }

          const payload = timeline.json as TimelineResponse;
          const users = new Map((payload.includes?.users ?? []).map((item) => [item.id, item]));
          const reposts = (payload.data ?? [])
            .map((tweet) => {
              const repost = tweet.referenced_tweets?.find((item) => item.type === "retweeted");
              if (!repost) return null;
              const author = tweet.author_id ? users.get(tweet.author_id) : undefined;
              return {
                id: tweet.id,
                text: tweet.text,
                createdAt: tweet.created_at ?? new Date().toISOString(),
                originalAuthorName: author?.name ?? "Unknown author",
                originalAuthorHandle: author?.username ?? "unknown",
                originalTweetId: repost.id,
                targetHandle: userData.username ?? handle,
                url: `https://x.com/${author?.username ?? "i"}/status/${repost.id}`,
              };
            })
            .filter((item): item is NonNullable<typeof item> => Boolean(item))
            .slice(0, 10);

          return Response.json(
            {
              ok: true,
              target: {
                id: userData.id,
                name: userData.name ?? userData.username ?? handle,
                handle: userData.username ?? handle,
              },
              reposts,
              note: "X returned repost entries from the target user's reverse-chronological timeline. No post was created.",
            },
            { headers: gate.headers },
          );
        } catch (error) {
          const message = error instanceof Error ? error.message : "Could not search X";
          return Response.json({ ok: false, error: message }, { status: 400, headers: gate.headers });
        }
      },
    },
  },
});
