import { useState } from "react";
import { toast } from "sonner";
import { Stamp } from "@/components/stamp";
import { Button } from "@/components/ui/button";
import type { ResearchDraftPair, ResearchPost } from "@/lib/research";
import { COSTS } from "@/lib/format";
import { useAgent } from "@/lib/store";

export function ResearchView() {
  const account = useAgent((state) => state.account);
  const logUsage = useAgent((state) => state.logUsage);
  const [handle, setHandle] = useState("@elonmusk");
  const [instruction, setInstruction] = useState("Find a sharp, respectful angle. Prefer specific observations over generic praise.");
  const [posts, setPosts] = useState<ResearchPost[]>([]);
  const [drafts, setDrafts] = useState<Record<string, ResearchDraftPair>>({});
  const [busy, setBusy] = useState<"search" | "draft" | null>(null);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [target, setTarget] = useState<{ name: string; handle: string } | null>(null);

  async function search() {
    if (account.status !== "live") {
      toast.error("Connect your X account first.");
      return;
    }
    setBusy("search");
    try {
      const res = await fetch("/api/x/reposts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ handle }),
      });
      const data = (await res.json()) as { ok?: boolean; error?: string; reposts?: ResearchPost[]; target?: { name: string; handle: string } };
      if (!res.ok || !data.ok) throw new Error(data.error || "Could not search X");
      const next = data.reposts ?? [];
      setPosts(next);
      setDrafts({});
      setSelected(new Set(next.map((post) => post.id)));
      setTarget(data.target ?? null);
      toast(next.length ? `${next.length} reposts found.` : "No reposts were found in the returned timeline.");
      logUsage({ kind: "x_read", detail: `Looked up reposts for @${data.target?.handle ?? handle.replace(/^@+/, "")}`, usd: COSTS.mention, cached: false });
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Search failed");
    } finally {
      setBusy(null);
    }
  }

  async function draftSelected() {
    const chosen = posts.filter((post) => selected.has(post.id));
    if (!chosen.length) {
      toast.error("Select at least one repost.");
      return;
    }
    setBusy("draft");
    try {
      const res = await fetch("/api/ai/repost-drafts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ instruction, posts: chosen }),
      });
      const data = (await res.json()) as { ok?: boolean; error?: string; drafts?: ResearchDraftPair[] };
      if (!res.ok || !data.ok) throw new Error(data.error || "Draft generation failed");
      setDrafts(Object.fromEntries((data.drafts ?? []).map((draft) => [draft.postId, draft])));
      logUsage({ kind: "ai", detail: `Drafted reply and quote options for ${chosen.length} X reposts via OpenRouter`, usd: COSTS.ai, cached: false });
      toast("Drafts ready. Nothing was posted to X.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Draft generation failed");
    } finally {
      setBusy(null);
    }
  }

  async function copy(text: string) {
    try {
      await navigator.clipboard.writeText(text);
      toast("Copied to clipboard");
    } catch {
      toast.error("Could not copy");
    }
  }

  function toggle(id: string) {
    setSelected((current) => {
      const next = new Set(current);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  if (account.status !== "live") {
    return <p className="text-sm text-muted">Connect X first, then search any public handle for reposts.</p>;
  }

  return (
    <div className="space-y-6">
      <div className="rounded-lg border border-line bg-surface p-5">
        <h2 className="text-lg font-semibold">Repost research</h2>
        <p className="mt-1 max-w-2xl text-sm text-muted">
          Look up a public handle, review up to 10 reposts from its timeline, and ask OpenRouter for reply and quote-post drafts. Copying is manual; nothing is posted automatically.
        </p>
        <div className="mt-4 grid gap-3 md:grid-cols-[minmax(0,16rem)_1fr_auto]">
          <label>
            <span className="mb-1 block text-xs text-muted">X handle</span>
            <input value={handle} onChange={(event) => setHandle(event.target.value)} placeholder="@elonmusk" className="min-h-11 w-full rounded-lg border border-line bg-bg px-3 text-sm outline-none" />
          </label>
          <label>
            <span className="mb-1 block text-xs text-muted">Instruction for OpenRouter</span>
            <input value={instruction} onChange={(event) => setInstruction(event.target.value)} placeholder="What should the drafts focus on?" className="min-h-11 w-full rounded-lg border border-line bg-bg px-3 text-sm outline-none" />
          </label>
          <div className="flex items-end">
            <Button type="button" variant="primary" disabled={busy !== null} onClick={() => void search()}>{busy === "search" ? "Searching" : "Search X"}</Button>
          </div>
        </div>
        {posts.length ? (
          <div className="mt-4 flex flex-wrap items-center gap-2">
            <Button type="button" variant="primary" disabled={busy !== null} onClick={() => void draftSelected()}>{busy === "draft" ? "Drafting" : `Draft ${selected.size} selected`}</Button>
            <Button type="button" variant="outline" onClick={() => setSelected(new Set(posts.map((post) => post.id)))}>Select all</Button>
            <span className="text-xs text-muted">{target ? `Showing reposts from @${target.handle}` : ""}</span>
          </div>
        ) : null}
      </div>

      {posts.length ? (
        <div className="space-y-4">
          {posts.map((post) => {
            const draft = drafts[post.id];
            return (
              <article key={post.id} className="rounded-lg border border-line bg-surface p-4">
                <div className="flex flex-wrap items-center gap-2 text-sm">
                  <input type="checkbox" checked={selected.has(post.id)} onChange={() => toggle(post.id)} aria-label={`Select repost by @${post.originalAuthorHandle}`} />
                  <span className="font-medium">@{post.originalAuthorHandle}</span>
                  <Stamp iso={post.createdAt} />
                  <a className="ml-auto text-xs text-accent" href={post.url} target="_blank" rel="noreferrer">Open on X</a>
                </div>
                <p className="mt-3 whitespace-pre-wrap text-sm">{post.text}</p>
                {draft ? (
                  <div className="mt-4 grid gap-3 md:grid-cols-2">
                    {(["reply", "quote"] as const).map((kind) => (
                      <div key={kind} className="rounded-lg border border-line p-3">
                        <div className="flex items-center justify-between gap-2">
                          <p className="text-xs font-medium uppercase tracking-wide text-muted">{kind === "reply" ? "Reply draft" : "Quote draft"}</p>
                          <Button type="button" variant="outline" onClick={() => void copy(draft[kind])}>Copy</Button>
                        </div>
                        <p className="mt-2 text-sm">{draft[kind]}</p>
                        <p className="mt-2 text-xs text-muted">{draft[kind].length}/280 · review before posting</p>
                      </div>
                    ))}
                  </div>
                ) : null}
              </article>
            );
          })}
        </div>
      ) : null}
    </div>
  );
}
