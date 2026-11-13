import { forwardRef, useEffect, useState } from "react";
import { Link, useRouterState } from "@tanstack/react-router";
import { jsx, jsxs } from "react/jsx-runtime";
import { ChartColumn, Gauge, Inbox, LayoutDashboard, PenLine, Search, Send, Users } from "lucide-react";
import { toast } from "sonner";
import { Slot } from "@radix-ui/react-slot";
import { cva } from "class-variance-authority";
import { clsx } from "clsx";
import { twMerge } from "tailwind-merge";
import { create } from "zustand";
import { persist } from "zustand/middleware";
//#region src/lib/utils.ts
function cn(...inputs) {
	return twMerge(clsx(inputs));
}
//#endregion
//#region src/components/ui/button.tsx
var buttonVariants = cva("inline-flex items-center justify-center gap-2 rounded-lg text-sm font-medium transition-colors disabled:pointer-events-none disabled:opacity-40 min-h-11 px-4", {
	variants: { variant: {
		primary: "bg-accent text-accent-fg hover:opacity-90",
		ghost: "bg-transparent text-fg hover:bg-surface-2",
		outline: "border border-line bg-transparent text-fg hover:bg-surface-2"
	} },
	defaultVariants: { variant: "outline" }
});
var Button = forwardRef(function Button({ className, variant, asChild, ...props }, ref) {
	return /* @__PURE__ */ jsx(asChild ? Slot : "button", {
		ref,
		className: cn(buttonVariants({ variant }), className),
		...props
	});
});
//#endregion
//#region src/lib/format.ts
function money(n) {
	return new Intl.NumberFormat("en-US", {
		style: "currency",
		currency: "USD",
		minimumFractionDigits: 2,
		maximumFractionDigits: 2
	}).format(n);
}
function compact(n) {
	return new Intl.NumberFormat("en-US").format(n);
}
function rel(iso, now) {
	const delta = Math.max(0, now - new Date(iso).getTime());
	const min = Math.round(delta / 6e4);
	if (min < 1) return "just now";
	if (min < 60) return `${min}m ago`;
	const hr = Math.round(min / 60);
	if (hr < 36) return `${hr}h ago`;
	return `${Math.round(hr / 24)}d ago`;
}
function utcDay(offset) {
	const d = /* @__PURE__ */ new Date();
	const utc = Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate() + offset);
	return new Date(utc).toISOString().slice(0, 10);
}
function isoHoursAgo(hours) {
	const hour = Math.floor(Date.now() / 36e5) * 36e5;
	return (/* @__PURE__ */ new Date(hour - hours * 36e5)).toISOString();
}
var COSTS = {
	mention: .015,
	profile: .01,
	graph: .02,
	publish: .02,
	ai: .003
};
//#endregion
//#region src/lib/seed.ts
var SAMPLE_QUEUE = [{
	id: "n-queue-1",
	kind: "mention",
	authorName: "Orbit Daily",
	authorHandle: "orbitdaily",
	text: "Battery cost curves are doing more for climate than any keynote. Agree, or is that too neat?",
	createdAt: isoHoursAgo(1),
	context: "Quote-style mention. No earlier thread stored.",
	read: false,
	source: "sample"
}, {
	id: "n-queue-2",
	kind: "reply",
	authorName: "Jun Park",
	authorHandle: "junpark",
	text: "Your note on inference cost was sharp. What do people still price wrong?",
	createdAt: isoHoursAgo(2),
	context: "Reply under a thread about cost per token versus cost per successful task.",
	read: false,
	source: "sample"
}];
var MONTHS = [
	"Jan",
	"Feb",
	"Mar",
	"Apr",
	"May",
	"Jun",
	"Jul",
	"Aug",
	"Sep",
	"Oct",
	"Nov",
	"Dec"
];
function monthLabel(offsetFromNow) {
	return MONTHS[((/* @__PURE__ */ new Date()).getUTCMonth() - offsetFromNow + 12) % 12] ?? "—";
}
function buildWorkspace() {
	const followers = 18420;
	const snapshots = Array.from({ length: 14 }, (_, index) => {
		return {
			date: utcDay(index - 13),
			followers: followers - (13 - index) * 18 - index * 3 % 7,
			following: 512
		};
	});
	snapshots[snapshots.length - 1] = {
		date: utcDay(0),
		followers,
		following: 512
	};
	const notices = [
		{
			id: "n1",
			kind: "mention",
			authorName: "Aria Chen",
			authorHandle: "ariachen",
			text: "Most AI assistants just rephrase the timeline. What would a reply agent actually decide not to say?",
			createdAt: isoHoursAgo(5),
			context: "Mention with no parent post stored. The question is about refusal, not volume.",
			read: false,
			source: "sample"
		},
		{
			id: "n2",
			kind: "reply",
			authorName: "Kepler Lab",
			authorHandle: "keplerlab",
			text: "If launch cadence doubles, does ground ops or range availability break first?",
			createdAt: isoHoursAgo(9),
			context: "Reply to a post about cadence. Prior point: hardware is ahead of the calendar that clears it.",
			read: false,
			source: "sample"
		},
		{
			id: "n3",
			kind: "mention",
			authorName: "Mina Okonkwo",
			authorHandle: "minaokonkwo",
			text: "Hot take: posting more is not a growth strategy. Distribution is a product.",
			createdAt: isoHoursAgo(18),
			context: "Mention. Author argues cadence without distribution is noise.",
			read: true,
			source: "sample"
		},
		{
			id: "n4",
			kind: "reply",
			authorName: "Leah Voss",
			authorHandle: "leahvoss",
			text: "Do you still write the first draft yourself, or has the assistant taken that too?",
			createdAt: isoHoursAgo(26),
			context: "Reply on a thread about keeping a human approval step.",
			read: true,
			source: "sample"
		}
	];
	return {
		account: {
			status: "sample",
			name: "Avery Quinn",
			handle: "averybuilds",
			followers,
			following: 512,
			userId: null
		},
		notices,
		drafts: [{
			id: "d1",
			noticeId: "n3",
			style: "intelligent",
			text: "@minaokonkwo Posting more is a cost. Distribution is the product decision: who sees it, when, and why they would care.",
			status: "approved",
			source: "template",
			updatedAt: isoHoursAgo(3)
		}],
		posts: [
			{
				id: "p1",
				text: "A reply agent that cannot refuse is just a faster way to sound like everyone else.",
				status: "published",
				scheduledFor: null,
				publishedAt: isoHoursAgo(30),
				likes: 842,
				reposts: 96,
				replies: 41,
				impressions: 128400,
				illustrative: true
			},
			{
				id: "p2",
				text: "Cadence is a vanity metric if the bottleneck is range time, review, or power. Fix the constraint you can name.",
				status: "published",
				scheduledFor: null,
				publishedAt: isoHoursAgo(70),
				likes: 1204,
				reposts: 188,
				replies: 73,
				impressions: 240110,
				illustrative: true
			},
			{
				id: "p3",
				text: "Inference cost is not the price of a token. It is the price of a correct outcome, including the retries.",
				status: "published",
				scheduledFor: null,
				publishedAt: isoHoursAgo(120),
				likes: 656,
				reposts: 54,
				replies: 22,
				impressions: null,
				illustrative: true
			},
			{
				id: "p4",
				text: "Drafting a note on what we will not automate. Approval stays manual.",
				status: "draft",
				scheduledFor: null,
				publishedAt: null,
				likes: 0,
				reposts: 0,
				replies: 0,
				impressions: null,
				illustrative: false
			},
			{
				id: "p5",
				text: "Tomorrow: a short thread on distribution as a product surface, not a growth hack.",
				status: "scheduled",
				scheduledFor: (/* @__PURE__ */ new Date(Math.floor(Date.now() / 36e5) * 36e5 + 936e5)).toISOString(),
				publishedAt: null,
				likes: 0,
				reposts: 0,
				replies: 0,
				impressions: null,
				illustrative: false
			}
		],
		people: [
			{
				id: "u1",
				name: "Aria Chen",
				handle: "ariachen",
				followers: 22100,
				relation: "follows_you",
				intent: null,
				liked: false
			},
			{
				id: "u2",
				name: "Kepler Lab",
				handle: "keplerlab",
				followers: 89040,
				relation: "mutual",
				intent: null,
				liked: false
			},
			{
				id: "u3",
				name: "Mina Okonkwo",
				handle: "minaokonkwo",
				followers: 14002,
				relation: "following",
				intent: null,
				liked: true
			},
			{
				id: "u4",
				name: "Jun Park",
				handle: "junpark",
				followers: 6700,
				relation: "none",
				intent: null,
				liked: false
			},
			{
				id: "u5",
				name: "Leah Voss",
				handle: "leahvoss",
				followers: 3104,
				relation: "follows_you",
				intent: null,
				liked: false
			}
		],
		snapshots,
		weekly: [
			{
				label: "W-7",
				likes: 420,
				reposts: 40,
				replies: 18
			},
			{
				label: "W-6",
				likes: 510,
				reposts: 48,
				replies: 22
			},
			{
				label: "W-5",
				likes: 380,
				reposts: 31,
				replies: 14
			},
			{
				label: "W-4",
				likes: 640,
				reposts: 70,
				replies: 28
			},
			{
				label: "W-3",
				likes: 590,
				reposts: 61,
				replies: 25
			},
			{
				label: "W-2",
				likes: 710,
				reposts: 80,
				replies: 33
			},
			{
				label: "W-1",
				likes: 880,
				reposts: 102,
				replies: 44
			},
			{
				label: "Now",
				likes: 656,
				reposts: 54,
				replies: 22
			}
		],
		monthly: [
			5,
			4,
			3,
			2,
			1,
			0
		].map((offset, index) => ({
			label: monthLabel(offset),
			posts: 6 + index * 2,
			engagements: 900 + index * 420
		})),
		usage: [],
		prefs: {
			style: "intelligent",
			budgetUsd: 10,
			hardStop: true
		},
		lastSyncAt: null,
		syncTimes: [],
		selectedNoticeId: "n1",
		mentionsCache: null,
		mentionsCachedAt: null
	};
}
//#endregion
//#region src/lib/store.ts
function uid(prefix) {
	return `${prefix}-${Math.random().toString(36).slice(2, 10)}`;
}
function spendOf(usage) {
	return usage.reduce((sum, event) => sum + event.usd, 0);
}
var useAgent = create()(persist((set, get) => ({
	...buildWorkspace(),
	epoch: 0,
	spend: () => spendOf(get().usage),
	canSpend: (usd) => {
		const state = get();
		if (state.account.status === "disconnected") return {
			ok: false,
			reason: "disconnected"
		};
		if (!state.prefs.hardStop) return { ok: true };
		if (state.spend() + usd > state.prefs.budgetUsd + 1e-9) return {
			ok: false,
			reason: "budget"
		};
		return { ok: true };
	},
	connectSample: () => {
		set({
			...buildWorkspace(),
			prefs: get().prefs
		});
	},
	applyLiveAccount: (account) => {
		set({
			account: {
				status: "live",
				name: account.name,
				handle: account.handle.replace(/^@/, ""),
				followers: account.followers,
				following: account.following,
				userId: account.userId
			},
			mentionsCache: null,
			mentionsCachedAt: null
		});
	},
	disconnect: () => {
		set({
			account: {
				status: "disconnected",
				name: "",
				handle: "",
				followers: 0,
				following: 0,
				userId: null
			},
			mentionsCache: null,
			mentionsCachedAt: null
		});
	},
	selectNotice: (id) => set({ selectedNoticeId: id }),
	markRead: (id) => set({ notices: get().notices.map((notice) => notice.id === id ? {
		...notice,
		read: true
	} : notice) }),
	markAllRead: () => set({ notices: get().notices.map((notice) => ({
		...notice,
		read: true
	})) }),
	logUsage: (partial) => {
		set({ usage: [{
			...partial,
			id: uid("use"),
			at: (/* @__PURE__ */ new Date()).toISOString()
		}, ...get().usage].slice(0, 50) });
	},
	touchSync: (at) => set({
		lastSyncAt: new Date(at).toISOString(),
		syncTimes: [...get().syncTimes.filter((time) => at - time < 9e5), at].slice(-20)
	}),
	noteCachedSync: () => {
		get().logUsage({
			kind: "x_read",
			detail: "Served from the one-minute cache. No new X request.",
			usd: 0,
			cached: true
		});
	},
	mergeNotices: (incoming, meta) => {
		const known = new Set(get().notices.map((notice) => notice.id));
		const fresh = incoming.filter((notice) => !known.has(notice.id));
		set({
			notices: [...fresh, ...get().notices],
			mentionsCache: incoming,
			mentionsCachedAt: Date.now()
		});
		get().touchSync(Date.now());
		get().logUsage({
			kind: "x_read",
			detail: meta.detail,
			usd: meta.usd,
			cached: meta.cached
		});
		return fresh.length;
	},
	syncSample: () => {
		const state = get();
		if (state.account.status === "disconnected") return {
			ok: false,
			reason: "disconnected"
		};
		const now = Date.now();
		if (state.syncTimes.filter((time) => now - time < 9e5).length >= 8) return {
			ok: false,
			reason: "rate"
		};
		if (state.lastSyncAt && now - new Date(state.lastSyncAt).getTime() < 6e4) {
			get().noteCachedSync();
			return {
				ok: true,
				added: 0,
				cached: true
			};
		}
		const known = new Set(state.notices.map((notice) => notice.id));
		const batch = SAMPLE_QUEUE.filter((notice) => !known.has(notice.id)).slice(0, 1);
		set({ notices: [...batch, ...state.notices] });
		get().touchSync(now);
		get().logUsage({
			kind: "x_read",
			detail: batch.length ? "Sample mention added locally. No request was sent to X." : "Sample inbox is current. No request was sent to X.",
			usd: 0,
			cached: false
		});
		return {
			ok: true,
			added: batch.length,
			cached: false
		};
	},
	saveDraft: ({ noticeId, style, text, source }) => {
		const existing = get().drafts.find((draft) => draft.noticeId === noticeId && draft.status !== "published");
		const updatedAt = (/* @__PURE__ */ new Date()).toISOString();
		if (existing) {
			set({ drafts: get().drafts.map((draft) => draft.id === existing.id ? {
				...draft,
				style,
				text,
				source,
				status: "draft",
				updatedAt
			} : draft) });
			return existing.id;
		}
		const id = uid("draft");
		set({ drafts: [{
			id,
			noticeId,
			style,
			text,
			status: "draft",
			source,
			updatedAt
		}, ...get().drafts] });
		return id;
	},
	editDraft: (id, text) => set({ drafts: get().drafts.map((draft) => draft.id === id ? {
		...draft,
		text,
		source: "edited",
		status: draft.status === "published" ? "published" : "draft",
		updatedAt: (/* @__PURE__ */ new Date()).toISOString()
	} : draft) }),
	setDraftStatus: (id, status) => set({ drafts: get().drafts.map((draft) => draft.id === id ? {
		...draft,
		status,
		updatedAt: (/* @__PURE__ */ new Date()).toISOString()
	} : draft) }),
	savePost: ({ id, text, status, scheduledFor }) => {
		const posts = get().posts;
		if (id) {
			set({ posts: posts.map((post) => post.id === id ? {
				...post,
				text,
				status,
				scheduledFor,
				illustrative: false
			} : post) });
			return;
		}
		set({ posts: [{
			id: uid("post"),
			text,
			status,
			scheduledFor,
			publishedAt: null,
			likes: 0,
			reposts: 0,
			replies: 0,
			impressions: null,
			illustrative: false
		}, ...posts] });
	},
	markDue: () => {
		const now = Date.now();
		set({ posts: get().posts.map((post) => {
			if (post.status !== "scheduled" || !post.scheduledFor) return post;
			if (new Date(post.scheduledFor).getTime() > now) return post;
			return {
				...post,
				status: "due"
			};
		}) });
	},
	publishPost: (id) => set({
		posts: get().posts.map((post) => post.id === id ? {
			...post,
			status: "published",
			publishedAt: (/* @__PURE__ */ new Date()).toISOString(),
			scheduledFor: null
		} : post),
		weekly: get().weekly.map((point, index, all) => index === all.length - 1 ? {
			...point,
			likes: point.likes
		} : point)
	}),
	publishDraft: (id) => set({ drafts: get().drafts.map((draft) => draft.id === id ? {
		...draft,
		status: "published",
		updatedAt: (/* @__PURE__ */ new Date()).toISOString()
	} : draft) }),
	toggleIntent: (id) => set({ people: get().people.map((person) => {
		if (person.id !== id) return person;
		const next = person.relation === "following" || person.relation === "mutual" ? "unfollow" : "follow";
		return {
			...person,
			intent: person.intent ? null : next
		};
	}) }),
	toggleLiked: (id) => set({ people: get().people.map((person) => person.id === id ? {
		...person,
		liked: !person.liked
	} : person) }),
	setPeople: (people) => set({ people }),
	setPrefs: (prefs) => set({ prefs: {
		...get().prefs,
		...prefs
	} }),
	resetSample: () => {
		const prefs = get().prefs;
		set({
			...buildWorkspace(),
			prefs
		});
	}
}), {
	name: "era-workspace-v1",
	skipHydration: true,
	partialize: (state) => ({
		account: state.account,
		notices: state.notices,
		drafts: state.drafts,
		posts: state.posts,
		people: state.people,
		snapshots: state.snapshots,
		weekly: state.weekly,
		monthly: state.monthly,
		usage: state.usage,
		prefs: state.prefs,
		lastSyncAt: state.lastSyncAt,
		syncTimes: state.syncTimes,
		selectedNoticeId: state.selectedNoticeId,
		mentionsCache: state.mentionsCache,
		mentionsCachedAt: state.mentionsCachedAt
	}),
	onRehydrateStorage: () => () => {
		useAgent.setState({ epoch: Date.now() });
	}
}));
function pendingCount(state) {
	return state.notices.filter((notice) => {
		return !state.drafts.filter((draft) => draft.noticeId === notice.id).some((draft) => draft.status === "approved" || draft.status === "published");
	}).length;
}
function activeDraft(state, noticeId) {
	const related = state.drafts.filter((draft) => draft.noticeId === noticeId);
	return related.find((draft) => draft.status !== "rejected") ?? related[0] ?? null;
}
//#endregion
//#region src/components/connect-panel.tsx
function ConnectXButton({ onMissing, className }) {
	const [checking, setChecking] = useState(false);
	async function connectLive() {
		setChecking(true);
		try {
			const data = await (await fetch("/api/x/auth?check=1")).json();
			if (!data.configured) {
				const missing = data.missing ?? ["X credentials"];
				if (onMissing) onMissing(missing);
				else toast.error(`X connection is not configured: ${missing.join(", ")}`);
				return;
			}
			window.location.href = "/api/x/auth";
		} catch {
			toast.error("Could not reach the X connection service.");
		} finally {
			setChecking(false);
		}
	}
	return /* @__PURE__ */ jsx(Button, {
		type: "button",
		variant: "primary",
		className,
		disabled: checking,
		onClick: () => void connectLive(),
		children: checking ? "Checking" : "Connect X"
	});
}
function ConnectPanel({ compact = false }) {
	const connectSample = useAgent((state) => state.connectSample);
	const [missing, setMissing] = useState(null);
	return /* @__PURE__ */ jsxs("div", {
		className: compact ? "space-y-3" : "space-y-4 rounded-lg border border-line bg-surface p-5",
		children: [
			!compact ? /* @__PURE__ */ jsxs("div", { children: [/* @__PURE__ */ jsx("h2", {
				className: "text-lg font-semibold tracking-tight",
				children: "Connect X"
			}), /* @__PURE__ */ jsx("p", {
				className: "mt-1 text-sm text-muted",
				children: "Official OAuth 2.0 with PKCE. Tokens stay encrypted on the server. Replies never post until you confirm each one."
			})] }) : null,
			/* @__PURE__ */ jsxs("div", {
				className: "flex flex-wrap gap-2",
				children: [/* @__PURE__ */ jsx(ConnectXButton, { onMissing: setMissing }), /* @__PURE__ */ jsx(Button, {
					type: "button",
					variant: "outline",
					onClick: () => connectSample(),
					children: "Use sample workspace"
				})]
			}),
			missing ? /* @__PURE__ */ jsxs("p", {
				className: "text-sm text-muted",
				children: [
					"Live connection is waiting on ",
					missing.join(", "),
					". The sample workspace lets you rehearse every step without calling X."
				]
			}) : null
		]
	});
}
//#endregion
//#region src/components/stamp.tsx
function useNow() {
	const [now, setNow] = useState(null);
	useEffect(() => {
		setNow(Date.now());
		const id = setInterval(() => setNow(Date.now()), 3e4);
		return () => clearInterval(id);
	}, []);
	return now;
}
function Stamp({ iso }) {
	const now = useNow();
	return /* @__PURE__ */ jsx("time", {
		dateTime: iso,
		className: "text-xs tabular-nums text-muted",
		children: now ? rel(iso, now) : "Recent"
	});
}
//#endregion
//#region src/components/app-shell.tsx
var NAV = [
	{
		to: "/",
		label: "Command",
		short: "Home",
		icon: LayoutDashboard
	},
	{
		to: "/inbox",
		label: "Inbox",
		short: "Inbox",
		icon: Inbox
	},
	{
		to: "/studio",
		label: "Replies",
		short: "Reply",
		icon: PenLine
	},
	{
		to: "/research",
		label: "Research",
		short: "Research",
		icon: Search
	},
	{
		to: "/posts",
		label: "Posts",
		short: "Post",
		icon: Send
	},
	{
		to: "/engagement",
		label: "People",
		short: "People",
		icon: Users
	},
	{
		to: "/analytics",
		label: "Analytics",
		short: "Stats",
		icon: ChartColumn
	},
	{
		to: "/usage",
		label: "Usage",
		short: "Usage",
		icon: Gauge
	}
];
function AppShell({ title, children }) {
	const path = useRouterState({ select: (state) => state.location.pathname });
	const account = useAgent((state) => state.account);
	const lastSyncAt = useAgent((state) => state.lastSyncAt);
	const spend = useAgent((state) => state.usage.reduce((sum, event) => sum + event.usd, 0));
	const budget = useAgent((state) => state.prefs.budgetUsd);
	const unread = useAgent((state) => state.notices.filter((notice) => !notice.read).length);
	const pending = useAgent(pendingCount);
	const [more, setMore] = useState(false);
	const [syncing, setSyncing] = useState(false);
	const now = useNow();
	useEffect(() => {
		let cancelled = false;
		(async () => {
			await useAgent.persist.rehydrate();
			if (cancelled) return;
			useAgent.getState().markDue();
			try {
				const data = await (await fetch("/api/x/mentions?probe=1")).json();
				if (cancelled) return;
				if (data.expired) {
					useAgent.getState().disconnect();
					toast.error(data.error || "X credentials expired. Reconnect.");
					return;
				}
				if (data.account) useAgent.getState().applyLiveAccount(data.account);
			} catch {}
		})();
		return () => {
			cancelled = true;
		};
	}, []);
	async function disconnect() {
		await fetch("/api/x/auth", { method: "DELETE" }).catch(() => void 0);
		useAgent.getState().disconnect();
		toast("X account disconnected");
	}
	async function sync() {
		const state = useAgent.getState();
		if (state.account.status === "disconnected") {
			toast.error("Connect a workspace first.");
			return;
		}
		const nowMs = Date.now();
		if (state.syncTimes.filter((time) => nowMs - time < 9e5).length >= 8) {
			toast.error("Paused. Eight syncs in 15 minutes is the guard.");
			return;
		}
		if (state.account.status === "sample") {
			const result = state.syncSample();
			if (!result.ok) {
				toast.error(result.reason === "rate" ? "Paused. Eight syncs in 15 minutes is the guard." : "Connect a workspace first.");
				return;
			}
			toast(result.cached ? "Sample inbox is cached for a minute." : result.added ? "Sample mention added. X was not called." : "Sample inbox is current. X was not called.");
			return;
		}
		if (state.mentionsCachedAt && nowMs - state.mentionsCachedAt < 6e4) {
			state.noteCachedSync();
			toast("Mentions are still inside the one-minute cache.");
			return;
		}
		if (!state.canSpend(COSTS.mention).ok) {
			toast.error("Estimated spend is at the limit. Sync is stopped.");
			return;
		}
		setSyncing(true);
		try {
			const res = await fetch("/api/x/mentions");
			const data = await res.json();
			if (data.account) state.applyLiveAccount(data.account);
			if (!res.ok || !data.ok) {
				if (data.expired) state.disconnect();
				toast.error(data.error || "Sync failed");
				return;
			}
			const added = state.mergeNotices(data.mentions ?? [], {
				usd: COSTS.mention,
				detail: "Mentions read from X API v2",
				cached: false
			});
			toast(added ? `${added} new from X` : "No new mentions from X");
		} catch {
			toast.error("Sync failed");
		} finally {
			setSyncing(false);
		}
	}
	const mobile = NAV.filter((item) => [
		"/",
		"/inbox",
		"/studio",
		"/research"
	].includes(item.to));
	const overflow = NAV.filter((item) => ![
		"/",
		"/inbox",
		"/studio",
		"/research"
	].includes(item.to));
	const ratio = budget > 0 ? Math.min(1, spend / budget) : 1;
	return /* @__PURE__ */ jsxs("div", {
		className: "min-h-dvh bg-bg text-fg",
		children: [
			/* @__PURE__ */ jsxs("aside", {
				className: "fixed inset-y-0 left-0 z-30 hidden w-60 flex-col border-r border-line bg-bg md:flex",
				children: [
					/* @__PURE__ */ jsx("div", {
						className: "px-4 pt-6 pb-4",
						children: /* @__PURE__ */ jsxs("div", {
							className: "flex items-center gap-3",
							children: [/* @__PURE__ */ jsx("span", {
								className: "grid size-9 place-items-center rounded-lg bg-accent text-sm font-semibold text-accent-fg",
								children: "E"
							}), /* @__PURE__ */ jsxs("div", { children: [/* @__PURE__ */ jsx("p", {
								className: "text-sm font-semibold tracking-tight",
								children: "Elon Reply"
							}), /* @__PURE__ */ jsx("p", {
								className: "text-xs text-muted",
								children: "Agent"
							})] })]
						})
					}),
					/* @__PURE__ */ jsx("nav", {
						className: "flex flex-1 flex-col gap-1 px-3",
						children: NAV.map((item) => {
							const active = path === item.to;
							const Icon = item.icon;
							const badge = item.to === "/inbox" ? unread : item.to === "/studio" ? pending : 0;
							return /* @__PURE__ */ jsxs(Link, {
								to: item.to,
								className: cn("flex min-h-11 items-center gap-3 rounded-lg px-3 text-sm", active ? "bg-surface-2 text-fg" : "text-muted hover:bg-surface hover:text-fg"),
								children: [
									/* @__PURE__ */ jsx(Icon, {
										className: "size-4",
										"aria-hidden": "true"
									}),
									/* @__PURE__ */ jsx("span", {
										className: "flex-1",
										children: item.label
									}),
									badge > 0 ? /* @__PURE__ */ jsx("span", {
										className: "tabular-nums text-xs text-accent",
										children: badge
									}) : null
								]
							}, item.to);
						})
					}),
					/* @__PURE__ */ jsx("div", {
						className: "border-t border-line p-4",
						children: account.status === "disconnected" ? /* @__PURE__ */ jsx(ConnectPanel, { compact: true }) : /* @__PURE__ */ jsxs("div", {
							className: "space-y-3",
							children: [/* @__PURE__ */ jsxs("div", { children: [
								/* @__PURE__ */ jsx("p", {
									className: "text-sm font-medium",
									children: account.name
								}),
								/* @__PURE__ */ jsxs("p", {
									className: "text-xs text-muted",
									children: ["@", account.handle]
								}),
								/* @__PURE__ */ jsx("p", {
									className: "mt-1 text-xs text-muted",
									children: account.status === "live" ? "Live X account" : "Sample workspace"
								})
							] }), /* @__PURE__ */ jsx(Button, {
								type: "button",
								variant: "ghost",
								className: "w-full",
								onClick: () => void disconnect(),
								children: "Disconnect"
							})]
						})
					})
				]
			}),
			/* @__PURE__ */ jsx("div", {
				className: "md:pl-60",
				children: /* @__PURE__ */ jsxs("div", {
					className: "mx-auto w-full max-w-6xl px-4 pt-5 pb-28 md:px-8 md:pt-8 md:pb-12",
					children: [
						account.status === "sample" ? /* @__PURE__ */ jsx("p", {
							className: "mb-5 rounded-lg border border-line bg-surface px-3 py-2 text-sm text-muted",
							children: "Sample workspace. These mentions are fixtures so you can rehearse the workflow. They are not your X notifications, and nothing is sent to X."
						}) : null,
						/* @__PURE__ */ jsxs("div", {
							className: "mb-6 flex flex-wrap items-end justify-between gap-3",
							children: [/* @__PURE__ */ jsxs("div", { children: [/* @__PURE__ */ jsx("p", {
								className: "text-xs tracking-widest text-muted uppercase",
								children: "Elon Reply Agent"
							}), /* @__PURE__ */ jsx("h1", {
								className: "text-2xl font-semibold tracking-tight",
								children: title
							})] }), /* @__PURE__ */ jsxs("div", {
								className: "flex items-center gap-3",
								children: [
									/* @__PURE__ */ jsx("p", {
										className: "text-xs text-muted tabular-nums",
										children: lastSyncAt && now ? `Synced ${rel(lastSyncAt, now)}` : "Not synced yet"
									}),
									account.status !== "live" ? /* @__PURE__ */ jsx(ConnectXButton, { className: "shrink-0" }) : null,
									/* @__PURE__ */ jsx(Button, {
										type: "button",
										variant: "primary",
										disabled: syncing,
										onClick: () => void sync(),
										children: syncing ? "Syncing" : "Sync"
									})
								]
							})]
						}),
						/* @__PURE__ */ jsxs("div", {
							className: "mb-6",
							children: [/* @__PURE__ */ jsxs("div", {
								className: "mb-1 flex justify-between text-xs text-muted tabular-nums",
								children: [/* @__PURE__ */ jsxs("span", { children: ["Estimated spend ", money(spend)] }), /* @__PURE__ */ jsxs("span", { children: ["Limit ", money(budget)] })]
							}), /* @__PURE__ */ jsx("div", {
								className: "h-1 overflow-hidden rounded-full bg-surface-2",
								children: /* @__PURE__ */ jsx("div", {
									className: "h-full bg-accent",
									style: { width: `${ratio * 100}%` }
								})
							})]
						}),
						children
					]
				})
			}),
			more ? /* @__PURE__ */ jsx("div", {
				className: "fixed inset-x-0 bottom-16 z-40 border-t border-line bg-surface p-3 md:hidden",
				children: overflow.map((item) => /* @__PURE__ */ jsx(Link, {
					to: item.to,
					onClick: () => setMore(false),
					className: "flex min-h-11 items-center rounded-lg px-3 text-sm",
					children: item.label
				}, item.to))
			}) : null,
			/* @__PURE__ */ jsx("nav", {
				className: "fixed inset-x-0 bottom-0 z-40 border-t border-line bg-bg md:hidden",
				children: /* @__PURE__ */ jsxs("div", {
					className: "grid grid-cols-5",
					children: [mobile.map((item) => {
						const active = path === item.to;
						const Icon = item.icon;
						return /* @__PURE__ */ jsxs(Link, {
							to: item.to,
							className: cn("flex min-h-14 flex-col items-center justify-center gap-1 text-xs", active ? "text-fg" : "text-muted"),
							children: [/* @__PURE__ */ jsx(Icon, {
								className: "size-4",
								"aria-hidden": "true"
							}), item.short]
						}, item.to);
					}), /* @__PURE__ */ jsxs("button", {
						type: "button",
						className: cn("flex min-h-14 flex-col items-center justify-center gap-1 text-xs", overflow.some((item) => item.to === path) ? "text-fg" : "text-muted"),
						onClick: () => setMore((open) => !open),
						children: [/* @__PURE__ */ jsx(Gauge, {
							className: "size-4",
							"aria-hidden": "true"
						}), "More"]
					})]
				})
			})
		]
	});
}
//#endregion
export { pendingCount as a, compact as c, Button as d, cn as f, activeDraft as i, money as l, Stamp as n, useAgent as o, ConnectPanel as r, COSTS as s, AppShell as t, utcDay as u };
