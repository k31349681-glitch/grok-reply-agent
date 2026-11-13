import { a as pendingCount, c as compact, o as useAgent, r as ConnectPanel, t as AppShell } from "./app-shell-BZgXozVv.js";
import { Link } from "@tanstack/react-router";
import { jsx, jsxs } from "react/jsx-runtime";
//#region src/components/views/command.tsx
function CommandView() {
	const account = useAgent((state) => state.account);
	const notices = useAgent((state) => state.notices);
	const drafts = useAgent((state) => state.drafts);
	const posts = useAgent((state) => state.posts);
	const pending = useAgent(pendingCount);
	const spend = useAgent((state) => state.usage.reduce((sum, event) => sum + event.usd, 0));
	const selectNotice = useAgent((state) => state.selectNotice);
	const published = posts.filter((post) => post.status === "published");
	const open = notices.filter((notice) => {
		const related = drafts.filter((draft) => draft.noticeId === notice.id);
		const draft = related.find((item) => item.status !== "rejected") ?? related[0];
		return !draft || draft.status !== "approved" && draft.status !== "published";
	});
	if (account.status === "disconnected") return /* @__PURE__ */ jsxs("div", {
		className: "max-w-xl space-y-4",
		children: [/* @__PURE__ */ jsx("p", {
			className: "text-sm text-muted",
			children: "Connect your X account, or open the sample workspace. Drafts stay here until you approve and confirm a publish."
		}), /* @__PURE__ */ jsx(ConnectPanel, {})]
	});
	const metrics = [
		["Followers", compact(account.followers)],
		["Following", compact(account.following)],
		["Open", compact(notices.filter((notice) => !notice.read).length)],
		["Pending replies", compact(pending)],
		["Published", compact(published.length)]
	];
	return /* @__PURE__ */ jsxs("div", {
		className: "space-y-8",
		children: [
			/* @__PURE__ */ jsxs("p", {
				className: "text-sm text-muted",
				children: [
					account.status === "live" ? "Connected to X" : "Sample account",
					" · @",
					account.handle,
					". Autonomous replies are off."
				]
			}),
			/* @__PURE__ */ jsx("dl", {
				className: "grid grid-cols-2 gap-px overflow-hidden rounded-lg border border-line bg-line sm:grid-cols-5",
				children: metrics.map(([label, value]) => /* @__PURE__ */ jsxs("div", {
					className: "bg-bg px-4 py-4",
					children: [/* @__PURE__ */ jsx("dt", {
						className: "text-xs text-muted",
						children: label
					}), /* @__PURE__ */ jsx("dd", {
						className: "mt-1 text-2xl font-semibold tabular-nums tracking-tight",
						children: value
					})]
				}, label))
			}),
			/* @__PURE__ */ jsxs("div", {
				className: "grid gap-8 lg:grid-cols-[minmax(0,1.4fr)_minmax(0,0.8fr)]",
				children: [/* @__PURE__ */ jsxs("section", { children: [/* @__PURE__ */ jsxs("div", {
					className: "mb-3 flex items-baseline justify-between",
					children: [/* @__PURE__ */ jsx("h2", {
						className: "text-sm font-medium",
						children: "Needs a reply"
					}), /* @__PURE__ */ jsx(Link, {
						to: "/inbox",
						className: "text-sm text-accent",
						children: "Inbox"
					})]
				}), /* @__PURE__ */ jsxs("ul", {
					className: "divide-y divide-line border-y border-line",
					children: [open.slice(0, 4).map((notice) => /* @__PURE__ */ jsxs("li", {
						className: "flex items-start justify-between gap-4 py-4",
						children: [/* @__PURE__ */ jsxs("div", { children: [/* @__PURE__ */ jsxs("p", {
							className: "text-sm font-medium",
							children: [
								notice.authorName,
								" ",
								/* @__PURE__ */ jsxs("span", {
									className: "font-normal text-muted",
									children: ["@", notice.authorHandle]
								})
							]
						}), /* @__PURE__ */ jsx("p", {
							className: "mt-1 text-sm text-muted",
							children: notice.text
						})] }), /* @__PURE__ */ jsx(Link, {
							to: "/studio",
							className: "shrink-0 text-sm text-accent",
							onClick: () => selectNotice(notice.id),
							children: "Draft"
						})]
					}, notice.id)), open.length === 0 ? /* @__PURE__ */ jsx("li", {
						className: "py-6 text-sm text-muted",
						children: "Nothing waiting. Sync to look for mentions."
					}) : null]
				})] }), /* @__PURE__ */ jsxs("section", {
					className: "space-y-6",
					children: [/* @__PURE__ */ jsxs("div", { children: [/* @__PURE__ */ jsx("h2", {
						className: "mb-3 text-sm font-medium",
						children: "Published"
					}), /* @__PURE__ */ jsx("ul", {
						className: "space-y-3",
						children: published.slice(0, 3).map((post) => /* @__PURE__ */ jsxs("li", {
							className: "rounded-lg border border-line px-4 py-3",
							children: [/* @__PURE__ */ jsx("p", {
								className: "text-sm",
								children: post.text
							}), /* @__PURE__ */ jsxs("p", {
								className: "mt-2 text-xs text-muted tabular-nums",
								children: [
									post.likes,
									" likes · ",
									post.reposts,
									" reposts",
									post.illustrative ? " · illustrative" : ""
								]
							})]
						}, post.id))
					})] }), /* @__PURE__ */ jsxs("p", {
						className: "text-xs text-muted tabular-nums",
						children: ["Estimated API spend this workspace: $", spend.toFixed(2)]
					})]
				})]
			})
		]
	});
}
//#endregion
//#region src/routes/index.tsx?tsr-split=component
var SplitComponent = function Home() {
	return /* @__PURE__ */ jsx(AppShell, {
		title: "Command",
		children: /* @__PURE__ */ jsx(CommandView, {})
	});
};
//#endregion
export { SplitComponent as component };
