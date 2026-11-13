import { clampReply, fallbackReply } from "@/lib/fallback-reply";
import type { ReplyStyle } from "@/lib/types";

export type DraftInput = {
  post: string;
  context: string;
  author: string;
  style: ReplyStyle;
};

export type DraftOutput = {
  ok: true;
  text: string;
  provider: "openrouter" | "groq" | "xai" | "template";
};

const STYLE_LINE: Record<ReplyStyle, string> = {
  intelligent: "Default. One sharp observation and a clear point. Intelligent, natural, authoritative, concise.",
  short: "Short and conversational. One or two sentences. Not rude, not a thread.",
  analytical: "Analytical. Name the real constraint or tradeoff. No jargon pile.",
  alternative: "A serious alternative viewpoint. No sarcasm, no pile-on.",
};

const STYLES = new Set<ReplyStyle>(["intelligent", "short", "analytical", "alternative"]);

export function parseDraftInput(input: unknown): DraftInput {
  const data = (input ?? {}) as Record<string, unknown>;
  const post = typeof data.post === "string" ? data.post.trim() : "";
  if (!post) throw new Error("Missing post");
  if (post.length > 2000) throw new Error("Post is too long");
  const style = STYLES.has(data.style as ReplyStyle) ? (data.style as ReplyStyle) : "intelligent";
  return {
    post,
    context: typeof data.context === "string" ? data.context.slice(0, 2000) : "",
    author: typeof data.author === "string" ? data.author.slice(0, 80) : "them",
    style,
  };
}

async function complete(url: string, key: string, model: string, messages: { role: string; content: string }[], extraHeaders?: Record<string, string>) {
  const res = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${key}`,
      ...extraHeaders,
    },
    body: JSON.stringify({
      model,
      temperature: 0.6,
      max_tokens: 180,
      messages,
    }),
    signal: AbortSignal.timeout(14000),
  });
  if (!res.ok) {
    throw new Error(`provider ${res.status}`);
  }
  const body = (await res.json()) as { choices?: { message?: { content?: string } }[] };
  const text = body.choices?.[0]?.message?.content?.trim();
  if (!text) throw new Error("empty completion");
  return clampReply(text);
}

export async function draftReply(input: DraftInput): Promise<DraftOutput> {
  const messages = [
    {
      role: "system",
      content: [
        "You write a single public reply for the account owner.",
        `Style: ${STYLE_LINE[input.style]}`,
        "Rules:",
        "- Output only the reply text. No quotes, labels, or hashtag spam.",
        "- Stay under 270 characters.",
        "- Do not pretend the reply has already been posted.",
        "- Do not claim to be Elon Musk, Grok, or any other real person.",
        "- Do not invent personal facts about the other author.",
        "- If the post is hostile, stay calm and specific.",
        "- This is a draft for a human to approve. Never instruct them to auto-post.",
      ].join("\n"),
    },
    {
      role: "user",
      content: `Author: @${input.author.replace(/^@/, "")}\nContext: ${input.context || "None"}\nPost:\n${input.post}`,
    },
  ];

  const openrouter = process.env.OPENROUTER_API_KEY;
  const groq = process.env.GROQ_API_KEY;
  const xai = process.env.XAI_API_KEY;

  const attempts: { provider: DraftOutput["provider"]; run: () => Promise<string> }[] = [];
  if (xai) {
    attempts.push({
      provider: "xai",
      run: () => complete("https://api.x.ai/v1/chat/completions", xai, "grok-4.5", messages),
    });
  }
  if (openrouter) {
    attempts.push({
      provider: "openrouter",
      run: () =>
        complete("https://openrouter.ai/api/v1/chat/completions", openrouter, "openai/gpt-4.1-mini", messages, {
          "HTTP-Referer": "https://grok.me",
          "X-Title": "Elon Reply Agent",
        }),
    });
  }
  if (groq) {
    attempts.push({
      provider: "groq",
      run: () =>
        complete("https://api.groq.com/openai/v1/chat/completions", groq, "llama-3.3-70b-versatile", messages),
    });
  }

  for (const attempt of attempts) {
    try {
      const text = await attempt.run();
      return { ok: true, text, provider: attempt.provider };
    } catch {
      // Try the next configured provider. Do not retry the same one.
    }
  }

  return {
    ok: true,
    provider: "template",
    text: fallbackReply({ post: input.post, author: input.author, style: input.style }),
  };
}
