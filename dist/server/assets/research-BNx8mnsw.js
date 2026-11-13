import { d as Button, n as Stamp, o as useAgent, s as COSTS, t as AppShell } from "./app-shell-BZgXozVv.js";
import { useState } from "react";
import { jsx, jsxs } from "react/jsx-runtime";
import { toast } from "sonner";
//#region src/components/views/research.tsx
function ResearchView() {
	const account = useAgent((state) => state.account);
	const logUsage = useAgent((state) => state.logUsage);
	const [handle, setHandle] = useState("@elonmusk");
	const [instruction, setInstruction] = useState("Find a sharp, respectful angle. Prefer specific observations over generic praise.");
	const [posts, setPosts] = useState([]);
	const [drafts, setDrafts] = useState({});
	const [busy, setBusy] = useState(null);
	const [selected, setSelected] = useState(/* @__PURE__ */ new Set());
	const [target, setTarget] = useState(null);
	async function search() {
		if (account.status !== "live") {
			toast.error("Connect your X account first.");
			return;
		}
		setBusy("search");
		try {
			const res = await fetch("/api/x/reposts", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({ handle })
			});
			const data = await res.json();
			if (!res.ok || !data.ok) throw new Error(data.error || "Could not search X");
			const next = data.reposts ?? [];
			setPosts(next);
			setDrafts({});
			setSelected(new Set(next.map((post) => post.id)));
			setTarget(data.target ?? null);
			toast(next.length ? `${next.length} reposts found.` : "No reposts were found in the returned timeline.");
			logUsage({
				kind: "x_read",
				detail: `Looked up reposts for @${data.target?.handle ?? handle.replace(/^@+/, "")}`,
				usd: COSTS.mention,
				cached: false
			});
		} catch (error) {
			toast.error(error instanceof Error ? error.message : "Search failed");
		} finally {
			setBusy(null);
		}
	}
	async function draftSelected() {
		const chosen = posts.filter((post) => selected.has(post.id));
		if (!chosen.length) {
			toast.error("Select at least one repost.");
			return;
		}
		setBusy("draft");
		try {
			const res = await fetch("/api/ai/repost-drafts", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({
					instruction,
					posts: chosen
				})
			});
			const data = await res.json();
			if (!res.ok || !data.ok) throw new Error(data.error || "Draft generation failed");
			setDrafts(Object.fromEntries((data.drafts ?? []).map((draft) => [draft.postId, draft])));
			logUsage({
				kind: "ai",
				detail: `Drafted reply and quote options for ${chosen.length} X reposts via OpenRouter`,
				usd: COSTS.ai,
				cached: false
			});
			toast("Drafts ready. Nothing was posted to X.");
		} catch (error) {
			toast.error(error instanceof Error ? error.message : "Draft generation failed");
		} finally {
			setBusy(null);
		}
	}
	async function copy(text) {
		try {
			await navigator.clipboard.writeText(text);
			toast("Copied to clipboard");
		} catch {
			toast.error("Could not copy");
		}
	}
	function toggle(id) {
		setSelected((current) => {
			const next = new Set(current);
			if (next.has(id)) next.delete(id);
			else next.add(id);
			return next;
		});
	}
	if (account.status !== "live") return /* @__PURE__ */ jsx("p", {
		className: "text-sm text-muted",
		children: "Connect X first, then search any public handle for reposts."
	});
	return /* @__PURE__ */ jsxs("div", {
		className: "space-y-6",
		children: [/* @__PURE__ */ jsxs("div", {
			className: "rounded-lg border border-line bg-surface p-5",
			children: [
				/* @__PURE__ */ jsx("h2", {
					className: "text-lg font-semibold",
					children: "Repost research"
				}),
				/* @__PURE__ */ jsx("p", {
					className: "mt-1 max-w-2xl text-sm text-muted",
					children: "Look up a public handle, review up to 10 reposts from its timeline, and ask OpenRouter for reply and quote-post drafts. Copying is manual; nothing is posted automatically."
				}),
				/* @__PURE__ */ jsxs("div", {
					className: "mt-4 grid gap-3 md:grid-cols-[minmax(0,16rem)_1fr_auto]",
					children: [
						/* @__PURE__ */ jsxs("label", { children: [/* @__PURE__ */ jsx("span", {
							className: "mb-1 block text-xs text-muted",
							children: "X handle"
						}), /* @__PURE__ */ jsx("input", {
							value: handle,
							onChange: (event) => setHandle(event.target.value),
							placeholder: "@elonmusk",
							className: "min-h-11 w-full rounded-lg border border-line bg-bg px-3 text-sm outline-none"
						})] }),
						/* @__PURE__ */ jsxs("label", { children: [/* @__PURE__ */ jsx("span", {
							className: "mb-1 block text-xs text-muted",
							children: "Instruction for OpenRouter"
						}), /* @__PURE__ */ jsx("input", {
							value: instruction,
							onChange: (event) => setInstruction(event.target.value),
							placeholder: "What should the drafts focus on?",
							className: "min-h-11 w-full rounded-lg border border-line bg-bg px-3 text-sm outline-none"
						})] }),
						/* @__PURE__ */ jsx("div", {
							className: "flex items-end",
							children: /* @__PURE__ */ jsx(Button, {
								type: "button",
								variant: "primary",
								disabled: busy !== null,
								onClick: () => void search(),
								children: busy === "search" ? "Searching" : "Search X"
							})
						})
					]
				}),
				posts.length ? /* @__PURE__ */ jsxs("div", {
					className: "mt-4 flex flex-wrap items-center gap-2",
					children: [
						/* @__PURE__ */ jsx(Button, {
							type: "button",
							variant: "primary",
							disabled: busy !== null,
							onClick: () => void draftSelected(),
							children: busy === "draft" ? "Drafting" : `Draft ${selected.size} selected`
						}),
						/* @__PURE__ */ jsx(Button, {
							type: "button",
							variant: "outline",
							onClick: () => setSelected(new Set(posts.map((post) => post.id))),
							children: "Select all"
						}),
						/* @__PURE__ */ jsx("span", {
							className: "text-xs text-muted",
							children: target ? `Showing reposts from @${target.handle}` : ""
						})
					]
				}) : null
			]
		}), posts.length ? /* @__PURE__ */ jsx("div", {
			className: "space-y-4",
			children: posts.map((post) => {
				const draft = drafts[post.id];
				return /* @__PURE__ */ jsxs("article", {
					className: "rounded-lg border border-line bg-surface p-4",
					children: [
						/* @__PURE__ */ jsxs("div", {
							className: "flex flex-wrap items-center gap-2 text-sm",
							children: [
								/* @__PURE__ */ jsx("input", {
									type: "checkbox",
									checked: selected.has(post.id),
									onChange: () => toggle(post.id),
									"aria-label": `Select repost by @${post.originalAuthorHandle}`
								}),
								/* @__PURE__ */ jsxs("span", {
									className: "font-medium",
									children: ["@", post.originalAuthorHandle]
								}),
								/* @__PURE__ */ jsx(Stamp, { iso: post.createdAt }),
								/* @__PURE__ */ jsx("a", {
									className: "ml-auto text-xs text-accent",
									href: post.url,
									target: "_blank",
									rel: "noreferrer",
									children: "Open on X"
								})
							]
						}),
						/* @__PURE__ */ jsx("p", {
							className: "mt-3 whitespace-pre-wrap text-sm",
							children: post.text
						}),
						draft ? /* @__PURE__ */ jsx("div", {
							className: "mt-4 grid gap-3 md:grid-cols-2",
							children: ["reply", "quote"].map((kind) => /* @__PURE__ */ jsxs("div", {
								className: "rounded-lg border border-line p-3",
								children: [
									/* @__PURE__ */ jsxs("div", {
										className: "flex items-center justify-between gap-2",
										children: [/* @__PURE__ */ jsx("p", {
											className: "text-xs font-medium uppercase tracking-wide text-muted",
											children: kind === "reply" ? "Reply draft" : "Quote draft"
										}), /* @__PURE__ */ jsx(Button, {
											type: "button",
											variant: "outline",
											onClick: () => void copy(draft[kind]),
											children: "Copy"
										})]
									}),
									/* @__PURE__ */ jsx("p", {
										className: "mt-2 text-sm",
										children: draft[kind]
									}),
									/* @__PURE__ */ jsxs("p", {
										className: "mt-2 text-xs text-muted",
										children: [draft[kind].length, "/280 · review before posting"]
									})
								]
							}, kind))
						}) : null
					]
				}, post.id);
			})
		}) : null]
	});
}
//#endregion
//#region src/routes/research.tsx?tsr-split=component
var SplitComponent = function ResearchPage() {
	return /* @__PURE__ */ jsx(AppShell, {
		title: "Research",
		children: /* @__PURE__ */ jsx(ResearchView, {})
	});
};
//#endregion
export { SplitComponent as component };
