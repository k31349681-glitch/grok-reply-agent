import { c as compact, f as cn, o as useAgent, t as AppShell, u as utcDay } from "./app-shell-BZgXozVv.js";
import { useEffect, useState } from "react";
import { jsx, jsxs } from "react/jsx-runtime";
import { Area, AreaChart, Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
//#region src/components/views/analytics.tsx
var TABS = [
	"followers",
	"weekly",
	"monthly",
	"posts",
	"activity"
];
function AnalyticsView() {
	const snapshots = useAgent((state) => state.snapshots);
	const weekly = useAgent((state) => state.weekly);
	const monthly = useAgent((state) => state.monthly);
	const posts = useAgent((state) => state.posts);
	const [tab, setTab] = useState("followers");
	const [mounted, setMounted] = useState(false);
	useEffect(() => setMounted(true), []);
	const followerSeries = snapshots.map((point) => ({
		date: point.date.slice(5),
		followers: point.followers
	}));
	const best = [...posts].filter((post) => post.status === "published").sort((a, b) => b.likes - a.likes);
	const activity = Array.from({ length: 14 }, (_, index) => {
		const date = utcDay(index - 13);
		return {
			date: date.slice(5),
			posts: posts.filter((post) => post.publishedAt?.slice(0, 10) === date).length
		};
	});
	return /* @__PURE__ */ jsxs("div", {
		className: "space-y-5",
		children: [
			/* @__PURE__ */ jsx("p", {
				className: "max-w-2xl text-sm text-muted",
				children: "Charts use figures this workspace actually has: follower snapshots, and public likes, reposts, and replies. Sample points are labeled illustrative on the posts themselves."
			}),
			/* @__PURE__ */ jsx("div", {
				className: "flex gap-2 overflow-x-auto",
				children: TABS.map((item) => /* @__PURE__ */ jsx("button", {
					type: "button",
					onClick: () => setTab(item),
					className: cn("min-h-11 shrink-0 rounded-lg px-3 text-sm capitalize", tab === item ? "bg-surface-2 text-fg" : "text-muted"),
					children: item === "posts" ? "Best posts" : item
				}, item))
			}),
			tab === "posts" ? /* @__PURE__ */ jsx("ol", {
				className: "divide-y divide-line border-y border-line",
				children: best.map((post, index) => /* @__PURE__ */ jsxs("li", {
					className: "flex items-start justify-between gap-4 py-4",
					children: [/* @__PURE__ */ jsxs("div", { children: [/* @__PURE__ */ jsxs("p", {
						className: "text-xs text-muted tabular-nums",
						children: ["#", index + 1]
					}), /* @__PURE__ */ jsx("p", {
						className: "mt-1 text-sm",
						children: post.text
					})] }), /* @__PURE__ */ jsxs("p", {
						className: "shrink-0 text-right text-xs text-muted tabular-nums",
						children: [
							compact(post.likes),
							" likes",
							/* @__PURE__ */ jsx("br", {}),
							compact(post.reposts),
							" reposts",
							/* @__PURE__ */ jsx("br", {}),
							post.impressions == null ? "No impressions" : `${compact(post.impressions)} impressions`,
							post.illustrative ? /* @__PURE__ */ jsx("span", {
								className: "block",
								children: "Illustrative"
							}) : null
						]
					})]
				}, post.id))
			}) : /* @__PURE__ */ jsx("div", {
				className: "h-72 w-full min-w-0 rounded-lg border border-line p-3",
				children: mounted ? /* @__PURE__ */ jsx(ResponsiveContainer, {
					width: "100%",
					height: "100%",
					children: tab === "followers" ? /* @__PURE__ */ jsxs(AreaChart, {
						data: followerSeries,
						children: [
							/* @__PURE__ */ jsx(CartesianGrid, {
								stroke: "var(--color-line)",
								vertical: false
							}),
							/* @__PURE__ */ jsx(XAxis, {
								dataKey: "date",
								stroke: "var(--color-muted)",
								tick: {
									fill: "var(--color-muted)",
									fontSize: 12
								}
							}),
							/* @__PURE__ */ jsx(YAxis, {
								stroke: "var(--color-muted)",
								tick: {
									fill: "var(--color-muted)",
									fontSize: 12
								},
								width: 48
							}),
							/* @__PURE__ */ jsx(Tooltip, { contentStyle: tip }),
							/* @__PURE__ */ jsx(Area, {
								dataKey: "followers",
								stroke: "var(--color-accent)",
								fill: "var(--color-accent)",
								fillOpacity: .16,
								strokeWidth: 2
							})
						]
					}) : tab === "weekly" ? /* @__PURE__ */ jsxs(BarChart, {
						data: weekly,
						children: [
							/* @__PURE__ */ jsx(CartesianGrid, {
								stroke: "var(--color-line)",
								vertical: false
							}),
							/* @__PURE__ */ jsx(XAxis, {
								dataKey: "label",
								stroke: "var(--color-muted)",
								tick: {
									fill: "var(--color-muted)",
									fontSize: 12
								}
							}),
							/* @__PURE__ */ jsx(YAxis, {
								stroke: "var(--color-muted)",
								tick: {
									fill: "var(--color-muted)",
									fontSize: 12
								},
								width: 40
							}),
							/* @__PURE__ */ jsx(Tooltip, { contentStyle: tip }),
							/* @__PURE__ */ jsx(Bar, {
								dataKey: "likes",
								fill: "var(--color-accent)",
								radius: 4
							}),
							/* @__PURE__ */ jsx(Bar, {
								dataKey: "reposts",
								fill: "var(--color-fg)",
								radius: 4
							}),
							/* @__PURE__ */ jsx(Bar, {
								dataKey: "replies",
								fill: "var(--color-muted)",
								radius: 4
							})
						]
					}) : tab === "monthly" ? /* @__PURE__ */ jsxs(BarChart, {
						data: monthly,
						children: [
							/* @__PURE__ */ jsx(CartesianGrid, {
								stroke: "var(--color-line)",
								vertical: false
							}),
							/* @__PURE__ */ jsx(XAxis, {
								dataKey: "label",
								stroke: "var(--color-muted)",
								tick: {
									fill: "var(--color-muted)",
									fontSize: 12
								}
							}),
							/* @__PURE__ */ jsx(YAxis, {
								stroke: "var(--color-muted)",
								tick: {
									fill: "var(--color-muted)",
									fontSize: 12
								},
								width: 40
							}),
							/* @__PURE__ */ jsx(Tooltip, { contentStyle: tip }),
							/* @__PURE__ */ jsx(Bar, {
								dataKey: "posts",
								fill: "var(--color-accent)",
								radius: 4
							})
						]
					}) : /* @__PURE__ */ jsxs(BarChart, {
						data: activity,
						children: [
							/* @__PURE__ */ jsx(CartesianGrid, {
								stroke: "var(--color-line)",
								vertical: false
							}),
							/* @__PURE__ */ jsx(XAxis, {
								dataKey: "date",
								stroke: "var(--color-muted)",
								tick: {
									fill: "var(--color-muted)",
									fontSize: 12
								}
							}),
							/* @__PURE__ */ jsx(YAxis, {
								allowDecimals: false,
								stroke: "var(--color-muted)",
								tick: {
									fill: "var(--color-muted)",
									fontSize: 12
								},
								width: 32
							}),
							/* @__PURE__ */ jsx(Tooltip, { contentStyle: tip }),
							/* @__PURE__ */ jsx(Bar, {
								dataKey: "posts",
								fill: "var(--color-accent)",
								radius: 4
							})
						]
					})
				}) : null
			})
		]
	});
}
var tip = {
	background: "var(--color-surface)",
	border: "1px solid var(--color-line)",
	borderRadius: 12,
	color: "var(--color-fg)"
};
//#endregion
//#region src/routes/analytics.tsx?tsr-split=component
var SplitComponent = function AnalyticsPage() {
	return /* @__PURE__ */ jsx(AppShell, {
		title: "Analytics",
		children: /* @__PURE__ */ jsx(AnalyticsView, {})
	});
};
//#endregion
export { SplitComponent as component };
