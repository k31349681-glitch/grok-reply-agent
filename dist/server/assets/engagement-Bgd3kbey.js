import { c as compact, d as Button, o as useAgent, s as COSTS, t as AppShell, u as utcDay } from "./app-shell-BZgXozVv.js";
import { useState } from "react";
import { jsx, jsxs } from "react/jsx-runtime";
import { toast } from "sonner";
//#region src/components/views/engagement.tsx
function EngagementView() {
	const account = useAgent((state) => state.account);
	const people = useAgent((state) => state.people);
	const posts = useAgent((state) => state.posts);
	const snapshots = useAgent((state) => state.snapshots);
	const toggleIntent = useAgent((state) => state.toggleIntent);
	const toggleLiked = useAgent((state) => state.toggleLiked);
	const [loading, setLoading] = useState(null);
	const published = posts.filter((post) => post.status === "published");
	const likes = published.reduce((sum, post) => sum + post.likes, 0);
	const reposts = published.reduce((sum, post) => sum + post.reposts, 0);
	const replies = published.reduce((sum, post) => sum + post.replies, 0);
	const impressions = published.reduce((sum, post) => sum + (post.impressions ?? 0), 0);
	const missingImpressions = published.some((post) => post.impressions == null);
	const start = snapshots[0]?.followers ?? account.followers;
	const growth = account.followers - start;
	async function load(resource) {
		const state = useAgent.getState();
		if (state.account.status !== "live") {
			toast.error("Follower lists come from X only after OAuth. This sample list is a fixture.");
			return;
		}
		if (!state.canSpend(COSTS.graph).ok) {
			toast.error("Budget limit reached. The list was not requested.");
			return;
		}
		setLoading(resource);
		try {
			const res = await fetch(`/api/analytics?resource=${resource}`);
			const data = await res.json();
			if (!res.ok || !data.ok || !data.people) {
				toast.error(data.error || "X did not return that list");
				return;
			}
			state.setPeople(data.people);
			state.logUsage({
				kind: "x_read",
				detail: `Loaded ${resource} from X`,
				usd: COSTS.graph,
				cached: false
			});
			toast(`Loaded ${resource} from X`);
		} catch {
			toast.error("Could not load that list");
		} finally {
			setLoading(null);
		}
	}
	return /* @__PURE__ */ jsxs("div", {
		className: "space-y-8",
		children: [
			/* @__PURE__ */ jsx("p", {
				className: "max-w-2xl text-sm text-muted",
				children: "Likes, follows, and unfollows stay manual. Marking one here only records your intent. This app will not send those actions to X."
			}),
			/* @__PURE__ */ jsx("dl", {
				className: "grid grid-cols-2 gap-px overflow-hidden rounded-lg border border-line bg-line sm:grid-cols-4",
				children: [
					["Follower change", `${growth >= 0 ? "+" : ""}${compact(growth)}`],
					["Likes", compact(likes)],
					["Reposts", compact(reposts)],
					["Replies", compact(replies)]
				].map(([label, value]) => /* @__PURE__ */ jsxs("div", {
					className: "bg-bg px-4 py-4",
					children: [/* @__PURE__ */ jsx("dt", {
						className: "text-xs text-muted",
						children: label
					}), /* @__PURE__ */ jsx("dd", {
						className: "mt-1 text-2xl font-semibold tabular-nums",
						children: value
					})]
				}, label))
			}),
			/* @__PURE__ */ jsxs("p", {
				className: "text-sm text-muted",
				children: [
					"Impressions in view: ",
					missingImpressions ? "partial — some posts have no impression field" : compact(impressions),
					". Sample figures are illustrative. Live impressions appear only when X returns them."
				]
			}),
			/* @__PURE__ */ jsxs("div", {
				className: "flex flex-wrap gap-2",
				children: [/* @__PURE__ */ jsx(Button, {
					type: "button",
					variant: "outline",
					disabled: loading !== null,
					onClick: () => void load("followers"),
					children: loading === "followers" ? "Loading" : "Load followers"
				}), /* @__PURE__ */ jsx(Button, {
					type: "button",
					variant: "outline",
					disabled: loading !== null,
					onClick: () => void load("following"),
					children: loading === "following" ? "Loading" : "Load following"
				})]
			}),
			/* @__PURE__ */ jsx("ul", {
				className: "divide-y divide-line border-y border-line",
				children: people.map((person) => /* @__PURE__ */ jsxs("li", {
					className: "flex flex-col gap-3 py-4 sm:flex-row sm:items-center sm:justify-between",
					children: [/* @__PURE__ */ jsxs("div", { children: [/* @__PURE__ */ jsxs("p", {
						className: "text-sm font-medium",
						children: [
							person.name,
							" ",
							/* @__PURE__ */ jsxs("span", {
								className: "font-normal text-muted",
								children: ["@", person.handle]
							})
						]
					}), /* @__PURE__ */ jsxs("p", {
						className: "text-xs text-muted tabular-nums",
						children: [
							compact(person.followers),
							" followers · ",
							labelRelation(person.relation),
							person.intent ? ` · marked to ${person.intent}` : ""
						]
					})] }), /* @__PURE__ */ jsxs("div", {
						className: "flex gap-2",
						children: [/* @__PURE__ */ jsx(Button, {
							type: "button",
							variant: "outline",
							onClick: () => toggleIntent(person.id),
							children: person.intent ? "Clear mark" : person.relation === "following" || person.relation === "mutual" ? "Mark unfollow" : "Mark follow"
						}), /* @__PURE__ */ jsx(Button, {
							type: "button",
							variant: "ghost",
							onClick: () => toggleLiked(person.id),
							children: person.liked ? "Liked mark" : "Mark like"
						})]
					})]
				}, person.id))
			}),
			/* @__PURE__ */ jsxs("p", {
				className: "text-xs text-muted",
				children: [
					"Window starts ",
					utcDay(-13),
					"."
				]
			})
		]
	});
}
function labelRelation(relation) {
	if (relation === "follows_you") return "follows you";
	if (relation === "mutual") return "mutual";
	if (relation === "following") return "following";
	return "no relation stored";
}
//#endregion
//#region src/routes/engagement.tsx?tsr-split=component
var SplitComponent = function EngagementPage() {
	return /* @__PURE__ */ jsx(AppShell, {
		title: "People",
		children: /* @__PURE__ */ jsx(EngagementView, {})
	});
};
//#endregion
export { SplitComponent as component };
