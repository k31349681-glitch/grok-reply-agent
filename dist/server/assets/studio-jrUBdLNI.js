import { i as fallbackReply } from "./draft-reply.server-DccYMqXl.js";
import { n as TSS_SERVER_FUNCTION, r as getServerFnById, t as createServerFn } from "../server.js";
import { d as Button, f as cn, i as activeDraft, n as Stamp, o as useAgent, s as COSTS, t as AppShell } from "./app-shell-BZgXozVv.js";
import { t as ConfirmDialog } from "./confirm-dialog-BG44qMBH.js";
import { useEffect, useState } from "react";
import { jsx, jsxs } from "react/jsx-runtime";
import { toast } from "sonner";
//#region node_modules/@tanstack/start-server-core/dist/esm/createSsrRpc.js
var createSsrRpc = (functionId) => {
	const url = "/_serverFn/" + functionId;
	const serverFnMeta = { id: functionId };
	const fn = async (...args) => {
		return (await getServerFnById(functionId, { origin: "server" }))(...args);
	};
	return Object.assign(fn, {
		url,
		serverFnMeta,
		[TSS_SERVER_FUNCTION]: true
	});
};
//#endregion
//#region src/lib/ai.functions.ts
var STYLES$1 = [
	"intelligent",
	"short",
	"analytical",
	"alternative"
];
var generateReply = createServerFn({ method: "POST" }).validator((input) => {
	const data = input ?? {};
	const post = typeof data.post === "string" ? data.post.trim() : "";
	if (!post) throw new Error("Missing post");
	const style = STYLES$1.includes(data.style) ? data.style : "intelligent";
	return {
		post: post.slice(0, 2e3),
		context: typeof data.context === "string" ? data.context.slice(0, 2e3) : "",
		author: typeof data.author === "string" ? data.author.slice(0, 80) : "them",
		style
	};
}).handler(createSsrRpc("428598bd574d77a17a760f32df255b873af598093212895be4024eb0f2c9bf4f"));
//#endregion
//#region src/lib/types.ts
var STYLES = [
	"intelligent",
	"short",
	"analytical",
	"alternative"
];
//#endregion
//#region src/components/views/studio.tsx
var LABELS = {
	intelligent: "Intelligent",
	short: "Short",
	analytical: "Analytical",
	alternative: "Alternative"
};
function StudioView() {
	const notices = useAgent((state) => state.notices);
	const selectedId = useAgent((state) => state.selectedNoticeId);
	const draft = useAgent((state) => selectedId ? activeDraft(state, selectedId) : null);
	const epoch = useAgent((state) => state.epoch);
	const account = useAgent((state) => state.account);
	const selectNotice = useAgent((state) => state.selectNotice);
	const [style, setStyle] = useState("intelligent");
	const [text, setText] = useState(draft?.text ?? "");
	const [busy, setBusy] = useState(false);
	const [confirm, setConfirm] = useState(false);
	const notice = notices.find((item) => item.id === selectedId) ?? notices[0] ?? null;
	useEffect(() => {
		const current = notice ? activeDraft(useAgent.getState(), notice.id) : null;
		setText(current?.text ?? "");
		if (current?.style) setStyle(current.style);
	}, [notice?.id, epoch]);
	async function generate() {
		if (!notice) return;
		const state = useAgent.getState();
		const gate = state.canSpend(COSTS.ai);
		if (!gate.ok) {
			toast.error(gate.reason === "budget" ? "Budget limit reached. Generation is paused." : "Connect a workspace first.");
			return;
		}
		setBusy(true);
		try {
			const result = await generateReply({ data: {
				post: notice.text,
				context: notice.context,
				author: notice.authorHandle,
				style
			} });
			state.saveDraft({
				noticeId: notice.id,
				style,
				text: result.text,
				source: result.provider === "template" ? "template" : "ai"
			});
			setText(result.text);
			state.logUsage({
				kind: "ai",
				detail: result.provider === "template" ? "Local template. No model call succeeded." : `Draft via ${result.provider}`,
				usd: result.provider === "template" ? 0 : COSTS.ai,
				cached: false
			});
			toast(result.provider === "template" ? "Drafted from the local template." : "Draft ready. Nothing has been posted.");
		} catch {
			const fallback = fallbackReply({
				post: notice.text,
				author: notice.authorHandle,
				style
			});
			useAgent.getState().saveDraft({
				noticeId: notice.id,
				style,
				text: fallback,
				source: "template"
			});
			setText(fallback);
			toast("Model unavailable. Used the local template.");
		} finally {
			setBusy(false);
		}
	}
	function edit(value) {
		setText(value);
		if (!notice) return;
		const current = activeDraft(useAgent.getState(), notice.id);
		if (!current || current.status === "published") return;
		useAgent.getState().editDraft(current.id, value);
	}
	async function copy() {
		if (!text.trim()) return;
		try {
			await navigator.clipboard.writeText(text);
			toast("Copied");
		} catch {
			toast.error("Could not copy");
		}
	}
	async function publish() {
		if (!draft || !notice) return;
		if (account.status !== "live" || !/^\d{5,}$/.test(notice.id)) {
			useAgent.getState().publishDraft(draft.id);
			setConfirm(false);
			toast("Marked published in this workspace. It was not sent to X.");
			return;
		}
		setBusy(true);
		try {
			const res = await fetch("/api/x/publish", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({
					text,
					confirm: true,
					replyTo: notice.id
				})
			});
			const data = await res.json();
			if (!res.ok || !data.ok) {
				toast.error(data.error || "X did not accept the reply");
				return;
			}
			useAgent.getState().publishDraft(draft.id);
			useAgent.getState().logUsage({
				kind: "x_write",
				detail: `Reply ${data.id} published on X`,
				usd: COSTS.publish,
				cached: false
			});
			toast("Published to X");
			setConfirm(false);
		} catch {
			toast.error("Publish failed");
		} finally {
			setBusy(false);
		}
	}
	if (!notice || account.status === "disconnected") return /* @__PURE__ */ jsx("p", {
		className: "text-sm text-muted",
		children: "Connect a workspace and pick a mention before drafting."
	});
	const locked = draft?.status === "published";
	return /* @__PURE__ */ jsxs("div", {
		className: "grid gap-6 lg:grid-cols-[18rem_minmax(0,1fr)]",
		children: [
			/* @__PURE__ */ jsx("ul", {
				className: "divide-y divide-line border-y border-line lg:border lg:rounded-lg lg:px-2",
				children: notices.map((item) => /* @__PURE__ */ jsx("li", { children: /* @__PURE__ */ jsxs("button", {
					type: "button",
					onClick: () => selectNotice(item.id),
					className: cn("w-full px-2 py-3 text-left", item.id === notice.id ? "text-fg" : "text-muted"),
					children: [/* @__PURE__ */ jsxs("span", {
						className: "block text-sm font-medium",
						children: ["@", item.authorHandle]
					}), /* @__PURE__ */ jsx("span", {
						className: "mt-1 block text-sm",
						children: item.text
					})]
				}) }, item.id))
			}),
			/* @__PURE__ */ jsxs("div", {
				className: "space-y-4",
				children: [
					/* @__PURE__ */ jsxs("article", {
						className: "rounded-lg border border-line bg-surface p-4",
						children: [
							/* @__PURE__ */ jsxs("div", {
								className: "flex flex-wrap items-center gap-2 text-sm",
								children: [
									/* @__PURE__ */ jsx("span", {
										className: "font-medium",
										children: notice.authorName
									}),
									/* @__PURE__ */ jsxs("span", {
										className: "text-muted",
										children: ["@", notice.authorHandle]
									}),
									/* @__PURE__ */ jsx(Stamp, { iso: notice.createdAt })
								]
							}),
							/* @__PURE__ */ jsx("p", {
								className: "mt-3 text-base",
								children: notice.text
							}),
							/* @__PURE__ */ jsx("p", {
								className: "mt-3 text-xs text-muted",
								children: notice.context
							})
						]
					}),
					/* @__PURE__ */ jsx("div", {
						className: "flex flex-wrap gap-2",
						children: STYLES.map((item) => /* @__PURE__ */ jsx("button", {
							type: "button",
							onClick: () => setStyle(item),
							className: cn("min-h-11 rounded-lg px-3 text-sm", style === item ? "bg-accent text-accent-fg" : "bg-surface text-muted"),
							children: LABELS[item]
						}, item))
					}),
					/* @__PURE__ */ jsxs("label", {
						className: "block",
						children: [/* @__PURE__ */ jsx("span", {
							className: "sr-only",
							children: "Reply draft"
						}), /* @__PURE__ */ jsx("textarea", {
							value: text,
							disabled: locked,
							onChange: (event) => edit(event.target.value),
							rows: 5,
							placeholder: "Generate a draft, then edit it. It stays unsent until you approve and confirm.",
							className: "w-full resize-y rounded-lg border border-line bg-surface px-3 py-3 text-sm text-fg outline-none"
						})]
					}),
					/* @__PURE__ */ jsxs("div", {
						className: "flex flex-wrap items-center justify-between gap-3",
						children: [/* @__PURE__ */ jsxs("p", {
							className: cn("text-xs tabular-nums", text.length > 280 ? "text-accent" : "text-muted"),
							children: [
								text.length,
								"/280",
								draft ? ` · ${draft.status}` : " · no draft",
								draft?.source === "edited" ? " · edited" : ""
							]
						}), /* @__PURE__ */ jsxs("div", {
							className: "flex flex-wrap gap-2",
							children: [
								/* @__PURE__ */ jsx(Button, {
									type: "button",
									variant: "primary",
									disabled: busy || locked,
									onClick: () => void generate(),
									children: busy ? "Working" : draft ? "Regenerate" : "Generate"
								}),
								/* @__PURE__ */ jsx(Button, {
									type: "button",
									variant: "outline",
									disabled: !text.trim(),
									onClick: () => void copy(),
									children: "Copy"
								}),
								/* @__PURE__ */ jsx(Button, {
									type: "button",
									variant: "outline",
									disabled: !draft || locked,
									onClick: () => draft && useAgent.getState().setDraftStatus(draft.id, "approved"),
									children: "Approve"
								}),
								/* @__PURE__ */ jsx(Button, {
									type: "button",
									variant: "ghost",
									disabled: !draft || locked,
									onClick: () => draft && useAgent.getState().setDraftStatus(draft.id, "rejected"),
									children: "Reject"
								}),
								/* @__PURE__ */ jsx(Button, {
									type: "button",
									variant: "primary",
									disabled: !draft || draft.status !== "approved" || text.length === 0 || text.length > 280,
									onClick: () => setConfirm(true),
									children: "Publish"
								})
							]
						})]
					}),
					/* @__PURE__ */ jsx("p", {
						className: "text-xs text-muted",
						children: "Default voice is intelligent, natural, authoritative, and concise. Approval does not post. Autonomous replies stay off."
					})
				]
			}),
			/* @__PURE__ */ jsx(ConfirmDialog, {
				open: confirm,
				title: "Publish this reply?",
				body: account.status === "live" && /^\d{5,}$/.test(notice.id) ? "This sends the approved text to X as a reply. You can still cancel." : "This only marks the draft published inside the workspace. It will not be sent to X.",
				confirmLabel: "Publish reply",
				busy,
				onOpenChange: setConfirm,
				onConfirm: () => void publish()
			})
		]
	});
}
//#endregion
//#region src/routes/studio.tsx?tsr-split=component
var SplitComponent = function StudioPage() {
	return /* @__PURE__ */ jsx(AppShell, {
		title: "Replies",
		children: /* @__PURE__ */ jsx(StudioView, {})
	});
};
//#endregion
export { SplitComponent as component };
