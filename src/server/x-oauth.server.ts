const TOKEN_COOKIE = "era_x_token";
const STATE_COOKIE = "era_pkce_state";
const VERIFIER_COOKIE = "era_pkce_verifier";

export type StoredAuth = {
  access: string;
  refresh?: string;
  expiresAt: number;
  userId?: string;
};

type XError = { detail?: string; title?: string; errors?: { message?: string }[] };

export function missingXConfig() {
  const missing: string[] = [];
  if (!process.env.X_CLIENT_ID) missing.push("X_CLIENT_ID");
  if (!process.env.X_CLIENT_SECRET) missing.push("X_CLIENT_SECRET");
  if (!process.env.X_CALLBACK_URL) missing.push("X_CALLBACK_URL");
  if (!process.env.TOKEN_ENCRYPTION_KEY) missing.push("TOKEN_ENCRYPTION_KEY");
  return missing;
}

export function callbackUrl() {
  return process.env.X_CALLBACK_URL || "";
}

function readCookieJar(request: Request) {
  const jar = new Map<string, string>();
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

function setCookie(name: string, value: string, maxAge: number) {
  return `${name}=${encodeURIComponent(value)}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${maxAge}`;
}

export function clearAuthHeaders() {
  const headers = new Headers();
  headers.append("Set-Cookie", setCookie(TOKEN_COOKIE, "", 0));
  return headers;
}

async function aesKey() {
  const secret = process.env.TOKEN_ENCRYPTION_KEY ?? "";
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(secret));
  return crypto.subtle.importKey("raw", digest, "AES-GCM", false, ["encrypt", "decrypt"]);
}

async function encrypt(plain: string) {
  const key = await aesKey();
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const cipher = new Uint8Array(
    await crypto.subtle.encrypt({ name: "AES-GCM", iv }, key, new TextEncoder().encode(plain)),
  );
  const packed = new Uint8Array(iv.length + cipher.length);
  packed.set(iv, 0);
  packed.set(cipher, iv.length);
  return `enc.${Buffer.from(packed).toString("base64url")}`;
}

async function decrypt(payload: string) {
  if (!payload.startsWith("enc.")) throw new Error("token format");
  const raw = Buffer.from(payload.slice(4), "base64url");
  const iv = raw.subarray(0, 12);
  const cipher = raw.subarray(12);
  const key = await aesKey();
  const plain = await crypto.subtle.decrypt({ name: "AES-GCM", iv }, key, cipher);
  return new TextDecoder().decode(plain);
}

export async function readAuth(request: Request): Promise<StoredAuth | null> {
  if (!process.env.TOKEN_ENCRYPTION_KEY) return null;
  const raw = readCookieJar(request).get(TOKEN_COOKIE);
  if (!raw) return null;
  try {
    const parsed = JSON.parse(await decrypt(raw)) as StoredAuth;
    if (!parsed.access) return null;
    return parsed;
  } catch {
    return null;
  }
}

export async function authCookie(auth: StoredAuth) {
  return setCookie(TOKEN_COOKIE, await encrypt(JSON.stringify(auth)), 60 * 60 * 24 * 30);
}

function basicAuth() {
  const id = process.env.X_CLIENT_ID ?? "";
  const secret = process.env.X_CLIENT_SECRET ?? "";
  return `Basic ${Buffer.from(`${id}:${secret}`).toString("base64")}`;
}

async function tokenRequest(body: URLSearchParams) {
  const res = await fetch("https://api.twitter.com/2/oauth2/token", {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      Authorization: basicAuth(),
    },
    body,
    signal: AbortSignal.timeout(12000),
  });
  const json = (await res.json().catch(() => ({}))) as {
    access_token?: string;
    refresh_token?: string;
    expires_in?: number;
    error_description?: string;
  };
  if (!res.ok || !json.access_token) {
    throw new Error(json.error_description || "X token exchange failed");
  }
  return json;
}

export async function beginAuth() {
  const missing = missingXConfig();
  if (missing.length) {
    return { ok: false as const, missing };
  }
  const verifier = Buffer.from(crypto.getRandomValues(new Uint8Array(32))).toString("base64url");
  const state = Buffer.from(crypto.getRandomValues(new Uint8Array(16))).toString("base64url");
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(verifier));
  const challenge = Buffer.from(new Uint8Array(digest)).toString("base64url");
  const params = new URLSearchParams({
    response_type: "code",
    client_id: process.env.X_CLIENT_ID ?? "",
    redirect_uri: callbackUrl(),
    scope: "tweet.read tweet.write users.read follows.read like.read offline.access",
    state,
    code_challenge: challenge,
    code_challenge_method: "S256",
  });
  const headers = new Headers({
    Location: `https://twitter.com/i/oauth2/authorize?${params.toString()}`,
  });
  headers.append("Set-Cookie", setCookie(STATE_COOKIE, state, 600));
  headers.append("Set-Cookie", setCookie(VERIFIER_COOKIE, verifier, 600));
  return { ok: true as const, headers };
}

export async function finishAuth(request: Request) {
  const url = new URL(request.url);
  const error = url.searchParams.get("error");
  if (error) {
    throw new Error(url.searchParams.get("error_description") || error);
  }
  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");
  const jar = readCookieJar(request);
  if (!code || !state || state !== jar.get(STATE_COOKIE) || !jar.get(VERIFIER_COOKIE)) {
    throw new Error("OAuth state did not match. Start the connection again.");
  }
  const token = await tokenRequest(
    new URLSearchParams({
      grant_type: "authorization_code",
      code,
      redirect_uri: callbackUrl(),
      code_verifier: jar.get(VERIFIER_COOKIE) ?? "",
      client_id: process.env.X_CLIENT_ID ?? "",
    }),
  );
  const auth: StoredAuth = {
    access: token.access_token ?? "",
    refresh: token.refresh_token,
    expiresAt: Date.now() + (token.expires_in ?? 7200) * 1000,
  };
  const headers = new Headers({ Location: "/?connected=1" });
  headers.append("Set-Cookie", await authCookie(auth));
  headers.append("Set-Cookie", setCookie(STATE_COOKIE, "", 0));
  headers.append("Set-Cookie", setCookie(VERIFIER_COOKIE, "", 0));
  return headers;
}

async function refresh(auth: StoredAuth): Promise<StoredAuth> {
  if (!auth.refresh) throw new Error("expired");
  const token = await tokenRequest(
    new URLSearchParams({
      grant_type: "refresh_token",
      refresh_token: auth.refresh,
      client_id: process.env.X_CLIENT_ID ?? "",
    }),
  );
  return {
    ...auth,
    access: token.access_token ?? auth.access,
    refresh: token.refresh_token ?? auth.refresh,
    expiresAt: Date.now() + (token.expires_in ?? 7200) * 1000,
  };
}

export async function authorized(request: Request) {
  let auth = await readAuth(request);
  if (!auth) return { auth: null, headers: new Headers(), refreshed: false, expired: false };
  if (auth.expiresAt > Date.now() + 30_000) {
    return { auth, headers: new Headers(), refreshed: false, expired: false };
  }
  try {
    auth = await refresh(auth);
    const headers = new Headers();
    headers.append("Set-Cookie", await authCookie(auth));
    return { auth, headers, refreshed: true, expired: false };
  } catch {
    return { auth: null, headers: clearAuthHeaders(), refreshed: false, expired: true as const };
  }
}

export async function xFetch(auth: StoredAuth, path: string) {
  const res = await fetch(`https://api.twitter.com/2${path}`, {
    headers: { Authorization: `Bearer ${auth.access}` },
    signal: AbortSignal.timeout(12000),
  });
  const json = (await res.json().catch(() => ({}))) as XError & Record<string, unknown>;
  return { res, json };
}

export function xErrorMessage(json: unknown, status: number) {
  const body = (json ?? {}) as { detail?: string; title?: string; errors?: { message?: string }[] };
  return body.detail || body.title || body.errors?.[0]?.message || `X API ${status}`;
}

export function htmlPage(title: string, body: string, status = 200) {
  const amp = String.fromCharCode(38);
  const safe = (value: string) =>
    value
      .replaceAll(amp, `${amp}amp;`)
      .replaceAll("<", `${amp}lt;`)
      .replaceAll(">", `${amp}gt;`)
      .replaceAll('"', `${amp}quot;`)
      .replaceAll("'", `${amp}#39;`);
  const html = [
    "<!doctype html><html lang=\"en\"><head><meta charset=\"utf-8\"/>",
    "<meta name=\"viewport\" content=\"width=device-width, initial-scale=1\"/>",
    `<title>${safe(title)}</title></head>`,
    "<body style=\"margin:0;background:#000;color:#f4f4f5;font-family:Inter,system-ui,sans-serif\">",
    "<main style=\"max-width:32rem;margin:10vh auto;padding:1.5rem\">",
    `<h1 style=\"font-size:1.25rem\">${safe(title)}</h1>`,
    `<p style=\"color:#8a8a8a;line-height:1.5\">${safe(body)}</p>`,
    "<p><a href=\"/\" style=\"color:#2f81f7\">Back to the agent</a></p>",
    "</main></body></html>",
  ].join("");
  return new Response(html, { status, headers: { "Content-Type": "text/html; charset=utf-8" } });
}
