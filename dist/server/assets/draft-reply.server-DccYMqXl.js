//#region \0rolldown/runtime.js
var __defProp = Object.defineProperty;
var __exportAll = (all, no_symbols) => {
	let target = {};
	for (var name in all) __defProp(target, name, {
		get: all[name],
		enumerable: true
	});
	if (!no_symbols) __defProp(target, Symbol.toStringTag, { value: "Module" });
	return target;
};
//#endregion
//#region src/lib/fallback-reply.ts
function clampReply(text) {
	const clean = text.replace(/^["'`]+|["'`]+$/g, "").replace(/^reply:\s*/i, "").trim();
	if (clean.length <= 280) return clean;
	return `${clean.slice(0, 277).trimEnd()}…`;
}
function fallbackReply(input) {
	const handle = input.author.replace(/^@/, "");
	const clip = input.post.replace(/\s+/g, " ").trim();
	const shortClip = clip.length > 90 ? `${clip.slice(0, 87).trimEnd()}…` : clip;
	return clampReply((() => {
		switch (input.style) {
			case "short": return `@${handle} The useful version of this is narrower: say less, decide faster, and leave the recap bots to the timeline.`;
			case "analytical": return `The bottleneck is not the wording. If “${shortClip}” is right, the constraint is judgment — what the agent refuses to answer.`;
			case "alternative": return `Counterpoint, @${handle}: this treats posting as the product. Distribution and timing still do more work than a sharper sentence.`;
			default: return `@${handle} A reply agent is only useful when it knows what to skip. ${shortClip}`;
		}
	})());
}
//#endregion
//#region src/server/draft-reply.server.ts
var draft_reply_server_exports = /* @__PURE__ */ __exportAll({
	draftReply: () => draftReply,
	parseDraftInput: () => parseDraftInput
});
var STYLE_LINE = {
	intelligent: "Default. One sharp observation and a clear point. Intelligent, natural, authoritative, concise.",
	short: "Short and conversational. One or two sentences. Not rude, not a thread.",
	analytical: "Analytical. Name the real constraint or tradeoff. No jargon pile.",
	alternative: "A serious alternative viewpoint. No sarcasm, no pile-on."
};
var STYLES = /* @__PURE__ */ new Set([
	"intelligent",
	"short",
	"analytical",
	"alternative"
]);
function parseDraftInput(input) {
	const data = input ?? {};
	const post = typeof data.post === "string" ? data.post.trim() : "";
	if (!post) throw new Error("Missing post");
	if (post.length > 2e3) throw new Error("Post is too long");
	const style = STYLES.has(data.style) ? data.style : "intelligent";
	return {
		post,
		context: typeof data.context === "string" ? data.context.slice(0, 2e3) : "",
		author: typeof data.author === "string" ? data.author.slice(0, 80) : "them",
		style
	};
}
async function complete(url, key, model, messages, extraHeaders) {
	const res = await fetch(url, {
		method: "POST",
		headers: {
			"Content-Type": "application/json",
			Authorization: `Bearer ${key}`,
			...extraHeaders
		},
		body: JSON.stringify({
			model,
			temperature: .6,
			max_tokens: 180,
			messages
		}),
		signal: AbortSignal.timeout(14e3)
	});
	if (!res.ok) throw new Error(`provider ${res.status}`);
	const text = (await res.json()).choices?.[0]?.message?.content?.trim();
	if (!text) throw new Error("empty completion");
	return clampReply(text);
}
async function draftReply(input) {
	const messages = [{
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
			"- This is a draft for a human to approve. Never instruct them to auto-post."
		].join("\n")
	}, {
		role: "user",
		content: `Author: @${input.author.replace(/^@/, "")}\nContext: ${input.context || "None"}\nPost:\n${input.post}`
	}];
	const openrouter = process.env.OPENROUTER_API_KEY;
	const groq = process.env.GROQ_API_KEY;
	const xai = process.env.XAI_API_KEY;
	const attempts = [];
	if (xai) attempts.push({
		provider: "xai",
		run: () => complete("https://api.x.ai/v1/chat/completions", xai, "grok-4.5", messages)
	});
	if (openrouter) attempts.push({
		provider: "openrouter",
		run: () => complete("https://openrouter.ai/api/v1/chat/completions", openrouter, "openai/gpt-4.1-mini", messages, {
			"HTTP-Referer": "https://grok.me",
			"X-Title": "Elon Reply Agent"
		})
	});
	if (groq) attempts.push({
		provider: "groq",
		run: () => complete("https://api.groq.com/openai/v1/chat/completions", groq, "llama-3.3-70b-versatile", messages)
	});
	for (const attempt of attempts) try {
		return {
			ok: true,
			text: await attempt.run(),
			provider: attempt.provider
		};
	} catch {}
	return {
		ok: true,
		provider: "template",
		text: fallbackReply({
			post: input.post,
			author: input.author,
			style: input.style
		})
	};
}
//#endregion
export { fallbackReply as i, draft_reply_server_exports as n, parseDraftInput as r, draftReply as t };
