import { d as Button, l as money, n as Stamp, o as useAgent, t as AppShell } from "./app-shell-BZgXozVv.js";
import { jsx, jsxs } from "react/jsx-runtime";
import * as Switch from "@radix-ui/react-switch";
//#region src/components/views/usage.tsx
function UsageView() {
	const usage = useAgent((state) => state.usage);
	const prefs = useAgent((state) => state.prefs);
	const setPrefs = useAgent((state) => state.setPrefs);
	const resetSample = useAgent((state) => state.resetSample);
	const spend = usage.reduce((sum, event) => sum + event.usd, 0);
	const reads = usage.filter((event) => event.kind === "x_read").length;
	const writes = usage.filter((event) => event.kind === "x_write").length;
	const ai = usage.filter((event) => event.kind === "ai" && event.usd > 0).length;
	return /* @__PURE__ */ jsxs("div", {
		className: "space-y-8",
		children: [
			/* @__PURE__ */ jsx("p", {
				className: "max-w-2xl text-sm text-muted",
				children: "Estimates, not an invoice. Reads are cached for a minute, and requests stop when the limit is hit. The monitor cron does not post."
			}),
			/* @__PURE__ */ jsx("dl", {
				className: "grid grid-cols-2 gap-px overflow-hidden rounded-lg border border-line bg-line sm:grid-cols-4",
				children: [
					["Estimated", money(spend)],
					["X reads", String(reads)],
					["X writes", String(writes)],
					["Model calls", String(ai)]
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
			/* @__PURE__ */ jsxs("div", {
				className: "grid gap-4 sm:grid-cols-2",
				children: [/* @__PURE__ */ jsxs("label", {
					className: "block rounded-lg border border-line p-4",
					children: [/* @__PURE__ */ jsx("span", {
						className: "text-sm font-medium",
						children: "Monthly limit"
					}), /* @__PURE__ */ jsx("input", {
						type: "number",
						min: 0,
						step: 1,
						value: prefs.budgetUsd,
						onChange: (event) => setPrefs({ budgetUsd: Number(event.target.value) || 0 }),
						className: "mt-3 w-full min-h-11 rounded-lg border border-line bg-surface px-3 text-sm tabular-nums"
					})]
				}), /* @__PURE__ */ jsxs("div", {
					className: "flex items-center justify-between gap-4 rounded-lg border border-line p-4",
					children: [/* @__PURE__ */ jsxs("div", { children: [/* @__PURE__ */ jsx("p", {
						className: "text-sm font-medium",
						children: "Stop at the limit"
					}), /* @__PURE__ */ jsx("p", {
						className: "text-xs text-muted",
						children: "Blocks sync, lists, generation, and publish estimates."
					})] }), /* @__PURE__ */ jsx(Switch.Root, {
						checked: prefs.hardStop,
						onCheckedChange: (hardStop) => setPrefs({ hardStop }),
						className: "relative h-7 w-12 shrink-0 rounded-full bg-surface-2 data-[state=checked]:bg-accent",
						"aria-label": "Stop at the limit",
						children: /* @__PURE__ */ jsx(Switch.Thumb, { className: "block size-5 translate-x-1 rounded-full bg-fg transition-transform data-[state=checked]:translate-x-6" })
					})]
				})]
			}),
			/* @__PURE__ */ jsxs("section", { children: [/* @__PURE__ */ jsx("h2", {
				className: "mb-2 text-sm font-medium",
				children: "Still required for a live X connection"
			}), /* @__PURE__ */ jsxs("ul", {
				className: "list-disc space-y-1 pl-5 text-sm text-muted",
				children: [
					/* @__PURE__ */ jsx("li", { children: "An official X developer app with OAuth 2.0 PKCE and user-context scopes." }),
					/* @__PURE__ */ jsx("li", { children: "Callback URL pointed at /api/x/callback, plus the encryption key for tokens." }),
					/* @__PURE__ */ jsx("li", { children: "CRON_SECRET if you want the five-minute monitor. Hobby plans may only allow a daily schedule." }),
					/* @__PURE__ */ jsx("li", { children: "Written X approval before any autonomous posting. This build cannot turn that on." })
				]
			})] }),
			/* @__PURE__ */ jsx("div", {
				className: "flex flex-wrap gap-2",
				children: /* @__PURE__ */ jsx(Button, {
					type: "button",
					variant: "outline",
					onClick: () => resetSample(),
					children: "Reset sample workspace"
				})
			}),
			/* @__PURE__ */ jsxs("ul", {
				className: "divide-y divide-line border-y border-line",
				children: [usage.length === 0 ? /* @__PURE__ */ jsx("li", {
					className: "py-6 text-sm text-muted",
					children: "No requests yet."
				}) : null, usage.map((event) => /* @__PURE__ */ jsxs("li", {
					className: "flex items-start justify-between gap-4 py-3",
					children: [/* @__PURE__ */ jsxs("div", { children: [/* @__PURE__ */ jsx("p", {
						className: "text-sm",
						children: event.detail
					}), /* @__PURE__ */ jsxs("p", {
						className: "text-xs text-muted",
						children: [
							event.kind,
							event.cached ? " · cached" : "",
							" · ",
							/* @__PURE__ */ jsx(Stamp, { iso: event.at })
						]
					})] }), /* @__PURE__ */ jsx("p", {
						className: "text-sm tabular-nums",
						children: money(event.usd)
					})]
				}, event.id))]
			})
		]
	});
}
//#endregion
//#region src/routes/usage.tsx?tsr-split=component
var SplitComponent = function UsagePage() {
	return /* @__PURE__ */ jsx(AppShell, {
		title: "Usage",
		children: /* @__PURE__ */ jsx(UsageView, {})
	});
};
//#endregion
export { SplitComponent as component };
