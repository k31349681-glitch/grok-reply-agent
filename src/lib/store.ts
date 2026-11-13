import { create } from "zustand";
import { persist } from "zustand/middleware";
import { COSTS } from "@/lib/format";
import { buildWorkspace, SAMPLE_QUEUE } from "@/lib/seed";
import type {
  Account,
  Notice,
  Prefs,
  ReplyDraft,
  ReplyStyle,
  UsageEvent,
  UsageKind,
  WorkspaceData,
} from "@/lib/types";

type GateReason = "budget" | "disconnected" | "rate";
type Gate = { ok: true } | { ok: false; reason: GateReason };

type AgentState = WorkspaceData & {
  epoch: number;
  spend: () => number;
  canSpend: (usd: number) => Gate;
  connectSample: () => void;
  applyLiveAccount: (account: Pick<Account, "name" | "handle" | "followers" | "following" | "userId">) => void;
  disconnect: () => void;
  selectNotice: (id: string) => void;
  markRead: (id: string) => void;
  markAllRead: () => void;
  logUsage: (partial: Omit<UsageEvent, "id" | "at">) => void;
  touchSync: (at: number) => void;
  noteCachedSync: () => void;
  mergeNotices: (incoming: Notice[], meta: { usd: number; detail: string; cached: boolean }) => number;
  syncSample: () => { ok: true; added: number; cached: boolean } | { ok: false; reason: GateReason };
  saveDraft: (input: {
    noticeId: string;
    style: ReplyStyle;
    text: string;
    source: ReplyDraft["source"];
  }) => string;
  editDraft: (id: string, text: string) => void;
  setDraftStatus: (id: string, status: ReplyDraft["status"]) => void;
  savePost: (input: {
    id?: string;
    text: string;
    status: "draft" | "scheduled";
    scheduledFor: string | null;
  }) => void;
  markDue: () => void;
  publishPost: (id: string) => void;
  publishDraft: (id: string) => void;
  toggleIntent: (id: string) => void;
  toggleLiked: (id: string) => void;
  setPeople: (people: WorkspaceData["people"]) => void;
  setPrefs: (prefs: Partial<Prefs>) => void;
  resetSample: () => void;
};

function uid(prefix: string) {
  return `${prefix}-${Math.random().toString(36).slice(2, 10)}`;
}

function spendOf(usage: UsageEvent[]) {
  return usage.reduce((sum, event) => sum + event.usd, 0);
}

export const useAgent = create<AgentState>()(
  persist(
    (set, get) => ({
      ...buildWorkspace(),
      epoch: 0,
      spend: () => spendOf(get().usage),
      canSpend: (usd) => {
        const state = get();
        if (state.account.status === "disconnected") return { ok: false, reason: "disconnected" };
        if (!state.prefs.hardStop) return { ok: true };
        if (state.spend() + usd > state.prefs.budgetUsd + 1e-9) return { ok: false, reason: "budget" };
        return { ok: true };
      },
      connectSample: () => {
        const fresh = buildWorkspace();
        set({ ...fresh, prefs: get().prefs });
      },
      applyLiveAccount: (account) => {
        set({
          account: {
            status: "live",
            name: account.name,
            handle: account.handle.replace(/^@/, ""),
            followers: account.followers,
            following: account.following,
            userId: account.userId,
          },
          mentionsCache: null,
          mentionsCachedAt: null,
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
            userId: null,
          },
          mentionsCache: null,
          mentionsCachedAt: null,
        });
      },
      selectNotice: (id) => set({ selectedNoticeId: id }),
      markRead: (id) =>
        set({
          notices: get().notices.map((notice) => (notice.id === id ? { ...notice, read: true } : notice)),
        }),
      markAllRead: () => set({ notices: get().notices.map((notice) => ({ ...notice, read: true })) }),
      logUsage: (partial) => {
        const event: UsageEvent = { ...partial, id: uid("use"), at: new Date().toISOString() };
        set({ usage: [event, ...get().usage].slice(0, 50) });
      },
      touchSync: (at) =>
        set({
          lastSyncAt: new Date(at).toISOString(),
          syncTimes: [...get().syncTimes.filter((time) => at - time < 15 * 60 * 1000), at].slice(-20),
        }),
      noteCachedSync: () => {
        get().logUsage({
          kind: "x_read",
          detail: "Served from the one-minute cache. No new X request.",
          usd: 0,
          cached: true,
        });
      },
      mergeNotices: (incoming, meta) => {
        const known = new Set(get().notices.map((notice) => notice.id));
        const fresh = incoming.filter((notice) => !known.has(notice.id));
        set({
          notices: [...fresh, ...get().notices],
          mentionsCache: incoming,
          mentionsCachedAt: Date.now(),
        });
        get().touchSync(Date.now());
        get().logUsage({
          kind: "x_read",
          detail: meta.detail,
          usd: meta.usd,
          cached: meta.cached,
        });
        return fresh.length;
      },
      syncSample: () => {
        const state = get();
        if (state.account.status === "disconnected") return { ok: false, reason: "disconnected" };
        const now = Date.now();
        const recent = state.syncTimes.filter((time) => now - time < 15 * 60 * 1000);
        if (recent.length >= 8) return { ok: false, reason: "rate" };
        if (state.lastSyncAt && now - new Date(state.lastSyncAt).getTime() < 60_000) {
          get().noteCachedSync();
          return { ok: true, added: 0, cached: true };
        }
        const known = new Set(state.notices.map((notice) => notice.id));
        const batch = SAMPLE_QUEUE.filter((notice) => !known.has(notice.id)).slice(0, 1);
        set({ notices: [...batch, ...state.notices] });
        get().touchSync(now);
        get().logUsage({
          kind: "x_read" satisfies UsageKind,
          detail: batch.length
            ? "Sample mention added locally. No request was sent to X."
            : "Sample inbox is current. No request was sent to X.",
          usd: 0,
          cached: false,
        });
        return { ok: true, added: batch.length, cached: false };
      },
      saveDraft: ({ noticeId, style, text, source }) => {
        const existing = get().drafts.find(
          (draft) => draft.noticeId === noticeId && draft.status !== "published",
        );
        const updatedAt = new Date().toISOString();
        if (existing) {
          set({
            drafts: get().drafts.map((draft) =>
              draft.id === existing.id ? { ...draft, style, text, source, status: "draft", updatedAt } : draft,
            ),
          });
          return existing.id;
        }
        const id = uid("draft");
        const next: ReplyDraft = { id, noticeId, style, text, status: "draft", source, updatedAt };
        set({ drafts: [next, ...get().drafts] });
        return id;
      },
      editDraft: (id, text) =>
        set({
          drafts: get().drafts.map((draft) =>
            draft.id === id
              ? { ...draft, text, source: "edited", status: draft.status === "published" ? "published" : "draft", updatedAt: new Date().toISOString() }
              : draft,
          ),
        }),
      setDraftStatus: (id, status) =>
        set({
          drafts: get().drafts.map((draft) =>
            draft.id === id ? { ...draft, status, updatedAt: new Date().toISOString() } : draft,
          ),
        }),
      savePost: ({ id, text, status, scheduledFor }) => {
        const posts = get().posts;
        if (id) {
          set({
            posts: posts.map((post) =>
              post.id === id ? { ...post, text, status, scheduledFor, illustrative: false } : post,
            ),
          });
          return;
        }
        set({
          posts: [
            {
              id: uid("post"),
              text,
              status,
              scheduledFor,
              publishedAt: null,
              likes: 0,
              reposts: 0,
              replies: 0,
              impressions: null,
              illustrative: false,
            },
            ...posts,
          ],
        });
      },
      markDue: () => {
        const now = Date.now();
        set({
          posts: get().posts.map((post) => {
            if (post.status !== "scheduled" || !post.scheduledFor) return post;
            if (new Date(post.scheduledFor).getTime() > now) return post;
            return { ...post, status: "due" };
          }),
        });
      },
      publishPost: (id) =>
        set({
          posts: get().posts.map((post) =>
            post.id === id
              ? { ...post, status: "published", publishedAt: new Date().toISOString(), scheduledFor: null }
              : post,
          ),
          weekly: get().weekly.map((point, index, all) =>
            index === all.length - 1 ? { ...point, likes: point.likes } : point,
          ),
        }),
      publishDraft: (id) =>
        set({
          drafts: get().drafts.map((draft) =>
            draft.id === id ? { ...draft, status: "published", updatedAt: new Date().toISOString() } : draft,
          ),
        }),
      toggleIntent: (id) =>
        set({
          people: get().people.map((person) => {
            if (person.id !== id) return person;
            const next =
              person.relation === "following" || person.relation === "mutual" ? "unfollow" : "follow";
            return { ...person, intent: person.intent ? null : next };
          }),
        }),
      toggleLiked: (id) =>
        set({
          people: get().people.map((person) => (person.id === id ? { ...person, liked: !person.liked } : person)),
        }),
      setPeople: (people) => set({ people }),
      setPrefs: (prefs) => set({ prefs: { ...get().prefs, ...prefs } }),
      resetSample: () => {
        const prefs = get().prefs;
        set({ ...buildWorkspace(), prefs });
      },
    }),
    {
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
        mentionsCachedAt: state.mentionsCachedAt,
      }),
      onRehydrateStorage: () => () => {
        useAgent.setState({ epoch: Date.now() });
      },
    },
  ),
);

export function pendingCount(state: WorkspaceData) {
  return state.notices.filter((notice) => {
    const related = state.drafts.filter((draft) => draft.noticeId === notice.id);
    return !related.some((draft) => draft.status === "approved" || draft.status === "published");
  }).length;
}

export function activeDraft(state: WorkspaceData, noticeId: string) {
  const related = state.drafts.filter((draft) => draft.noticeId === noticeId);
  return related.find((draft) => draft.status !== "rejected") ?? related[0] ?? null;
}

export { COSTS };
