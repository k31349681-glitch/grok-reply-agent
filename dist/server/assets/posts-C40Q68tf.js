import { d as Button, n as Stamp, o as useAgent, s as COSTS, t as AppShell } from "./app-shell-BZgXozVv.js";
import { t as ConfirmDialog } from "./confirm-dialog-BG44qMBH.js";
import { useState } from "react";
import { jsx, jsxs } from "react/jsx-runtime";
import { toast } from "sonner";
//#region src/components/views/posts.tsx
function PostsView() {
	const posts = useAgent((state) => state.posts);
	const account = useAgent((state) => state.account);
	const [text, setText] = useState("");
	const [when, setWhen] = useState("");
	const [editing, setEditing] = useState(null);
	const [confirmId, setConfirmId] = useState(null);
	const [busy, setBusy] = useState(false);
	const target = posts.find((post) => post.id === confirmId) ?? null;
	function load(post) {
		setEditing(post.id);
		setText(post.text);
		setWhen(post.scheduledFor ? toLocal(post.scheduledFor) : "");
	}
	function save(status) {
		const clean = text.trim();
		if (!clean) {
			toast.error("Write the post first.");
			return;
		}
		if (clean.length > 280) {
			toast.error("Keep it within 280 characters.");
			return;
		}
		if (status === "scheduled" && !when) {
			toast.error("Pick a time to schedule.");
			return;
		}
		useAgent.getState().savePost({
			id: editing ?? void 0,
			text: clean,
			status,
			scheduledFor: status === "scheduled" ? new Date(when).toISOString() : null
		});
		toast(status === "scheduled" ? "Scheduled. It will wait for your confirmation." : "Draft saved");
		if (!editing) {
			setText("");
			setWhen("");
		}
	}
	async function publish() {
		if (!target) return;
		if (account.status !== "live") {
			useAgent.getState().publishPost(target.id);
			setConfirmId(null);
			toast("Marked published in this workspace. It was not sent to X.");
			return;
		}
		setBusy(true);
		try {
			const res = await fetch("/api/x/publish", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({
					text: target.text,
					confirm: true
				})
			});
			const data = await res.json();
			if (!res.ok || !data.ok) {
				toast.error(data.error || "X did not accept the post");
				return;
			}
			useAgent.getState().publishPost(target.id);
			useAgent.getState().logUsage({
				kind: "x_write",
				detail: `Post ${data.id} published on X`,
				usd: COSTS.publish,
				cached: false
			});
			toast("Published to X");
			setConfirmId(null);
		} catch {
			toast.error("Publish failed");
		} finally {
			setBusy(false);
		}
	}
	const groups = [
		["Drafts", posts.filter((post) => post.status === "draft")],
		["Scheduled", posts.filter((post) => post.status === "scheduled" || post.status === "due")],
		["Published", posts.filter((post) => post.status === "published")]
	];
	return /* @__PURE__ */ jsxs("div", {
		className: "grid gap-8 lg:grid-cols-[minmax(0,1fr)_18rem]",
		children: [
			/* @__PURE__ */ jsxs("div", {
				className: "space-y-4",
				children: [
					/* @__PURE__ */ jsxs("label", {
						className: "block",
						children: [/* @__PURE__ */ jsx("span", {
							className: "sr-only",
							children: "Post"
						}), /* @__PURE__ */ jsx("textarea", {
							value: text,
							onChange: (event) => setText(event.target.value),
							rows: 5,
							placeholder: "Write a post. Scheduling does not publish it.",
							className: "w-full resize-y rounded-lg border border-line bg-surface px-3 py-3 text-sm outline-none"
						})]
					}),
					/* @__PURE__ */ jsxs("div", {
						className: "flex flex-wrap items-center gap-2",
						children: [
							/* @__PURE__ */ jsx("input", {
								type: "datetime-local",
								value: when,
								onChange: (event) => setWhen(event.target.value),
								className: "min-h-11 rounded-lg border border-line bg-surface px-3 text-sm"
							}),
							/* @__PURE__ */ jsx(Button, {
								type: "button",
								variant: "outline",
								onClick: () => save("draft"),
								children: "Save draft"
							}),
							/* @__PURE__ */ jsx(Button, {
								type: "button",
								variant: "outline",
								onClick: () => save("scheduled"),
								children: "Schedule"
							}),
							editing ? /* @__PURE__ */ jsx(Button, {
								type: "button",
								variant: "ghost",
								onClick: () => {
									setEditing(null);
									setText("");
									setWhen("");
								},
								children: "New post"
							}) : null,
							/* @__PURE__ */ jsxs("span", {
								className: "text-xs tabular-nums text-muted",
								children: [text.trim().length, "/280"]
							})
						]
					}),
					/* @__PURE__ */ jsxs("section", {
						className: "rounded-lg border border-line p-4",
						children: [/* @__PURE__ */ jsx("p", {
							className: "text-xs tracking-widest text-muted uppercase",
							children: "Preview"
						}), /* @__PURE__ */ jsxs("div", {
							className: "mt-3 flex gap-3",
							children: [/* @__PURE__ */ jsx("span", {
								className: "grid size-10 shrink-0 place-items-center rounded-full bg-surface-2 text-sm font-semibold",
								children: (account.name || "You").slice(0, 1)
							}), /* @__PURE__ */ jsxs("div", { children: [/* @__PURE__ */ jsxs("p", {
								className: "text-sm font-medium",
								children: [
									account.name || "Not connected",
									" ",
									/* @__PURE__ */ jsx("span", {
										className: "font-normal text-muted",
										children: account.handle ? `@${account.handle}` : ""
									})
								]
							}), /* @__PURE__ */ jsx("p", {
								className: "mt-1 text-sm",
								children: text.trim() || "Your post will preview here."
							})] })]
						})]
					})
				]
			}),
			/* @__PURE__ */ jsx("div", {
				className: "space-y-6",
				children: groups.map(([label, items]) => /* @__PURE__ */ jsxs("section", { children: [/* @__PURE__ */ jsx("h2", {
					className: "mb-2 text-sm font-medium",
					children: label
				}), /* @__PURE__ */ jsxs("ul", {
					className: "space-y-2",
					children: [items.map((post) => /* @__PURE__ */ jsxs("li", {
						className: "rounded-lg border border-line px-3 py-3",
						children: [
							/* @__PURE__ */ jsx("p", {
								className: "text-sm",
								children: post.text
							}),
							/* @__PURE__ */ jsxs("p", {
								className: "mt-2 text-xs text-muted",
								children: [
									post.status === "due" ? "Ready — confirmation still required" : post.status,
									post.scheduledFor ? /* @__PURE__ */ jsxs("span", { children: [" · ", /* @__PURE__ */ jsx(Stamp, { iso: post.scheduledFor })] }) : null,
									post.publishedAt ? /* @__PURE__ */ jsxs("span", { children: [" · ", /* @__PURE__ */ jsx(Stamp, { iso: post.publishedAt })] }) : null
								]
							}),
							/* @__PURE__ */ jsxs("div", {
								className: "mt-2 flex gap-2",
								children: [post.status !== "published" ? /* @__PURE__ */ jsx(Button, {
									type: "button",
									variant: "ghost",
									className: "px-2",
									onClick: () => load(post),
									children: "Edit"
								}) : null, post.status !== "published" ? /* @__PURE__ */ jsx(Button, {
									type: "button",
									variant: "primary",
									className: "px-3",
									onClick: () => setConfirmId(post.id),
									children: "Publish"
								}) : null]
							})
						]
					}, post.id)), items.length === 0 ? /* @__PURE__ */ jsx("li", {
						className: "text-sm text-muted",
						children: "None"
					}) : null]
				})] }, label))
			}),
			/* @__PURE__ */ jsx(ConfirmDialog, {
				open: Boolean(target),
				title: "Publish this post?",
				body: account.status === "live" ? "This sends the text to X from the connected account." : "This only records the post in the workspace. It will not be sent to X.",
				confirmLabel: "Publish post",
				busy,
				onOpenChange: (open) => {
					if (!open) setConfirmId(null);
				},
				onConfirm: () => void publish()
			})
		]
	});
}
function toLocal(iso) {
	const date = new Date(iso);
	const pad = (value) => String(value).padStart(2, "0");
	return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}
//#endregion
//#region src/routes/posts.tsx?tsr-split=component
var SplitComponent = function PostsPage() {
	return /* @__PURE__ */ jsx(AppShell, {
		title: "Posts",
		children: /* @__PURE__ */ jsx(PostsView, {})
	});
};
//#endregion
export { SplitComponent as component };
