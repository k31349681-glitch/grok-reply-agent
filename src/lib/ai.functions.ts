import { createServerFn } from "@tanstack/react-start";
import type { ReplyStyle } from "@/lib/types";

const STYLES = ["intelligent", "short", "analytical", "alternative"] as const;

export const generateReply = createServerFn({ method: "POST" })
  .validator((input: unknown) => {
    const data = (input ?? {}) as Record<string, unknown>;
    const post = typeof data.post === "string" ? data.post.trim() : "";
    if (!post) throw new Error("Missing post");
    const style = STYLES.includes(data.style as ReplyStyle) ? (data.style as ReplyStyle) : "intelligent";
    return {
      post: post.slice(0, 2000),
      context: typeof data.context === "string" ? data.context.slice(0, 2000) : "",
      author: typeof data.author === "string" ? data.author.slice(0, 80) : "them",
      style,
    };
  })
  .handler(async ({ data }) => {
    const { draftReply } = await import("@/server/draft-reply.server");
    return draftReply(data);
  });
