import { Link } from "@tanstack/react-router";
import { ConnectPanel } from "@/components/connect-panel";
import { Stamp } from "@/components/stamp";
import { compact } from "@/lib/format";
import { pendingCount, useAgent } from "@/lib/store";

export function CommandView() {
  const account = useAgent((state) => state.account);
  const notices = useAgent((state) => state.notices);
  const drafts = useAgent((state) => state.drafts);
  const posts = useAgent((state) => state.posts);
  const pending = useAgent(pendingCount);
  const spend = useAgent((state) => state.usage.reduce((sum, event) => sum + event.usd, 0));
  const selectNotice = useAgent((state) => state.selectNotice);
  const published = posts.filter((post) => post.status === "published");
  const open = notices.filter((notice) => {
    const related = drafts.filter((draft) => draft.noticeId === notice.id);
    const draft = related.find((item) => item.status !== "rejected") ?? related[0];
    return !draft || (draft.status !== "approved" && draft.status !== "published");
  });

  if (account.status === "disconnected") {
    return (
      <div className="max-w-xl space-y-4">
        <p className="text-sm text-muted">
          Connect your X account, or open the sample workspace. Drafts stay here until you approve and confirm a
          publish.
        </p>
        <ConnectPanel />
      </div>
    );
  }

  const metrics = [
    ["Followers", compact(account.followers)],
    ["Following", compact(account.following)],
    ["Open", compact(notices.filter((notice) => !notice.read).length)],
    ["Pending replies", compact(pending)],
    ["Published", compact(published.length)],
  ] as const;

  return (
    <div className="space-y-8">
      <p className="text-sm text-muted">
        {account.status === "live" ? "Connected to X" : "Sample account"} · @{account.handle}. Autonomous replies are
        off.
      </p>
      <dl className="grid grid-cols-2 gap-px overflow-hidden rounded-lg border border-line bg-line sm:grid-cols-5">
        {metrics.map(([label, value]) => (
          <div key={label} className="bg-bg px-4 py-4">
            <dt className="text-xs text-muted">{label}</dt>
            <dd className="mt-1 text-2xl font-semibold tabular-nums tracking-tight">{value}</dd>
          </div>
        ))}
      </dl>
      <div className="grid gap-8 lg:grid-cols-[minmax(0,1.4fr)_minmax(0,0.8fr)]">
        <section>
          <div className="mb-3 flex items-baseline justify-between">
            <h2 className="text-sm font-medium">Needs a reply</h2>
            <Link to="/inbox" className="text-sm text-accent">
              Inbox
            </Link>
          </div>
          <ul className="divide-y divide-line border-y border-line">
            {open.slice(0, 4).map((notice) => (
              <li key={notice.id} className="flex items-start justify-between gap-4 py-4">
                <div>
                  <p className="text-sm font-medium">
                    {notice.authorName}{" "}
                    <span className="font-normal text-muted">@{notice.authorHandle}</span>
                  </p>
                  <p className="mt-1 text-sm text-muted">{notice.text}</p>
                </div>
                <Link
                  to="/studio"
                  className="shrink-0 text-sm text-accent"
                  onClick={() => selectNotice(notice.id)}
                >
                  Draft
                </Link>
              </li>
            ))}
            {open.length === 0 ? <li className="py-6 text-sm text-muted">Nothing waiting. Sync to look for mentions.</li> : null}
          </ul>
        </section>
        <section className="space-y-6">
          <div>
            <h2 className="mb-3 text-sm font-medium">Published</h2>
            <ul className="space-y-3">
              {published.slice(0, 3).map((post) => (
                <li key={post.id} className="rounded-lg border border-line px-4 py-3">
                  <p className="text-sm">{post.text}</p>
                  <p className="mt-2 text-xs text-muted tabular-nums">
                    {post.likes} likes · {post.reposts} reposts
                    {post.illustrative ? " · illustrative" : ""}
                  </p>
                </li>
              ))}
            </ul>
          </div>
          <p className="text-xs text-muted tabular-nums">Estimated API spend this workspace: ${spend.toFixed(2)}</p>
        </section>
      </div>
    </div>
  );
}
