import type { ReplyStyle } from "@/lib/types";

export function clampReply(text: string) {
  const clean = text
    .replace(/^["'`]+|["'`]+$/g, "")
    .replace(/^reply:\s*/i, "")
    .trim();
  if (clean.length <= 280) return clean;
  return `${clean.slice(0, 277).trimEnd()}…`;
}

export function fallbackReply(input: {
  post: string;
  author: string;
  style: ReplyStyle;
}) {
  const handle = input.author.replace(/^@/, "");
  const clip = input.post.replace(/\s+/g, " ").trim();
  const shortClip = clip.length > 90 ? `${clip.slice(0, 87).trimEnd()}…` : clip;

  const text = (() => {
    switch (input.style) {
      case "short":
        return `@${handle} The useful version of this is narrower: say less, decide faster, and leave the recap bots to the timeline.`;
      case "analytical":
        return `The bottleneck is not the wording. If “${shortClip}” is right, the constraint is judgment — what the agent refuses to answer.`;
      case "alternative":
        return `Counterpoint, @${handle}: this treats posting as the product. Distribution and timing still do more work than a sharper sentence.`;
      default:
        return `@${handle} A reply agent is only useful when it knows what to skip. ${shortClip}`;
    }
  })();

  return clampReply(text);
}
