import { createFileRoute } from "@tanstack/react-router";
import type { ResearchDraftPair, ResearchPost } from "@/lib/research";

function clamp(text: string) {
  return text.replace(/^\s*(reply|quote)\s*:\s*/i, "").trim().slice(0, 280);
}

function parsePosts(input: unknown): ResearchPost[] {
  if (!Array.isArray(input) || input.length === 0 || input.length > 10) throw new Error("Select between 1 and 10 reposts.");
  return input.map((item) => {
    const value = (item ?? {}) as Record<string, unknown>;
    if (
      typeof value.id !== "string" ||
      typeof value.text !== "string" ||
      typeof value.originalTweetId !== "string" ||
      typeof value.originalAuthorHandle !== "string"
    ) {
      throw new Error("Each repost must include its X post data.");
    }
    return {
      id: value.id,
      text: value.text.slice(0, 4000),
      createdAt: typeof value.createdAt === "string" ? value.createdAt : "",
      originalAuthorName: typeof value.originalAuthorName === "string" ? value.originalAuthorName : "Unknown author",
      originalAuthorHandle: value.originalAuthorHandle,
      originalTweetId: value.originalTweetId,
      targetHandle: typeof value.targetHandle === "string" ? value.targetHandle : "",
      url: typeof value.url === "string" ? value.url : "",
    };
  });
}

export const Route = createFileRoute("/api/ai/repost-drafts")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        try {
          const body = (await request.json().catch(() => ({}))) as { instruction?: unknown; posts?: unknown };
          const instruction = typeof body.instruction === "string" ? body.instruction.trim().slice(0, 2000) : "";
          const posts = parsePosts(body.posts);
          const key = process.env.OPENROUTER_API_KEY;
          if (!key) return Response.json({ ok: false, error: "OPENROUTER_API_KEY is not configured." }, { status: 503 });

          const prompt = [
            "Create review-only social drafts for the following X reposts.",
            instruction ? `The account owner's instruction is: ${instruction}` : "Use a thoughtful, specific, non-harassing tone.",
            "For every item, produce exactly one reply and one quote-post caption.",
            "Reply is a direct response to the original post. Quote is standalone text that adds context when sharing the original post.",
            "Never claim the draft was posted. Do not impersonate a real person. Do not use hashtag spam.",
            "Keep each draft at or below 280 characters. Return JSON only as an object with a drafts array; each item must contain postId, reply, and quote.",
            JSON.stringify(posts.map((post) => ({
              postId: post.id,
              originalPostId: post.originalTweetId,
              author: `@${post.originalAuthorHandle}`,
              text: post.text,
            }))),
          ].join("\n\n");

          const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${key}`,
              "HTTP-Referer": "https://grok-reply-agent.netlify.app",
              "X-Title": "Elon Reply Agent",
            },
            body: JSON.stringify({
              model: "openai/gpt-4.1-mini",
              temperature: 0.6,
              max_tokens: 3200,
              response_format: { type: "json_object" },
              messages: [
                { role: "system", content: "You are a careful drafting assistant. Output valid JSON only." },
                { role: "user", content: prompt },
              ],
            }),
            signal: AbortSignal.timeout(30000),
          });
          const providerBody = (await response.json().catch(() => ({}))) as {
            choices?: { message?: { content?: string } }[];
            error?: { message?: string };
          };
          if (!response.ok) throw new Error(providerBody.error?.message || `OpenRouter returned ${response.status}`);
          const content = providerBody.choices?.[0]?.message?.content?.trim();
          if (!content) throw new Error("OpenRouter returned no drafts.");
          const parsed = JSON.parse(content) as { drafts?: unknown };
          const rows = Array.isArray(parsed) ? parsed : parsed.drafts;
          if (!Array.isArray(rows)) throw new Error("OpenRouter returned an unexpected draft format.");

          const byId = new Map(posts.map((post) => [post.id, post]));
          const drafts: ResearchDraftPair[] = rows
            .map((item) => {
              const row = (item ?? {}) as Record<string, unknown>;
              const postId = typeof row.postId === "string" ? row.postId : "";
              if (!byId.has(postId) || typeof row.reply !== "string" || typeof row.quote !== "string") return null;
              return { postId, reply: clamp(row.reply), quote: clamp(row.quote), provider: "openrouter" as const };
            })
            .filter((item): item is ResearchDraftPair => Boolean(item));
          if (drafts.length !== posts.length) throw new Error("OpenRouter did not return one reply and quote for every repost.");
          return Response.json({ ok: true, drafts });
        } catch (error) {
          const message = error instanceof Error ? error.message : "Could not draft repost responses";
          return Response.json({ ok: false, error: message }, { status: 400 });
        }
      },
    },
  },
});
