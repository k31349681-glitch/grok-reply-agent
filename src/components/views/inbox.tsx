import { Link } from "@tanstack/react-router";
import { useState } from "react";
import { Stamp } from "@/components/stamp";
import { Button } from "@/components/ui/button";
import { useAgent } from "@/lib/store";
import { cn } from "@/lib/utils";

const FILTERS = ["all", "mention", "reply"] as const;

export function InboxView() {
  const notices = useAgent((state) => state.notices);
  const account = useAgent((state) => state.account);
  const markRead = useAgent((state) => state.markRead);
  const markAllRead = useAgent((state) => state.markAllRead);
  const selectNotice = useAgent((state) => state.selectNotice);
  const [filter, setFilter] = useState<(typeof FILTERS)[number]>("all");
  const visible = notices.filter((notice) => filter === "all" || notice.kind === filter);

  return (
    <div className="space-y-4">
      <p className="max-w-2xl text-sm text-muted">
        Mentions and replies only. X API v2 does not return the full native notification tab, so this inbox will not
        pretend it has.
      </p>
      <div className="flex flex-wrap items-center gap-2">
        {FILTERS.map((item) => (
          <button
            key={item}
            type="button"
            onClick={() => setFilter(item)}
            className={cn(
              "min-h-11 rounded-lg px-3 text-sm capitalize",
              filter === item ? "bg-surface-2 text-fg" : "text-muted",
            )}
          >
            {item === "all" ? "All" : item === "mention" ? "Mentions" : "Replies"}
          </button>
        ))}
        <Button type="button" variant="ghost" onClick={() => markAllRead()} disabled={account.status === "disconnected"}>
          Mark read
        </Button>
      </div>
      {account.status === "disconnected" ? (
        <p className="text-sm text-muted">Connect a workspace to keep an inbox.</p>
      ) : (
        <ul className="divide-y divide-line border-y border-line">
          {visible.map((notice) => (
            <li key={notice.id} className="flex flex-col gap-3 py-4 sm:flex-row sm:items-start sm:justify-between">
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <p className="text-sm font-medium">{notice.authorName}</p>
                  <p className="text-sm text-muted">@{notice.authorHandle}</p>
                  <span className="text-xs tracking-wide text-muted uppercase">{notice.kind}</span>
                  {!notice.read ? <span className="text-xs text-accent">New</span> : null}
                  <Stamp iso={notice.createdAt} />
                </div>
                <p className="mt-2 text-sm">{notice.text}</p>
                <p className="mt-1 text-xs text-muted">{notice.source === "sample" ? "Fixture" : "From X"}</p>
              </div>
              <Link
                to="/studio"
                className="inline-flex min-h-11 items-center text-sm text-accent"
                onClick={() => {
                  markRead(notice.id);
                  selectNotice(notice.id);
                }}
              >
                Draft reply
              </Link>
            </li>
          ))}
          {visible.length === 0 ? <li className="py-8 text-sm text-muted">Nothing in this filter.</li> : null}
        </ul>
      )}
    </div>
  );
}
