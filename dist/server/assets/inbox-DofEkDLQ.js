import { d as Button, f as cn, n as Stamp, o as useAgent, t as AppShell } from "./app-shell-BZgXozVv.js";
import { useState } from "react";
import { Link } from "@tanstack/react-router";
import { jsx, jsxs } from "react/jsx-runtime";
//#region src/components/views/inbox.tsx
var FILTERS = [
	"all",
	"mention",
	"reply"
];
function InboxView() {
	const notices = useAgent((state) => state.notices);
	const account = useAgent((state) => state.account);
	const markRead = useAgent((state) => state.markRead);
	const markAllRead = useAgent((state) => state.markAllRead);
	const selectNotice = useAgent((state) => state.selectNotice);
	const [filter, setFilter] = useState("all");
	const visible = notices.filter((notice) => filter === "all" || notice.kind === filter);
	return /* @__PURE__ */ jsxs("div", {
		className: "space-y-4",
		children: [
			/* @__PURE__ */ jsx("p", {
				className: "max-w-2xl text-sm text-muted",
				children: "Mentions and replies only. X API v2 does not return the full native notification tab, so this inbox will not pretend it has."
			}),
			/* @__PURE__ */ jsxs("div", {
				className: "flex flex-wrap items-center gap-2",
				children: [FILTERS.map((item) => /* @__PURE__ */ jsx("button", {
					type: "button",
					onClick: () => setFilter(item),
					className: cn("min-h-11 rounded-lg px-3 text-sm capitalize", filter === item ? "bg-surface-2 text-fg" : "text-muted"),
					children: item === "all" ? "All" : item === "mention" ? "Mentions" : "Replies"
				}, item)), /* @__PURE__ */ jsx(Button, {
					type: "button",
					variant: "ghost",
					onClick: () => markAllRead(),
					disabled: account.status === "disconnected",
					children: "Mark read"
				})]
			}),
			account.status === "disconnected" ? /* @__PURE__ */ jsx("p", {
				className: "text-sm text-muted",
				children: "Connect a workspace to keep an inbox."
			}) : /* @__PURE__ */ jsxs("ul", {
				className: "divide-y divide-line border-y border-line",
				children: [visible.map((notice) => /* @__PURE__ */ jsxs("li", {
					className: "flex flex-col gap-3 py-4 sm:flex-row sm:items-start sm:justify-between",
					children: [/* @__PURE__ */ jsxs("div", {
						className: "min-w-0",
						children: [
							/* @__PURE__ */ jsxs("div", {
								className: "flex flex-wrap items-center gap-2",
								children: [
									/* @__PURE__ */ jsx("p", {
										className: "text-sm font-medium",
										children: notice.authorName
									}),
									/* @__PURE__ */ jsxs("p", {
										className: "text-sm text-muted",
										children: ["@", notice.authorHandle]
									}),
									/* @__PURE__ */ jsx("span", {
										className: "text-xs tracking-wide text-muted uppercase",
										children: notice.kind
									}),
									!notice.read ? /* @__PURE__ */ jsx("span", {
										className: "text-xs text-accent",
										children: "New"
									}) : null,
									/* @__PURE__ */ jsx(Stamp, { iso: notice.createdAt })
								]
							}),
							/* @__PURE__ */ jsx("p", {
								className: "mt-2 text-sm",
								children: notice.text
							}),
							/* @__PURE__ */ jsx("p", {
								className: "mt-1 text-xs text-muted",
								children: notice.source === "sample" ? "Fixture" : "From X"
							})
						]
					}), /* @__PURE__ */ jsx(Link, {
						to: "/studio",
						className: "inline-flex min-h-11 items-center text-sm text-accent",
						onClick: () => {
							markRead(notice.id);
							selectNotice(notice.id);
						},
						children: "Draft reply"
					})]
				}, notice.id)), visible.length === 0 ? /* @__PURE__ */ jsx("li", {
					className: "py-8 text-sm text-muted",
					children: "Nothing in this filter."
				}) : null]
			})
		]
	});
}
//#endregion
//#region src/routes/inbox.tsx?tsr-split=component
var SplitComponent = function InboxPage() {
	return /* @__PURE__ */ jsx(AppShell, {
		title: "Inbox",
		children: /* @__PURE__ */ jsx(InboxView, {})
	});
};
//#endregion
export { SplitComponent as component };
