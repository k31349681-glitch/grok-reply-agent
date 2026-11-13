import { isoHoursAgo, utcDay } from "@/lib/format";
import type { Notice, WorkspaceData } from "@/lib/types";

export const SAMPLE_QUEUE: Notice[] = [
  {
    id: "n-queue-1",
    kind: "mention",
    authorName: "Orbit Daily",
    authorHandle: "orbitdaily",
    text: "Battery cost curves are doing more for climate than any keynote. Agree, or is that too neat?",
    createdAt: isoHoursAgo(1),
    context: "Quote-style mention. No earlier thread stored.",
    read: false,
    source: "sample",
  },
  {
    id: "n-queue-2",
    kind: "reply",
    authorName: "Jun Park",
    authorHandle: "junpark",
    text: "Your note on inference cost was sharp. What do people still price wrong?",
    createdAt: isoHoursAgo(2),
    context: "Reply under a thread about cost per token versus cost per successful task.",
    read: false,
    source: "sample",
  },
];

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

function monthLabel(offsetFromNow: number) {
  const d = new Date();
  const index = (d.getUTCMonth() - offsetFromNow + 12) % 12;
  return MONTHS[index] ?? "—";
}

export function buildWorkspace(): WorkspaceData {
  const followers = 18420;
  const snapshots = Array.from({ length: 14 }, (_, index) => {
    const day = index - 13;
    return {
      date: utcDay(day),
      followers: followers - (13 - index) * 18 - ((index * 3) % 7),
      following: 512,
    };
  });
  snapshots[snapshots.length - 1] = {
    date: utcDay(0),
    followers,
    following: 512,
  };

  const notices: Notice[] = [
    {
      id: "n1",
      kind: "mention",
      authorName: "Aria Chen",
      authorHandle: "ariachen",
      text: "Most AI assistants just rephrase the timeline. What would a reply agent actually decide not to say?",
      createdAt: isoHoursAgo(5),
      context: "Mention with no parent post stored. The question is about refusal, not volume.",
      read: false,
      source: "sample",
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
      source: "sample",
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
      source: "sample",
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
      source: "sample",
    },
  ];

  return {
    account: {
      status: "sample",
      name: "Avery Quinn",
      handle: "averybuilds",
      followers,
      following: 512,
      userId: null,
    },
    notices,
    drafts: [
      {
        id: "d1",
        noticeId: "n3",
        style: "intelligent",
        text: "@minaokonkwo Posting more is a cost. Distribution is the product decision: who sees it, when, and why they would care.",
        status: "approved",
        source: "template",
        updatedAt: isoHoursAgo(3),
      },
    ],
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
        illustrative: true,
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
        illustrative: true,
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
        illustrative: true,
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
        illustrative: false,
      },
      {
        id: "p5",
        text: "Tomorrow: a short thread on distribution as a product surface, not a growth hack.",
        status: "scheduled",
        scheduledFor: new Date(Math.floor(Date.now() / 3_600_000) * 3_600_000 + 26 * 3_600_000).toISOString(),
        publishedAt: null,
        likes: 0,
        reposts: 0,
        replies: 0,
        impressions: null,
        illustrative: false,
      },
    ],
    people: [
      {
        id: "u1",
        name: "Aria Chen",
        handle: "ariachen",
        followers: 22100,
        relation: "follows_you",
        intent: null,
        liked: false,
      },
      {
        id: "u2",
        name: "Kepler Lab",
        handle: "keplerlab",
        followers: 89040,
        relation: "mutual",
        intent: null,
        liked: false,
      },
      {
        id: "u3",
        name: "Mina Okonkwo",
        handle: "minaokonkwo",
        followers: 14002,
        relation: "following",
        intent: null,
        liked: true,
      },
      {
        id: "u4",
        name: "Jun Park",
        handle: "junpark",
        followers: 6700,
        relation: "none",
        intent: null,
        liked: false,
      },
      {
        id: "u5",
        name: "Leah Voss",
        handle: "leahvoss",
        followers: 3104,
        relation: "follows_you",
        intent: null,
        liked: false,
      },
    ],
    snapshots,
    weekly: [
      { label: "W-7", likes: 420, reposts: 40, replies: 18 },
      { label: "W-6", likes: 510, reposts: 48, replies: 22 },
      { label: "W-5", likes: 380, reposts: 31, replies: 14 },
      { label: "W-4", likes: 640, reposts: 70, replies: 28 },
      { label: "W-3", likes: 590, reposts: 61, replies: 25 },
      { label: "W-2", likes: 710, reposts: 80, replies: 33 },
      { label: "W-1", likes: 880, reposts: 102, replies: 44 },
      { label: "Now", likes: 656, reposts: 54, replies: 22 },
    ],
    monthly: [5, 4, 3, 2, 1, 0].map((offset, index) => ({
      label: monthLabel(offset),
      posts: 6 + index * 2,
      engagements: 900 + index * 420,
    })),
    usage: [],
    prefs: { style: "intelligent", budgetUsd: 10, hardStop: true },
    lastSyncAt: null,
    syncTimes: [],
    selectedNoticeId: "n1",
    mentionsCache: null,
    mentionsCachedAt: null,
  };
}
