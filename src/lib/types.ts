export const STYLES = ["intelligent", "short", "analytical", "alternative"] as const;
export type ReplyStyle = (typeof STYLES)[number];

export type AccountStatus = "disconnected" | "sample" | "live";

export type Account = {
  status: AccountStatus;
  name: string;
  handle: string;
  followers: number;
  following: number;
  userId: string | null;
};

export type Notice = {
  id: string;
  kind: "mention" | "reply";
  authorName: string;
  authorHandle: string;
  text: string;
  createdAt: string;
  context: string;
  read: boolean;
  source: "sample" | "x";
};

export type DraftStatus = "draft" | "approved" | "rejected" | "published";

export type ReplyDraft = {
  id: string;
  noticeId: string;
  style: ReplyStyle;
  text: string;
  status: DraftStatus;
  source: "ai" | "template" | "edited";
  updatedAt: string;
};

export type PostStatus = "draft" | "scheduled" | "due" | "published";

export type ManagedPost = {
  id: string;
  text: string;
  status: PostStatus;
  scheduledFor: string | null;
  publishedAt: string | null;
  likes: number;
  reposts: number;
  replies: number;
  impressions: number | null;
  illustrative: boolean;
};

export type Person = {
  id: string;
  name: string;
  handle: string;
  followers: number;
  relation: "follows_you" | "following" | "mutual" | "none";
  intent: "follow" | "unfollow" | null;
  liked: boolean;
};

export type Snapshot = { date: string; followers: number; following: number };
export type WeekPoint = { label: string; likes: number; reposts: number; replies: number };
export type MonthPoint = { label: string; posts: number; engagements: number };

export type UsageKind = "x_read" | "x_write" | "ai";

export type UsageEvent = {
  id: string;
  at: string;
  kind: UsageKind;
  detail: string;
  usd: number;
  cached: boolean;
};

export type Prefs = {
  style: ReplyStyle;
  budgetUsd: number;
  hardStop: boolean;
};

/**
 * Production table map (not created here — this preview keeps the workspace
 * in the browser so tokens are never written to a shared database):
 * profiles, connected_accounts, notifications, monitored_posts, reply_drafts,
 * scheduled_posts, published_posts, engagement_metrics, follower_snapshots,
 * api_usage_logs, user_preferences.
 */
export type WorkspaceData = {
  account: Account;
  notices: Notice[];
  drafts: ReplyDraft[];
  posts: ManagedPost[];
  people: Person[];
  snapshots: Snapshot[];
  weekly: WeekPoint[];
  monthly: MonthPoint[];
  usage: UsageEvent[];
  prefs: Prefs;
  lastSyncAt: string | null;
  syncTimes: number[];
  selectedNoticeId: string | null;
  mentionsCache: Notice[] | null;
  mentionsCachedAt: number | null;
};
