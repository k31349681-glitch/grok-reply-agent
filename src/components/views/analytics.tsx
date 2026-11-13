import { useEffect, useState } from "react";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { compact, utcDay } from "@/lib/format";
import { useAgent } from "@/lib/store";
import { cn } from "@/lib/utils";

const TABS = ["followers", "weekly", "monthly", "posts", "activity"] as const;
type Tab = (typeof TABS)[number];

export function AnalyticsView() {
  const snapshots = useAgent((state) => state.snapshots);
  const weekly = useAgent((state) => state.weekly);
  const monthly = useAgent((state) => state.monthly);
  const posts = useAgent((state) => state.posts);
  const [tab, setTab] = useState<Tab>("followers");
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  const followerSeries = snapshots.map((point) => ({
    date: point.date.slice(5),
    followers: point.followers,
  }));
  const best = [...posts]
    .filter((post) => post.status === "published")
    .sort((a, b) => b.likes - a.likes);
  const activity = Array.from({ length: 14 }, (_, index) => {
    const date = utcDay(index - 13);
    return {
      date: date.slice(5),
      posts: posts.filter((post) => post.publishedAt?.slice(0, 10) === date).length,
    };
  });

  return (
    <div className="space-y-5">
      <p className="max-w-2xl text-sm text-muted">
        Charts use figures this workspace actually has: follower snapshots, and public likes, reposts, and replies.
        Sample points are labeled illustrative on the posts themselves.
      </p>
      <div className="flex gap-2 overflow-x-auto">
        {TABS.map((item) => (
          <button
            key={item}
            type="button"
            onClick={() => setTab(item)}
            className={cn(
              "min-h-11 shrink-0 rounded-lg px-3 text-sm capitalize",
              tab === item ? "bg-surface-2 text-fg" : "text-muted",
            )}
          >
            {item === "posts" ? "Best posts" : item}
          </button>
        ))}
      </div>
      {tab === "posts" ? (
        <ol className="divide-y divide-line border-y border-line">
          {best.map((post, index) => (
            <li key={post.id} className="flex items-start justify-between gap-4 py-4">
              <div>
                <p className="text-xs text-muted tabular-nums">#{index + 1}</p>
                <p className="mt-1 text-sm">{post.text}</p>
              </div>
              <p className="shrink-0 text-right text-xs text-muted tabular-nums">
                {compact(post.likes)} likes
                <br />
                {compact(post.reposts)} reposts
                <br />
                {post.impressions == null ? "No impressions" : `${compact(post.impressions)} impressions`}
                {post.illustrative ? <span className="block">Illustrative</span> : null}
              </p>
            </li>
          ))}
        </ol>
      ) : (
        <div className="h-72 w-full min-w-0 rounded-lg border border-line p-3">
          {mounted ? (
            <ResponsiveContainer width="100%" height="100%">
              {tab === "followers" ? (
                <AreaChart data={followerSeries}>
                  <CartesianGrid stroke="var(--color-line)" vertical={false} />
                  <XAxis dataKey="date" stroke="var(--color-muted)" tick={{ fill: "var(--color-muted)", fontSize: 12 }} />
                  <YAxis stroke="var(--color-muted)" tick={{ fill: "var(--color-muted)", fontSize: 12 }} width={48} />
                  <Tooltip contentStyle={tip} />
                  <Area dataKey="followers" stroke="var(--color-accent)" fill="var(--color-accent)" fillOpacity={0.16} strokeWidth={2} />
                </AreaChart>
              ) : tab === "weekly" ? (
                <BarChart data={weekly}>
                  <CartesianGrid stroke="var(--color-line)" vertical={false} />
                  <XAxis dataKey="label" stroke="var(--color-muted)" tick={{ fill: "var(--color-muted)", fontSize: 12 }} />
                  <YAxis stroke="var(--color-muted)" tick={{ fill: "var(--color-muted)", fontSize: 12 }} width={40} />
                  <Tooltip contentStyle={tip} />
                  <Bar dataKey="likes" fill="var(--color-accent)" radius={4} />
                  <Bar dataKey="reposts" fill="var(--color-fg)" radius={4} />
                  <Bar dataKey="replies" fill="var(--color-muted)" radius={4} />
                </BarChart>
              ) : tab === "monthly" ? (
                <BarChart data={monthly}>
                  <CartesianGrid stroke="var(--color-line)" vertical={false} />
                  <XAxis dataKey="label" stroke="var(--color-muted)" tick={{ fill: "var(--color-muted)", fontSize: 12 }} />
                  <YAxis stroke="var(--color-muted)" tick={{ fill: "var(--color-muted)", fontSize: 12 }} width={40} />
                  <Tooltip contentStyle={tip} />
                  <Bar dataKey="posts" fill="var(--color-accent)" radius={4} />
                </BarChart>
              ) : (
                <BarChart data={activity}>
                  <CartesianGrid stroke="var(--color-line)" vertical={false} />
                  <XAxis dataKey="date" stroke="var(--color-muted)" tick={{ fill: "var(--color-muted)", fontSize: 12 }} />
                  <YAxis allowDecimals={false} stroke="var(--color-muted)" tick={{ fill: "var(--color-muted)", fontSize: 12 }} width={32} />
                  <Tooltip contentStyle={tip} />
                  <Bar dataKey="posts" fill="var(--color-accent)" radius={4} />
                </BarChart>
              )}
            </ResponsiveContainer>
          ) : null}
        </div>
      )}
    </div>
  );
}

const tip = {
  background: "var(--color-surface)",
  border: "1px solid var(--color-line)",
  borderRadius: 12,
  color: "var(--color-fg)",
};
