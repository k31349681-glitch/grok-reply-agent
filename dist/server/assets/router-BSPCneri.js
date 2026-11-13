import { r as parseDraftInput, t as draftReply } from "./draft-reply.server-DccYMqXl.js";
import { useEffect } from "react";
import { HeadContent, Outlet, Scripts, createFileRoute, createRootRoute, createRouter, lazyRouteComponent, useRouter } from "@tanstack/react-router";
import { Fragment, jsx, jsxs } from "react/jsx-runtime";
import { TriangleAlert } from "lucide-react";
import { Toaster } from "sonner";
import { z } from "zod";
//#region src/lib/error-component.tsx
var FALLBACK_MESSAGE = "An unexpected error occurred. Try reloading the page.";
function errorMessage(error) {
	if (error instanceof Error && error.message) return error.message;
	if (typeof error === "string" && error) return error;
	return FALLBACK_MESSAGE;
}
function AppErrorComponent({ error }) {
	return /* @__PURE__ */ jsxs("main", {
		className: "flex min-h-screen flex-col items-center justify-center gap-3 bg-bg px-6 text-center text-fg",
		children: [
			/* @__PURE__ */ jsx("span", {
				className: "text-accent",
				"aria-hidden": "true",
				children: /* @__PURE__ */ jsx(TriangleAlert, {
					className: "size-10",
					strokeWidth: 2
				})
			}),
			/* @__PURE__ */ jsx("h1", {
				className: "text-lg font-semibold",
				children: "Something went wrong"
			}),
			/* @__PURE__ */ jsx("p", {
				className: "max-w-md text-sm break-words text-muted",
				children: errorMessage(error)
			})
		]
	});
}
//#endregion
//#region src/lib/preview-path-prefix.ts
/**
* Path-based preview hosts serve the dev server under `/{port_id}/` and strip
* that prefix before forwarding, so SSR sees `/` while the browser URL keeps the
* prefix. TanStack Start resets `basepath` on hydration, so a `rewrite` keeps
* client routing and generated links aligned with the public URL.
*/
var PATH_BASED_PREVIEW_HOSTS = /* @__PURE__ */ new Set([
	"preview.grok.genai.mil",
	"preview.grok.mil",
	"preview.grokgsac.com"
]);
var PORT_ID_PREFIX = /^\/hds-[a-z0-9]+-\d+-[a-z0-9]+(?=\/|$)/i;
function previewPathPrefix(hostname, pathname) {
	if (!PATH_BASED_PREVIEW_HOSTS.has(hostname.toLowerCase())) return void 0;
	return PORT_ID_PREFIX.exec(pathname)?.[0];
}
function prefixRewrite(prefix) {
	return {
		input: ({ url }) => {
			if (url.pathname === prefix) url.pathname = "/";
			else if (url.pathname.startsWith(`${prefix}/`)) url.pathname = url.pathname.slice(prefix.length);
			return url;
		},
		output: ({ url }) => {
			url.pathname = `${prefix}${url.pathname}`;
			return url;
		}
	};
}
function previewPathRewrite() {
	if (typeof window === "undefined") return void 0;
	const prefix = previewPathPrefix(window.location.hostname, window.location.pathname);
	return prefix ? prefixRewrite(prefix) : void 0;
}
//#endregion
//#region src/lib/auth/provider.tsx
/**
* App-wide client provider mounted once near the root (in `src/routes/__root.tsx`):
*
*   <AuthProvider><Outlet /></AuthProvider>
*
* Better Auth's React client (`@/lib/auth/client`) needs NO context provider —
* its `useSession()` works standalone — so this is a passthrough today. It's
* kept as the single, stable mount point for any future client-side providers
* (e.g. a toast or theme provider) without churning the root shell.
*/
function AuthProvider({ children }) {
	return /* @__PURE__ */ jsx(Fragment, { children });
}
//#endregion
//#region src/lib/app-data/types.ts
var CONNECTOR_TOKEN_READY_EVENT = "grok:connector-token-ready";
//#endregion
//#region src/lib/preview-embedder-origin.ts
function isGrokEmbedderOrigin(origin) {
	try {
		const url = new URL(origin);
		if (url.protocol !== "https:" && url.protocol !== "http:") return false;
		const host = url.hostname.toLowerCase();
		if (host === "grok.com" || host.endsWith(".grok.com")) return true;
		if (host === "localhost" || host === "127.0.0.1" || host === "[::1]") return true;
		return false;
	} catch {
		return false;
	}
}
function isSandboxPreviewGuestHost(hostname) {
	const host = hostname.toLowerCase();
	return host === "grok-sandbox.com" || host.endsWith(".grok-sandbox.com");
}
function isRemintPreviewPair(guestHost, parentHost) {
	const guest = guestHost.toLowerCase();
	const parent = parentHost.toLowerCase();
	const i = guest.indexOf(".preview.");
	if (i <= 0) return false;
	const label = guest.slice(0, i);
	const rest = guest.slice(i + 9);
	if (label.includes(".") || !rest.includes(".")) return false;
	return parent === rest || parent === `grok.${rest}`;
}
function resolveParentEmbedderOrigin(parentIsSelf, referrer, ancestorOrigin, guestHostname = "") {
	if (parentIsSelf) return null;
	for (const candidate of [referrer, ancestorOrigin ?? ""].filter(Boolean)) try {
		const url = new URL(candidate.includes("://") ? candidate : `https://${candidate}`);
		if (url.protocol !== "https:" && url.protocol !== "http:") continue;
		if (isGrokEmbedderOrigin(url.origin)) return url.origin;
		if (isSandboxPreviewGuestHost(guestHostname) || isRemintPreviewPair(guestHostname, url.hostname)) return url.origin;
	} catch {}
	return null;
}
//#endregion
//#region src/lib/preview-host-bridge.ts
/**
* Guest side of the grok-web ↔ sandbox preview postMessage bridge.
*
* Activates only when this page is framed by an allowlisted Grok embedder.
* Top-level runs (download/export, local `npm run dev`, deployed sites) noop.
*/
var PREVIEW_BRIDGE_CHANNEL = "grok-preview-bridge";
var EnvelopeSchema = z.object({
	channel: z.literal(PREVIEW_BRIDGE_CHANNEL),
	version: z.number().int().positive(),
	type: z.string().min(1)
});
var HelloSchema = EnvelopeSchema.extend({ type: z.literal("hello") });
var NavigateSchema = EnvelopeSchema.extend({
	type: z.literal("navigate"),
	path: z.string().min(1)
});
var HistorySchema = EnvelopeSchema.extend({
	type: z.literal("history"),
	delta: z.union([z.literal(-1), z.literal(1)])
});
var ConnectorTokenReadySchema = EnvelopeSchema.extend({ type: z.literal("connector-token-ready") });
function isSafeBridgePath(path) {
	if (!path.startsWith("/") || path.startsWith("//") || path.includes("\\")) return false;
	try {
		return new URL(path, "https://preview.invalid").origin === "https://preview.invalid";
	} catch {
		return false;
	}
}
/**
* Origin of the Grok embedder framing this page, or null when the page runs
* top-level (download/export, local `npm run dev`, deployed sites) or under a
* non-Grok parent. Client-only; null during SSR.
*/
function resolveCurrentEmbedderOrigin() {
	if (typeof window === "undefined") return null;
	const ancestorOrigin = typeof location.ancestorOrigins !== "undefined" && location.ancestorOrigins.length > 0 ? location.ancestorOrigins[0] : null;
	return resolveParentEmbedderOrigin(window.parent === window, document.referrer, ancestorOrigin, window.location.hostname);
}
/**
* Install host↔guest messaging. Returns a dispose function.
* Noops (returns a no-op dispose) when not embedded under a Grok parent.
*/
function installPreviewHostBridge(options = {}) {
	const parentOrigin = resolveCurrentEmbedderOrigin();
	if (parentOrigin === null) return () => {};
	const ROOT_STATE_KEY = "__grokPreviewBridgeRoot";
	const originalPushState = window.history.pushState.bind(window.history);
	const originalReplaceState = window.history.replaceState.bind(window.history);
	const isAtHistoryRoot = () => {
		const state = window.history.state;
		return Boolean(state && typeof state === "object" && state[ROOT_STATE_KEY] === true);
	};
	try {
		const current = window.history.state;
		if (!(current !== null && typeof current === "object" && Object.prototype.hasOwnProperty.call(current, ROOT_STATE_KEY))) {
			const isRoot = window.history.length <= 1;
			originalReplaceState(current && typeof current === "object" ? {
				...current,
				[ROOT_STATE_KEY]: isRoot
			} : { [ROOT_STATE_KEY]: isRoot }, "", window.location.href);
		}
	} catch {}
	const post = (message) => {
		window.parent.postMessage(message, parentOrigin);
	};
	const reportLocation = () => {
		post({
			channel: PREVIEW_BRIDGE_CHANNEL,
			version: 1,
			type: "location",
			path: window.location.pathname || "/",
			search: window.location.search,
			hash: window.location.hash
		});
	};
	const reportRoutes = () => {
		const paths = options.getRoutePaths?.() ?? [];
		post({
			channel: PREVIEW_BRIDGE_CHANNEL,
			version: 1,
			type: "routes",
			paths
		});
	};
	const defaultNavigate = (path) => {
		if (!isSafeBridgePath(path)) return;
		try {
			const url = new URL(path, window.location.origin);
			if (url.origin !== window.location.origin) return;
			const next = `${url.pathname}${url.search}${url.hash}`;
			window.history.pushState(window.history.state, "", next);
			window.dispatchEvent(new PopStateEvent("popstate", { state: window.history.state }));
		} catch {}
	};
	const navigate = (path) => {
		if (!isSafeBridgePath(path)) return;
		if (options.navigate) {
			options.navigate(path);
			return;
		}
		defaultNavigate(path);
	};
	const announce = () => {
		reportLocation();
		reportRoutes();
		post({
			channel: PREVIEW_BRIDGE_CHANNEL,
			version: 1,
			type: "ready"
		});
	};
	const onHello = (data) => {
		if (!HelloSchema.safeParse(data).success) return;
		announce();
	};
	const onNavigate = (data) => {
		const parsed = NavigateSchema.safeParse(data);
		if (!parsed.success) return;
		navigate(parsed.data.path);
		queueMicrotask(reportLocation);
	};
	const onHistory = (data) => {
		const parsed = HistorySchema.safeParse(data);
		if (!parsed.success) return;
		if (parsed.data.delta === -1 && isAtHistoryRoot()) return;
		window.history.go(parsed.data.delta);
	};
	const onConnectorTokenReady = (data) => {
		if (!ConnectorTokenReadySchema.safeParse(data).success) return;
		window.dispatchEvent(new Event(CONNECTOR_TOKEN_READY_EVENT));
	};
	const hostMessageHandlers = /* @__PURE__ */ new Map([
		["hello", onHello],
		["navigate", onNavigate],
		["history", onHistory],
		["connector-token-ready", onConnectorTokenReady]
	]);
	const onMessage = (event) => {
		if (event.source !== window.parent) return;
		if (event.origin !== parentOrigin) return;
		const envelope = EnvelopeSchema.safeParse(event.data);
		if (!envelope.success || envelope.data.version !== 1) return;
		hostMessageHandlers.get(envelope.data.type)?.(event.data);
	};
	const onPopState = () => {
		reportLocation();
	};
	const onHashChange = () => {
		reportLocation();
	};
	window.history.pushState = (data, unused, url) => {
		const next = data && typeof data === "object" ? {
			...data,
			[ROOT_STATE_KEY]: false
		} : data;
		originalPushState(next, unused, url);
		reportLocation();
	};
	window.history.replaceState = (data, unused, url) => {
		const next = isAtHistoryRoot() ? {
			...data && typeof data === "object" ? data : {},
			[ROOT_STATE_KEY]: true
		} : data;
		originalReplaceState(next, unused, url);
		reportLocation();
	};
	window.addEventListener("message", onMessage);
	window.addEventListener("popstate", onPopState);
	window.addEventListener("hashchange", onHashChange);
	announce();
	return () => {
		window.removeEventListener("message", onMessage);
		window.removeEventListener("popstate", onPopState);
		window.removeEventListener("hashchange", onHashChange);
		window.history.pushState = originalPushState;
		window.history.replaceState = originalReplaceState;
	};
}
/** Collect static path patterns from a TanStack route tree (best-effort). */
function collectRoutePathsFromTree(routeTree) {
	const paths = /* @__PURE__ */ new Set();
	const walk = (node) => {
		if (!node || typeof node !== "object") return;
		const record = node;
		const full = typeof record.fullPath === "string" ? record.fullPath : typeof record.path === "string" ? record.path : null;
		if (full !== null && full !== "") paths.add(full.startsWith("/") ? full : `/${full}`);
		else if (full === "") paths.add("/");
		const children = record.children;
		if (Array.isArray(children)) for (const child of children) walk(child);
		else if (children && typeof children === "object") for (const child of Object.values(children)) walk(child);
	};
	walk(routeTree);
	return [...paths];
}
//#endregion
//#region src/components/preview-host-bridge.tsx
/**
* Mount once in `__root.tsx` so the Grok preview chrome can drive navigation
* (and later receive registered routes). Noops when the app is not embedded.
*/
function PreviewHostBridge() {
	const router = useRouter();
	useEffect(() => {
		return installPreviewHostBridge({
			navigate: (path) => {
				router.history.push(path);
			},
			getRoutePaths: () => collectRoutePathsFromTree(router.routeTree)
		});
	}, [router]);
	return null;
}
//#endregion
//#region src/styles.css?url
var styles_default = "/assets/styles-B8kUDa-W.css";
//#endregion
//#region src/routes/__root.tsx
var APP_NAME = "Elon Reply Agent";
var Route$17 = createRootRoute({
	head: () => ({
		meta: [
			{ charSet: "utf-8" },
			{
				name: "viewport",
				content: "width=device-width, initial-scale=1"
			},
			{ title: APP_NAME },
			{
				name: "description",
				content: "Draft, approve, and publish X replies. Nothing posts until you confirm."
			},
			{
				name: "theme-color",
				content: "#000000"
			}
		],
		links: [
			{
				rel: "icon",
				type: "image/svg+xml",
				href: "/favicon.svg"
			},
			{
				rel: "preconnect",
				href: "https://fonts.googleapis.com"
			},
			{
				rel: "preconnect",
				href: "https://fonts.gstatic.com",
				crossOrigin: "anonymous"
			},
			{
				rel: "stylesheet",
				href: "https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap"
			},
			{
				rel: "stylesheet",
				href: styles_default
			},
			{
				rel: "manifest",
				href: "/__grok/manifest.webmanifest"
			},
			{
				rel: "apple-touch-icon",
				href: "/__grok/icon-180.png"
			}
		]
	}),
	component: () => /* @__PURE__ */ jsxs("html", {
		lang: "en",
		suppressHydrationWarning: true,
		children: [/* @__PURE__ */ jsx("head", { children: /* @__PURE__ */ jsx(HeadContent, {}) }), /* @__PURE__ */ jsxs("body", {
			className: "antialiased",
			children: [
				/* @__PURE__ */ jsx(PreviewHostBridge, {}),
				/* @__PURE__ */ jsx(AuthProvider, { children: /* @__PURE__ */ jsx(Outlet, {}) }),
				/* @__PURE__ */ jsx(Toaster, {
					theme: "dark",
					position: "top-center",
					toastOptions: { style: {
						background: "var(--color-surface)",
						color: "var(--color-fg)",
						border: "1px solid var(--color-line)"
					} }
				}),
				/* @__PURE__ */ jsx(Scripts, {})
			]
		})]
	})
});
//#endregion
//#region src/routes/index.tsx
var $$splitComponentImporter$7 = () => import("./routes-VMJW5_q5.js");
var Route$16 = createFileRoute("/")({ component: lazyRouteComponent($$splitComponentImporter$7, "component") });
//#endregion
//#region src/routes/analytics.tsx
var $$splitComponentImporter$6 = () => import("./analytics-CqxWbqgX.js");
var Route$15 = createFileRoute("/analytics")({ component: lazyRouteComponent($$splitComponentImporter$6, "component") });
//#endregion
//#region src/routes/engagement.tsx
var $$splitComponentImporter$5 = () => import("./engagement-Bgd3kbey.js");
var Route$14 = createFileRoute("/engagement")({ component: lazyRouteComponent($$splitComponentImporter$5, "component") });
//#endregion
//#region src/routes/inbox.tsx
var $$splitComponentImporter$4 = () => import("./inbox-DofEkDLQ.js");
var Route$13 = createFileRoute("/inbox")({ component: lazyRouteComponent($$splitComponentImporter$4, "component") });
//#endregion
//#region src/routes/posts.tsx
var $$splitComponentImporter$3 = () => import("./posts-C40Q68tf.js");
var Route$12 = createFileRoute("/posts")({ component: lazyRouteComponent($$splitComponentImporter$3, "component") });
//#endregion
//#region src/routes/research.tsx
var $$splitComponentImporter$2 = () => import("./research-BNx8mnsw.js");
var Route$11 = createFileRoute("/research")({ component: lazyRouteComponent($$splitComponentImporter$2, "component") });
//#endregion
//#region src/routes/studio.tsx
var $$splitComponentImporter$1 = () => import("./studio-jrUBdLNI.js");
var Route$10 = createFileRoute("/studio")({ component: lazyRouteComponent($$splitComponentImporter$1, "component") });
//#endregion
//#region src/routes/usage.tsx
var $$splitComponentImporter = () => import("./usage-DSTp4EMW.js");
var Route$9 = createFileRoute("/usage")({ component: lazyRouteComponent($$splitComponentImporter, "component") });
//#endregion
//#region src/server/x-oauth.server.ts
var TOKEN_COOKIE = "era_x_token";
var STATE_COOKIE = "era_pkce_state";
var VERIFIER_COOKIE = "era_pkce_verifier";
function missingXConfig() {
	const missing = [];
	if (!process.env.X_CLIENT_ID) missing.push("X_CLIENT_ID");
	if (!process.env.X_CLIENT_SECRET) missing.push("X_CLIENT_SECRET");
	if (!process.env.X_CALLBACK_URL) missing.push("X_CALLBACK_URL");
	if (!process.env.TOKEN_ENCRYPTION_KEY) missing.push("TOKEN_ENCRYPTION_KEY");
	return missing;
}
function callbackUrl() {
	return process.env.X_CALLBACK_URL || "";
}
function readCookieJar(request) {
	const jar = /* @__PURE__ */ new Map();
	const header = request.headers.get("cookie") ?? "";
	for (const part of header.split(";")) {
		const trimmed = part.trim();
		if (!trimmed) continue;
		const eq = trimmed.indexOf("=");
		if (eq <= 0) continue;
		jar.set(trimmed.slice(0, eq), decodeURIComponent(trimmed.slice(eq + 1)));
	}
	return jar;
}
function setCookie(name, value, maxAge) {
	return `${name}=${encodeURIComponent(value)}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${maxAge}`;
}
function clearAuthHeaders() {
	const headers = new Headers();
	headers.append("Set-Cookie", setCookie(TOKEN_COOKIE, "", 0));
	return headers;
}
async function aesKey() {
	const secret = process.env.TOKEN_ENCRYPTION_KEY ?? "";
	const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(secret));
	return crypto.subtle.importKey("raw", digest, "AES-GCM", false, ["encrypt", "decrypt"]);
}
async function encrypt(plain) {
	const key = await aesKey();
	const iv = crypto.getRandomValues(/* @__PURE__ */ new Uint8Array(12));
	const cipher = new Uint8Array(await crypto.subtle.encrypt({
		name: "AES-GCM",
		iv
	}, key, new TextEncoder().encode(plain)));
	const packed = new Uint8Array(iv.length + cipher.length);
	packed.set(iv, 0);
	packed.set(cipher, iv.length);
	return `enc.${Buffer.from(packed).toString("base64url")}`;
}
async function decrypt(payload) {
	if (!payload.startsWith("enc.")) throw new Error("token format");
	const raw = Buffer.from(payload.slice(4), "base64url");
	const iv = raw.subarray(0, 12);
	const cipher = raw.subarray(12);
	const key = await aesKey();
	const plain = await crypto.subtle.decrypt({
		name: "AES-GCM",
		iv
	}, key, cipher);
	return new TextDecoder().decode(plain);
}
async function readAuth(request) {
	if (!process.env.TOKEN_ENCRYPTION_KEY) return null;
	const raw = readCookieJar(request).get(TOKEN_COOKIE);
	if (!raw) return null;
	try {
		const parsed = JSON.parse(await decrypt(raw));
		if (!parsed.access) return null;
		return parsed;
	} catch {
		return null;
	}
}
async function authCookie(auth) {
	return setCookie(TOKEN_COOKIE, await encrypt(JSON.stringify(auth)), 2592e3);
}
function basicAuth() {
	const id = process.env.X_CLIENT_ID ?? "";
	const secret = process.env.X_CLIENT_SECRET ?? "";
	return `Basic ${Buffer.from(`${id}:${secret}`).toString("base64")}`;
}
async function tokenRequest(body) {
	const res = await fetch("https://api.twitter.com/2/oauth2/token", {
		method: "POST",
		headers: {
			"Content-Type": "application/x-www-form-urlencoded",
			Authorization: basicAuth()
		},
		body,
		signal: AbortSignal.timeout(12e3)
	});
	const json = await res.json().catch(() => ({}));
	if (!res.ok || !json.access_token) throw new Error(json.error_description || "X token exchange failed");
	return json;
}
async function beginAuth() {
	const missing = missingXConfig();
	if (missing.length) return {
		ok: false,
		missing
	};
	const verifier = Buffer.from(crypto.getRandomValues(/* @__PURE__ */ new Uint8Array(32))).toString("base64url");
	const state = Buffer.from(crypto.getRandomValues(/* @__PURE__ */ new Uint8Array(16))).toString("base64url");
	const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(verifier));
	const challenge = Buffer.from(new Uint8Array(digest)).toString("base64url");
	const params = new URLSearchParams({
		response_type: "code",
		client_id: process.env.X_CLIENT_ID ?? "",
		redirect_uri: callbackUrl(),
		scope: "tweet.read tweet.write users.read follows.read like.read offline.access",
		state,
		code_challenge: challenge,
		code_challenge_method: "S256"
	});
	const headers = new Headers({ Location: `https://twitter.com/i/oauth2/authorize?${params.toString()}` });
	headers.append("Set-Cookie", setCookie(STATE_COOKIE, state, 600));
	headers.append("Set-Cookie", setCookie(VERIFIER_COOKIE, verifier, 600));
	return {
		ok: true,
		headers
	};
}
async function finishAuth(request) {
	const url = new URL(request.url);
	const error = url.searchParams.get("error");
	if (error) throw new Error(url.searchParams.get("error_description") || error);
	const code = url.searchParams.get("code");
	const state = url.searchParams.get("state");
	const jar = readCookieJar(request);
	if (!code || !state || state !== jar.get(STATE_COOKIE) || !jar.get(VERIFIER_COOKIE)) throw new Error("OAuth state did not match. Start the connection again.");
	const token = await tokenRequest(new URLSearchParams({
		grant_type: "authorization_code",
		code,
		redirect_uri: callbackUrl(),
		code_verifier: jar.get(VERIFIER_COOKIE) ?? "",
		client_id: process.env.X_CLIENT_ID ?? ""
	}));
	const auth = {
		access: token.access_token ?? "",
		refresh: token.refresh_token,
		expiresAt: Date.now() + (token.expires_in ?? 7200) * 1e3
	};
	const headers = new Headers({ Location: "/?connected=1" });
	headers.append("Set-Cookie", await authCookie(auth));
	headers.append("Set-Cookie", setCookie(STATE_COOKIE, "", 0));
	headers.append("Set-Cookie", setCookie(VERIFIER_COOKIE, "", 0));
	return headers;
}
async function refresh(auth) {
	if (!auth.refresh) throw new Error("expired");
	const token = await tokenRequest(new URLSearchParams({
		grant_type: "refresh_token",
		refresh_token: auth.refresh,
		client_id: process.env.X_CLIENT_ID ?? ""
	}));
	return {
		...auth,
		access: token.access_token ?? auth.access,
		refresh: token.refresh_token ?? auth.refresh,
		expiresAt: Date.now() + (token.expires_in ?? 7200) * 1e3
	};
}
async function authorized(request) {
	let auth = await readAuth(request);
	if (!auth) return {
		auth: null,
		headers: new Headers(),
		refreshed: false,
		expired: false
	};
	if (auth.expiresAt > Date.now() + 3e4) return {
		auth,
		headers: new Headers(),
		refreshed: false,
		expired: false
	};
	try {
		auth = await refresh(auth);
		const headers = new Headers();
		headers.append("Set-Cookie", await authCookie(auth));
		return {
			auth,
			headers,
			refreshed: true,
			expired: false
		};
	} catch {
		return {
			auth: null,
			headers: clearAuthHeaders(),
			refreshed: false,
			expired: true
		};
	}
}
async function xFetch(auth, path) {
	const res = await fetch(`https://api.twitter.com/2${path}`, {
		headers: { Authorization: `Bearer ${auth.access}` },
		signal: AbortSignal.timeout(12e3)
	});
	return {
		res,
		json: await res.json().catch(() => ({}))
	};
}
function xErrorMessage(json, status) {
	const body = json ?? {};
	return body.detail || body.title || body.errors?.[0]?.message || `X API ${status}`;
}
function htmlPage(title, body, status = 200) {
	const amp = String.fromCharCode(38);
	const safe = (value) => value.replaceAll(amp, `${amp}amp;`).replaceAll("<", `${amp}lt;`).replaceAll(">", `${amp}gt;`).replaceAll("\"", `${amp}quot;`).replaceAll("'", `${amp}#39;`);
	const html = [
		"<!doctype html><html lang=\"en\"><head><meta charset=\"utf-8\"/>",
		"<meta name=\"viewport\" content=\"width=device-width, initial-scale=1\"/>",
		`<title>${safe(title)}</title></head>`,
		"<body style=\"margin:0;background:#000;color:#f4f4f5;font-family:Inter,system-ui,sans-serif\">",
		"<main style=\"max-width:32rem;margin:10vh auto;padding:1.5rem\">",
		`<h1 style=\"font-size:1.25rem\">${safe(title)}</h1>`,
		`<p style=\"color:#8a8a8a;line-height:1.5\">${safe(body)}</p>`,
		"<p><a href=\"/\" style=\"color:#2f81f7\">Back to the agent</a></p>",
		"</main></body></html>"
	].join("");
	return new Response(html, {
		status,
		headers: { "Content-Type": "text/html; charset=utf-8" }
	});
}
//#endregion
//#region src/routes/api/analytics.ts
var SUPPORTED = [
	"followers_count and following_count on the authorized user",
	"mention timeline via GET /2/users/:id/mentions",
	"public_metrics on posts this app published (likes, reposts, replies)",
	"follower and following lists via the authorized follows endpoints"
];
var OMITTED = [
	"The full native X notification tab — the API does not expose it",
	"Automated likes, follows, and unfollows — those stay manual",
	"Impressions, unless a later call returns non_public_metrics for an owned post"
];
var Route$8 = createFileRoute("/api/analytics")({ server: { handlers: { GET: async ({ request }) => {
	const resource = new URL(request.url).searchParams.get("resource");
	if (resource !== "followers" && resource !== "following") return Response.json({
		ok: true,
		supported: SUPPORTED,
		omitted: OMITTED
	});
	const gate = await authorized(request);
	if (!gate.auth) return Response.json({
		ok: false,
		error: "Connect X with OAuth before reading follower lists."
	}, {
		status: 401,
		headers: gate.headers
	});
	let userId = gate.auth.userId;
	const headers = gate.headers;
	if (!userId) {
		const me = await xFetch(gate.auth, "/users/me");
		const id = me.json.data?.id;
		if (!me.res.ok || !id) return Response.json({
			ok: false,
			error: xErrorMessage(me.json, me.res.status)
		}, {
			status: me.res.status,
			headers
		});
		userId = id;
		headers.append("Set-Cookie", await authCookie({
			...gate.auth,
			userId
		}));
	}
	const path = resource === "following" ? `/users/${userId}/following?max_results=10&user.fields=public_metrics,username,name` : `/users/${userId}/followers?max_results=10&user.fields=public_metrics,username,name`;
	const list = await xFetch(gate.auth, path);
	if (!list.res.ok) return Response.json({
		ok: false,
		error: xErrorMessage(list.json, list.res.status)
	}, {
		status: list.res.status,
		headers
	});
	const people = (list.json.data ?? []).map((user) => ({
		id: user.id,
		name: user.name ?? user.username ?? "Account",
		handle: user.username ?? "unknown",
		followers: user.public_metrics?.followers_count ?? 0,
		relation: resource === "following" ? "following" : "follows_you",
		intent: null,
		liked: false
	}));
	return Response.json({
		ok: true,
		resource,
		people
	}, { headers });
} } } });
//#endregion
//#region src/routes/api/ai/generate.ts
var Route$7 = createFileRoute("/api/ai/generate")({ server: { handlers: { POST: async ({ request }) => {
	try {
		const input = parseDraftInput(await request.json());
		return Response.json(await draftReply(input));
	} catch (error) {
		const message = error instanceof Error ? error.message : "Could not draft a reply";
		return Response.json({
			ok: false,
			error: message
		}, { status: 400 });
	}
} } } });
//#endregion
//#region src/routes/api/ai/repost-drafts.ts
function clamp(text) {
	return text.replace(/^\s*(reply|quote)\s*:\s*/i, "").trim().slice(0, 280);
}
function parsePosts(input) {
	if (!Array.isArray(input) || input.length === 0 || input.length > 10) throw new Error("Select between 1 and 10 reposts.");
	return input.map((item) => {
		const value = item ?? {};
		if (typeof value.id !== "string" || typeof value.text !== "string" || typeof value.originalTweetId !== "string" || typeof value.originalAuthorHandle !== "string") throw new Error("Each repost must include its X post data.");
		return {
			id: value.id,
			text: value.text.slice(0, 4e3),
			createdAt: typeof value.createdAt === "string" ? value.createdAt : "",
			originalAuthorName: typeof value.originalAuthorName === "string" ? value.originalAuthorName : "Unknown author",
			originalAuthorHandle: value.originalAuthorHandle,
			originalTweetId: value.originalTweetId,
			targetHandle: typeof value.targetHandle === "string" ? value.targetHandle : "",
			url: typeof value.url === "string" ? value.url : ""
		};
	});
}
var Route$6 = createFileRoute("/api/ai/repost-drafts")({ server: { handlers: { POST: async ({ request }) => {
	try {
		const body = await request.json().catch(() => ({}));
		const instruction = typeof body.instruction === "string" ? body.instruction.trim().slice(0, 2e3) : "";
		const posts = parsePosts(body.posts);
		const key = process.env.OPENROUTER_API_KEY;
		if (!key) return Response.json({
			ok: false,
			error: "OPENROUTER_API_KEY is not configured."
		}, { status: 503 });
		const prompt = [
			"Create review-only social drafts for the following X reposts.",
			instruction ? `The account owner's instruction is: ${instruction}` : "Use a thoughtful, specific, non-harassing tone.",
			"For every item, produce exactly one reply and one quote-post caption.",
			"Reply is a direct response to the original post. Quote is standalone text that adds context when sharing the original post.",
			"Never claim the draft was posted. Do not impersonate a real person. Do not use hashtag spam.",
			"Keep each draft at or below 280 characters. Return JSON only as an object with a drafts array; each item must contain postId, reply, and quote.",
			JSON.stringify(posts.map((post) => ({
				postId: post.id,
				originalPostId: post.originalTweetId,
				author: `@${post.originalAuthorHandle}`,
				text: post.text
			})))
		].join("\n\n");
		const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
			method: "POST",
			headers: {
				"Content-Type": "application/json",
				Authorization: `Bearer ${key}`,
				"HTTP-Referer": "https://grok-reply-agent.netlify.app",
				"X-Title": "Elon Reply Agent"
			},
			body: JSON.stringify({
				model: "openai/gpt-4.1-mini",
				temperature: .6,
				max_tokens: 3200,
				response_format: { type: "json_object" },
				messages: [{
					role: "system",
					content: "You are a careful drafting assistant. Output valid JSON only."
				}, {
					role: "user",
					content: prompt
				}]
			}),
			signal: AbortSignal.timeout(3e4)
		});
		const providerBody = await response.json().catch(() => ({}));
		if (!response.ok) throw new Error(providerBody.error?.message || `OpenRouter returned ${response.status}`);
		const content = providerBody.choices?.[0]?.message?.content?.trim();
		if (!content) throw new Error("OpenRouter returned no drafts.");
		const parsed = JSON.parse(content);
		const rows = Array.isArray(parsed) ? parsed : parsed.drafts;
		if (!Array.isArray(rows)) throw new Error("OpenRouter returned an unexpected draft format.");
		const byId = new Map(posts.map((post) => [post.id, post]));
		const drafts = rows.map((item) => {
			const row = item ?? {};
			const postId = typeof row.postId === "string" ? row.postId : "";
			if (!byId.has(postId) || typeof row.reply !== "string" || typeof row.quote !== "string") return null;
			return {
				postId,
				reply: clamp(row.reply),
				quote: clamp(row.quote),
				provider: "openrouter"
			};
		}).filter((item) => Boolean(item));
		if (drafts.length !== posts.length) throw new Error("OpenRouter did not return one reply and quote for every repost.");
		return Response.json({
			ok: true,
			drafts
		});
	} catch (error) {
		const message = error instanceof Error ? error.message : "Could not draft repost responses";
		return Response.json({
			ok: false,
			error: message
		}, { status: 400 });
	}
} } } });
//#endregion
//#region src/routes/api/cron/monitor.ts
var Route$5 = createFileRoute("/api/cron/monitor")({ server: { handlers: { GET: async ({ request }) => {
	const secret = process.env.CRON_SECRET;
	const header = request.headers.get("authorization") ?? "";
	if (!secret || header !== `Bearer ${secret}`) return Response.json({
		ok: false,
		error: "Unauthorized"
	}, { status: 401 });
	return Response.json({
		ok: true,
		ranAt: (/* @__PURE__ */ new Date()).toISOString(),
		posted: false,
		liked: false,
		followed: false,
		detail: "Authenticated monitor tick. This job does not post, like, or follow. Mention sync is per connected user and uses only official X API v2 endpoints. The native notification tab is not requested because the API does not expose it."
	});
} } } });
//#endregion
//#region src/routes/api/x/auth.ts
var Route$4 = createFileRoute("/api/x/auth")({ server: { handlers: {
	GET: async ({ request }) => {
		if (new URL(request.url).searchParams.get("check") === "1") {
			const missing = missingXConfig();
			return Response.json({
				configured: missing.length === 0,
				missing
			});
		}
		const started = await beginAuth();
		if (!started.ok) return Response.json({
			ok: false,
			error: "X OAuth is not configured. Tokens are not stored until every required credential is set.",
			missing: started.missing
		}, { status: 503 });
		return new Response(null, {
			status: 302,
			headers: started.headers
		});
	},
	DELETE: async () => {
		return Response.json({
			ok: true,
			disconnected: true
		}, { headers: clearAuthHeaders() });
	}
} } });
//#endregion
//#region src/routes/api/x/callback.ts
var Route$3 = createFileRoute("/api/x/callback")({ server: { handlers: { GET: async ({ request }) => {
	try {
		const headers = await finishAuth(request);
		return new Response(null, {
			status: 302,
			headers
		});
	} catch (error) {
		return htmlPage("X connection failed", error instanceof Error ? error.message : "X connection failed", 400);
	}
} } } });
//#endregion
//#region src/routes/api/x/mentions.ts
async function loadMe(auth) {
	const { res, json } = await xFetch(auth, "/users/me?user.fields=public_metrics,username,name");
	return {
		res,
		json
	};
}
var Route$2 = createFileRoute("/api/x/mentions")({ server: { handlers: { GET: async ({ request }) => {
	const gate = await authorized(request);
	const headers = gate.headers;
	const probe = new URL(request.url).searchParams.get("probe") === "1";
	if (!gate.auth) return Response.json({
		ok: false,
		account: null,
		expired: gate.expired,
		error: gate.expired ? "X credentials expired. Reconnect the account." : "No X account is connected. The native notification tab is not available through the API."
	}, {
		status: probe ? 200 : 401,
		headers
	});
	const me = await loadMe(gate.auth);
	if (me.res.status === 429) return Response.json({
		ok: false,
		error: "X rate limit reached. Sync again after the window resets."
	}, {
		status: 429,
		headers
	});
	if (!me.res.ok || !me.json.data?.id) return Response.json({
		ok: false,
		error: xErrorMessage(me.json, me.res.status)
	}, {
		status: me.res.status,
		headers
	});
	const auth = {
		...gate.auth,
		userId: me.json.data.id
	};
	headers.append("Set-Cookie", await authCookie(auth));
	const account = {
		name: me.json.data.name ?? me.json.data.username ?? "X account",
		handle: me.json.data.username ?? "",
		followers: me.json.data.public_metrics?.followers_count ?? 0,
		following: me.json.data.public_metrics?.following_count ?? 0,
		userId: me.json.data.id
	};
	if (new URL(request.url).searchParams.get("probe") === "1") return Response.json({
		ok: true,
		account,
		mentions: []
	}, { headers });
	const mentions = await xFetch(auth, `/users/${me.json.data.id}/mentions?max_results=10&tweet.fields=created_at,conversation_id,public_metrics&expansions=author_id&user.fields=name,username`);
	if (mentions.res.status === 429) return Response.json({
		ok: false,
		account,
		error: "X rate limit reached on mentions."
	}, {
		status: 429,
		headers
	});
	if (!mentions.res.ok) return Response.json({
		ok: false,
		account,
		error: xErrorMessage(mentions.json, mentions.res.status)
	}, {
		status: mentions.res.status,
		headers
	});
	const payload = mentions.json;
	const users = new Map((payload.includes?.users ?? []).map((user) => [user.id, user]));
	const items = (payload.data ?? []).map((tweet) => {
		const user = tweet.author_id ? users.get(tweet.author_id) : void 0;
		return {
			id: tweet.id,
			kind: "mention",
			authorName: user?.name ?? "Unknown",
			authorHandle: user?.username ?? "unknown",
			text: tweet.text,
			createdAt: tweet.created_at ?? (/* @__PURE__ */ new Date()).toISOString(),
			context: tweet.conversation_id ? `Conversation ${tweet.conversation_id}. X did not return the full parent thread on this call.` : "Mention returned by GET /2/users/:id/mentions.",
			read: false,
			source: "x"
		};
	});
	return Response.json({
		ok: true,
		account,
		mentions: items,
		note: "Mentions and replies exposed by X API v2. This is not the full native notification tab."
	}, { headers });
} } } });
//#endregion
//#region src/routes/api/x/publish.ts
var Route$1 = createFileRoute("/api/x/publish")({ server: { handlers: { POST: async ({ request }) => {
	const body = await request.json().catch(() => null);
	if (!body || body.confirm !== true) return Response.json({
		ok: false,
		error: "Publishing requires an explicit confirmation."
	}, { status: 400 });
	if (typeof body.text !== "string" || !body.text.trim()) return Response.json({
		ok: false,
		error: "Write something before publishing."
	}, { status: 400 });
	if (body.text.length > 280) return Response.json({
		ok: false,
		error: "X posts are limited to 280 characters."
	}, { status: 400 });
	const gate = await authorized(request);
	if (!gate.auth) return Response.json({
		ok: false,
		localOnly: true,
		error: "No live X token. Nothing was sent. Confirm again after connecting OAuth, or keep it in this workspace."
	}, {
		status: 409,
		headers: gate.headers
	});
	const payload = { text: body.text.trim() };
	if (typeof body.replyTo === "string" && /^\d{5,}$/.test(body.replyTo)) payload.reply = { in_reply_to_tweet_id: body.replyTo };
	const write = await fetch("https://api.twitter.com/2/tweets", {
		method: "POST",
		headers: {
			Authorization: `Bearer ${gate.auth.access}`,
			"Content-Type": "application/json"
		},
		body: JSON.stringify(payload),
		signal: AbortSignal.timeout(12e3)
	});
	const json = await write.json().catch(() => ({}));
	if (!write.ok || !json.data?.id) return Response.json({
		ok: false,
		error: json.detail || json.title || `X publish failed (${write.status})`
	}, {
		status: write.status || 502,
		headers: gate.headers
	});
	return Response.json({
		ok: true,
		id: json.data.id
	}, { headers: gate.headers });
} } } });
//#endregion
//#region src/routes/api/x/reposts.ts
function cleanHandle(value) {
	const handle = typeof value === "string" ? value.trim().replace(/^@+/, "") : "";
	if (!/^[A-Za-z0-9_]{1,15}$/.test(handle)) throw new Error("Enter a valid X handle, such as @elonmusk.");
	return handle;
}
var Route = createFileRoute("/api/x/reposts")({ server: { handlers: { POST: async ({ request }) => {
	const gate = await authorized(request);
	if (!gate.auth) return Response.json({
		ok: false,
		error: "Connect X before searching public reposts."
	}, {
		status: 401,
		headers: gate.headers
	});
	try {
		const handle = cleanHandle((await request.json().catch(() => ({}))).handle);
		const user = await xFetch(gate.auth, `/users/by/username/${encodeURIComponent(handle)}?user.fields=name,username`);
		if (!user.res.ok || !user.json.data?.id) return Response.json({
			ok: false,
			error: xErrorMessage(user.json, user.res.status)
		}, {
			status: user.res.status,
			headers: gate.headers
		});
		const userData = user.json.data;
		const timeline = await xFetch(gate.auth, `/users/${userData.id}/timelines/reverse_chronological?max_results=100&tweet.fields=created_at,referenced_tweets,author_id&expansions=author_id&user.fields=name,username`);
		if (!timeline.res.ok) return Response.json({
			ok: false,
			error: xErrorMessage(timeline.json, timeline.res.status)
		}, {
			status: timeline.res.status,
			headers: gate.headers
		});
		const payload = timeline.json;
		const users = new Map((payload.includes?.users ?? []).map((item) => [item.id, item]));
		const reposts = (payload.data ?? []).map((tweet) => {
			const repost = tweet.referenced_tweets?.find((item) => item.type === "retweeted");
			if (!repost) return null;
			const author = tweet.author_id ? users.get(tweet.author_id) : void 0;
			return {
				id: tweet.id,
				text: tweet.text,
				createdAt: tweet.created_at ?? (/* @__PURE__ */ new Date()).toISOString(),
				originalAuthorName: author?.name ?? "Unknown author",
				originalAuthorHandle: author?.username ?? "unknown",
				originalTweetId: repost.id,
				targetHandle: userData.username ?? handle,
				url: `https://x.com/${author?.username ?? "i"}/status/${repost.id}`
			};
		}).filter((item) => Boolean(item)).slice(0, 10);
		return Response.json({
			ok: true,
			target: {
				id: userData.id,
				name: userData.name ?? userData.username ?? handle,
				handle: userData.username ?? handle
			},
			reposts,
			note: "X returned repost entries from the target user's reverse-chronological timeline. No post was created."
		}, { headers: gate.headers });
	} catch (error) {
		const message = error instanceof Error ? error.message : "Could not search X";
		return Response.json({
			ok: false,
			error: message
		}, {
			status: 400,
			headers: gate.headers
		});
	}
} } } });
//#endregion
//#region src/routeTree.gen.ts
var rootRouteChildren = {
	IndexRoute: Route$16.update({
		id: "/",
		path: "/",
		getParentRoute: () => Route$17
	}),
	AnalyticsRoute: Route$15.update({
		id: "/analytics",
		path: "/analytics",
		getParentRoute: () => Route$17
	}),
	EngagementRoute: Route$14.update({
		id: "/engagement",
		path: "/engagement",
		getParentRoute: () => Route$17
	}),
	InboxRoute: Route$13.update({
		id: "/inbox",
		path: "/inbox",
		getParentRoute: () => Route$17
	}),
	PostsRoute: Route$12.update({
		id: "/posts",
		path: "/posts",
		getParentRoute: () => Route$17
	}),
	ResearchRoute: Route$11.update({
		id: "/research",
		path: "/research",
		getParentRoute: () => Route$17
	}),
	StudioRoute: Route$10.update({
		id: "/studio",
		path: "/studio",
		getParentRoute: () => Route$17
	}),
	UsageRoute: Route$9.update({
		id: "/usage",
		path: "/usage",
		getParentRoute: () => Route$17
	}),
	ApiAnalyticsRoute: Route$8.update({
		id: "/api/analytics",
		path: "/api/analytics",
		getParentRoute: () => Route$17
	}),
	ApiAiGenerateRoute: Route$7.update({
		id: "/api/ai/generate",
		path: "/api/ai/generate",
		getParentRoute: () => Route$17
	}),
	ApiAiRepostDraftsRoute: Route$6.update({
		id: "/api/ai/repost-drafts",
		path: "/api/ai/repost-drafts",
		getParentRoute: () => Route$17
	}),
	ApiCronMonitorRoute: Route$5.update({
		id: "/api/cron/monitor",
		path: "/api/cron/monitor",
		getParentRoute: () => Route$17
	}),
	ApiXAuthRoute: Route$4.update({
		id: "/api/x/auth",
		path: "/api/x/auth",
		getParentRoute: () => Route$17
	}),
	ApiXCallbackRoute: Route$3.update({
		id: "/api/x/callback",
		path: "/api/x/callback",
		getParentRoute: () => Route$17
	}),
	ApiXMentionsRoute: Route$2.update({
		id: "/api/x/mentions",
		path: "/api/x/mentions",
		getParentRoute: () => Route$17
	}),
	ApiXPublishRoute: Route$1.update({
		id: "/api/x/publish",
		path: "/api/x/publish",
		getParentRoute: () => Route$17
	}),
	ApiXRepostsRoute: Route.update({
		id: "/api/x/reposts",
		path: "/api/x/reposts",
		getParentRoute: () => Route$17
	})
};
var routeTree = Route$17._addFileChildren(rootRouteChildren)._addFileTypes();
//#endregion
//#region src/router.tsx
function getRouter() {
	return createRouter({
		routeTree,
		rewrite: previewPathRewrite(),
		defaultErrorComponent: AppErrorComponent
	});
}
//#endregion
export { getRouter };
