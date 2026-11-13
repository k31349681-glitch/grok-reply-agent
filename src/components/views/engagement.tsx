import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { COSTS, compact, utcDay } from "@/lib/format";
import { useAgent } from "@/lib/store";
import type { Person } from "@/lib/types";

export function EngagementView() {
  const account = useAgent((state) => state.account);
  const people = useAgent((state) => state.people);
  const posts = useAgent((state) => state.posts);
  const snapshots = useAgent((state) => state.snapshots);
  const toggleIntent = useAgent((state) => state.toggleIntent);
  const toggleLiked = useAgent((state) => state.toggleLiked);
  const [loading, setLoading] = useState<"followers" | "following" | null>(null);
  const published = posts.filter((post) => post.status === "published");
  const likes = published.reduce((sum, post) => sum + post.likes, 0);
  const reposts = published.reduce((sum, post) => sum + post.reposts, 0);
  const replies = published.reduce((sum, post) => sum + post.replies, 0);
  const impressions = published.reduce((sum, post) => sum + (post.impressions ?? 0), 0);
  const missingImpressions = published.some((post) => post.impressions == null);
  const start = snapshots[0]?.followers ?? account.followers;
  const growth = account.followers - start;

  async function load(resource: "followers" | "following") {
    const state = useAgent.getState();
    if (state.account.status !== "live") {
      toast.error("Follower lists come from X only after OAuth. This sample list is a fixture.");
      return;
    }
    const gate = state.canSpend(COSTS.graph);
    if (!gate.ok) {
      toast.error("Budget limit reached. The list was not requested.");
      return;
    }
    setLoading(resource);
    try {
      const res = await fetch(`/api/analytics?resource=${resource}`);
      const data = (await res.json()) as { ok?: boolean; error?: string; people?: Person[] };
      if (!res.ok || !data.ok || !data.people) {
        toast.error(data.error || "X did not return that list");
        return;
      }
      state.setPeople(data.people);
      state.logUsage({
        kind: "x_read",
        detail: `Loaded ${resource} from X`,
        usd: COSTS.graph,
        cached: false,
      });
      toast(`Loaded ${resource} from X`);
    } catch {
      toast.error("Could not load that list");
    } finally {
      setLoading(null);
    }
  }

  return (
    <div className="space-y-8">
      <p className="max-w-2xl text-sm text-muted">
        Likes, follows, and unfollows stay manual. Marking one here only records your intent. This app will not send
        those actions to X.
      </p>
      <dl className="grid grid-cols-2 gap-px overflow-hidden rounded-lg border border-line bg-line sm:grid-cols-4">
        {[
          ["Follower change", `${growth >= 0 ? "+" : ""}${compact(growth)}`],
          ["Likes", compact(likes)],
          ["Reposts", compact(reposts)],
          ["Replies", compact(replies)],
        ].map(([label, value]) => (
          <div key={label} className="bg-bg px-4 py-4">
            <dt className="text-xs text-muted">{label}</dt>
            <dd className="mt-1 text-2xl font-semibold tabular-nums">{value}</dd>
          </div>
        ))}
      </dl>
      <p className="text-sm text-muted">
        Impressions in view: {missingImpressions ? "partial — some posts have no impression field" : compact(impressions)}
        . Sample figures are illustrative. Live impressions appear only when X returns them.
      </p>
      <div className="flex flex-wrap gap-2">
        <Button type="button" variant="outline" disabled={loading !== null} onClick={() => void load("followers")}>
          {loading === "followers" ? "Loading" : "Load followers"}
        </Button>
        <Button type="button" variant="outline" disabled={loading !== null} onClick={() => void load("following")}>
          {loading === "following" ? "Loading" : "Load following"}
        </Button>
      </div>
      <ul className="divide-y divide-line border-y border-line">
        {people.map((person) => (
          <li key={person.id} className="flex flex-col gap-3 py-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-sm font-medium">
                {person.name} <span className="font-normal text-muted">@{person.handle}</span>
              </p>
              <p className="text-xs text-muted tabular-nums">
                {compact(person.followers)} followers · {labelRelation(person.relation)}
                {person.intent ? ` · marked to ${person.intent}` : ""}
              </p>
            </div>
            <div className="flex gap-2">
              <Button type="button" variant="outline" onClick={() => toggleIntent(person.id)}>
                {person.intent ? "Clear mark" : person.relation === "following" || person.relation === "mutual" ? "Mark unfollow" : "Mark follow"}
              </Button>
              <Button type="button" variant="ghost" onClick={() => toggleLiked(person.id)}>
                {person.liked ? "Liked mark" : "Mark like"}
              </Button>
            </div>
          </li>
        ))}
      </ul>
      <p className="text-xs text-muted">Window starts {utcDay(-13)}.</p>
    </div>
  );
}

function labelRelation(relation: Person["relation"]) {
  if (relation === "follows_you") return "follows you";
  if (relation === "mutual") return "mutual";
  if (relation === "following") return "following";
  return "no relation stored";
}
