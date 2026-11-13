import { Link, useRouterState } from "@tanstack/react-router";
import {
  ChartColumn,
  Gauge,
  Inbox,
  LayoutDashboard,
  PenLine,
  Search,
  Send,
  Users,
} from "lucide-react";
import { useEffect, useState, type ReactNode } from "react";
import { toast } from "sonner";
import { ConnectPanel, ConnectXButton } from "@/components/connect-panel";
import { useNow } from "@/components/stamp";
import { Button } from "@/components/ui/button";
import { COSTS, money, rel } from "@/lib/format";
import { pendingCount, useAgent } from "@/lib/store";
import { cn } from "@/lib/utils";

const NAV = [
  { to: "/", label: "Command", short: "Home", icon: LayoutDashboard },
  { to: "/inbox", label: "Inbox", short: "Inbox", icon: Inbox },
  { to: "/studio", label: "Replies", short: "Reply", icon: PenLine },
  { to: "/research", label: "Research", short: "Research", icon: Search },
  { to: "/posts", label: "Posts", short: "Post", icon: Send },
  { to: "/engagement", label: "People", short: "People", icon: Users },
  { to: "/analytics", label: "Analytics", short: "Stats", icon: ChartColumn },
  { to: "/usage", label: "Usage", short: "Usage", icon: Gauge },
] as const;

export function AppShell({ title, children }: { title: string; children: ReactNode }) {
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
    void (async () => {
      await useAgent.persist.rehydrate();
      if (cancelled) return;
      useAgent.getState().markDue();
      try {
        const res = await fetch("/api/x/mentions?probe=1");
        const data = (await res.json()) as {
          account?: { name: string; handle: string; followers: number; following: number; userId: string };
          expired?: boolean;
          error?: string;
        };
        if (cancelled) return;
        if (data.expired) {
          useAgent.getState().disconnect();
          toast.error(data.error || "X credentials expired. Reconnect.");
          return;
        }
        if (data.account) useAgent.getState().applyLiveAccount(data.account);
      } catch {
        // Probe is optional. The workspace still works offline.
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  async function disconnect() {
    await fetch("/api/x/auth", { method: "DELETE" }).catch(() => undefined);
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
    const recent = state.syncTimes.filter((time) => nowMs - time < 15 * 60 * 1000);
    if (recent.length >= 8) {
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
    if (state.mentionsCachedAt && nowMs - state.mentionsCachedAt < 60_000) {
      state.noteCachedSync();
      toast("Mentions are still inside the one-minute cache.");
      return;
    }
    const gate = state.canSpend(COSTS.mention);
    if (!gate.ok) {
      toast.error("Estimated spend is at the limit. Sync is stopped.");
      return;
    }
    setSyncing(true);
    try {
      const res = await fetch("/api/x/mentions");
      const data = (await res.json()) as {
        ok?: boolean;
        error?: string;
        expired?: boolean;
        account?: { name: string; handle: string; followers: number; following: number; userId: string };
        mentions?: Parameters<typeof state.mergeNotices>[0];
      };
      if (data.account) state.applyLiveAccount(data.account);
      if (!res.ok || !data.ok) {
        if (data.expired) state.disconnect();
        toast.error(data.error || "Sync failed");
        return;
      }
      const added = state.mergeNotices(data.mentions ?? [], {
        usd: COSTS.mention,
        detail: "Mentions read from X API v2",
        cached: false,
      });
      toast(added ? `${added} new from X` : "No new mentions from X");
    } catch {
      toast.error("Sync failed");
    } finally {
      setSyncing(false);
    }
  }

  const mobile = NAV.filter((item) => ["/", "/inbox", "/studio", "/research"].includes(item.to));
  const overflow = NAV.filter((item) => !["/", "/inbox", "/studio", "/research"].includes(item.to));
  const ratio = budget > 0 ? Math.min(1, spend / budget) : 1;

  return (
    <div className="min-h-dvh bg-bg text-fg">
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-60 flex-col border-r border-line bg-bg md:flex">
        <div className="px-4 pt-6 pb-4">
          <div className="flex items-center gap-3">
            <span className="grid size-9 place-items-center rounded-lg bg-accent text-sm font-semibold text-accent-fg">
              E
            </span>
            <div>
              <p className="text-sm font-semibold tracking-tight">Elon Reply</p>
              <p className="text-xs text-muted">Agent</p>
            </div>
          </div>
        </div>
        <nav className="flex flex-1 flex-col gap-1 px-3">
          {NAV.map((item) => {
            const active = path === item.to;
            const Icon = item.icon;
            const badge = item.to === "/inbox" ? unread : item.to === "/studio" ? pending : 0;
            return (
              <Link
                key={item.to}
                to={item.to}
                className={cn(
                  "flex min-h-11 items-center gap-3 rounded-lg px-3 text-sm",
                  active ? "bg-surface-2 text-fg" : "text-muted hover:bg-surface hover:text-fg",
                )}
              >
                <Icon className="size-4" aria-hidden="true" />
                <span className="flex-1">{item.label}</span>
                {badge > 0 ? <span className="tabular-nums text-xs text-accent">{badge}</span> : null}
              </Link>
            );
          })}
        </nav>
        <div className="border-t border-line p-4">
          {account.status === "disconnected" ? (
            <ConnectPanel compact />
          ) : (
            <div className="space-y-3">
              <div>
                <p className="text-sm font-medium">{account.name}</p>
                <p className="text-xs text-muted">@{account.handle}</p>
                <p className="mt-1 text-xs text-muted">{account.status === "live" ? "Live X account" : "Sample workspace"}</p>
              </div>
              <Button type="button" variant="ghost" className="w-full" onClick={() => void disconnect()}>
                Disconnect
              </Button>
            </div>
          )}
        </div>
      </aside>

      <div className="md:pl-60">
        <div className="mx-auto w-full max-w-6xl px-4 pt-5 pb-28 md:px-8 md:pt-8 md:pb-12">
          {account.status === "sample" ? (
            <p className="mb-5 rounded-lg border border-line bg-surface px-3 py-2 text-sm text-muted">
              Sample workspace. These mentions are fixtures so you can rehearse the workflow. They are not your X
              notifications, and nothing is sent to X.
            </p>
          ) : null}
          <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
            <div>
              <p className="text-xs tracking-widest text-muted uppercase">Elon Reply Agent</p>
              <h1 className="text-2xl font-semibold tracking-tight">{title}</h1>
            </div>
            <div className="flex items-center gap-3">
              <p className="text-xs text-muted tabular-nums">
                {lastSyncAt && now ? `Synced ${rel(lastSyncAt, now)}` : "Not synced yet"}
              </p>
              {account.status !== "live" ? <ConnectXButton className="shrink-0" /> : null}
              <Button type="button" variant="primary" disabled={syncing} onClick={() => void sync()}>
                {syncing ? "Syncing" : "Sync"}
              </Button>
            </div>
          </div>
          <div className="mb-6">
            <div className="mb-1 flex justify-between text-xs text-muted tabular-nums">
              <span>Estimated spend {money(spend)}</span>
              <span>Limit {money(budget)}</span>
            </div>
            <div className="h-1 overflow-hidden rounded-full bg-surface-2">
              <div className="h-full bg-accent" style={{ width: `${ratio * 100}%` }} />
            </div>
          </div>
          {children}
        </div>
      </div>

      {more ? (
        <div className="fixed inset-x-0 bottom-16 z-40 border-t border-line bg-surface p-3 md:hidden">
          {overflow.map((item) => (
            <Link
              key={item.to}
              to={item.to}
              onClick={() => setMore(false)}
              className="flex min-h-11 items-center rounded-lg px-3 text-sm"
            >
              {item.label}
            </Link>
          ))}
        </div>
      ) : null}

      <nav className="fixed inset-x-0 bottom-0 z-40 border-t border-line bg-bg md:hidden">
        <div className="grid grid-cols-5">
          {mobile.map((item) => {
            const active = path === item.to;
            const Icon = item.icon;
            return (
              <Link
                key={item.to}
                to={item.to}
                className={cn(
                  "flex min-h-14 flex-col items-center justify-center gap-1 text-xs",
                  active ? "text-fg" : "text-muted",
                )}
              >
                <Icon className="size-4" aria-hidden="true" />
                {item.short}
              </Link>
            );
          })}
          <button
            type="button"
            className={cn(
              "flex min-h-14 flex-col items-center justify-center gap-1 text-xs",
              overflow.some((item) => item.to === path) ? "text-fg" : "text-muted",
            )}
            onClick={() => setMore((open) => !open)}
          >
            <Gauge className="size-4" aria-hidden="true" />
            More
          </button>
        </div>
      </nav>
    </div>
  );
}
