import { useState } from "react";
import { toast } from "sonner";
import { ConfirmDialog } from "@/components/confirm-dialog";
import { Stamp } from "@/components/stamp";
import { Button } from "@/components/ui/button";
import { COSTS } from "@/lib/format";
import { useAgent } from "@/lib/store";
import type { ManagedPost } from "@/lib/types";

export function PostsView() {
  const posts = useAgent((state) => state.posts);
  const account = useAgent((state) => state.account);
  const [text, setText] = useState("");
  const [when, setWhen] = useState("");
  const [editing, setEditing] = useState<string | null>(null);
  const [confirmId, setConfirmId] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const target = posts.find((post) => post.id === confirmId) ?? null;

  function load(post: ManagedPost) {
    setEditing(post.id);
    setText(post.text);
    setWhen(post.scheduledFor ? toLocal(post.scheduledFor) : "");
  }

  function save(status: "draft" | "scheduled") {
    const clean = text.trim();
    if (!clean) {
      toast.error("Write the post first.");
      return;
    }
    if (clean.length > 280) {
      toast.error("Keep it within 280 characters.");
      return;
    }
    if (status === "scheduled" && !when) {
      toast.error("Pick a time to schedule.");
      return;
    }
    useAgent.getState().savePost({
      id: editing ?? undefined,
      text: clean,
      status,
      scheduledFor: status === "scheduled" ? new Date(when).toISOString() : null,
    });
    toast(status === "scheduled" ? "Scheduled. It will wait for your confirmation." : "Draft saved");
    if (!editing) {
      setText("");
      setWhen("");
    }
  }

  async function publish() {
    if (!target) return;
    if (account.status !== "live") {
      useAgent.getState().publishPost(target.id);
      setConfirmId(null);
      toast("Marked published in this workspace. It was not sent to X.");
      return;
    }
    setBusy(true);
    try {
      const res = await fetch("/api/x/publish", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: target.text, confirm: true }),
      });
      const data = (await res.json()) as { ok?: boolean; error?: string; id?: string };
      if (!res.ok || !data.ok) {
        toast.error(data.error || "X did not accept the post");
        return;
      }
      useAgent.getState().publishPost(target.id);
      useAgent.getState().logUsage({
        kind: "x_write",
        detail: `Post ${data.id} published on X`,
        usd: COSTS.publish,
        cached: false,
      });
      toast("Published to X");
      setConfirmId(null);
    } catch {
      toast.error("Publish failed");
    } finally {
      setBusy(false);
    }
  }

  const groups = [
    ["Drafts", posts.filter((post) => post.status === "draft")],
    ["Scheduled", posts.filter((post) => post.status === "scheduled" || post.status === "due")],
    ["Published", posts.filter((post) => post.status === "published")],
  ] as const;

  return (
    <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_18rem]">
      <div className="space-y-4">
        <label className="block">
          <span className="sr-only">Post</span>
          <textarea
            value={text}
            onChange={(event) => setText(event.target.value)}
            rows={5}
            placeholder="Write a post. Scheduling does not publish it."
            className="w-full resize-y rounded-lg border border-line bg-surface px-3 py-3 text-sm outline-none"
          />
        </label>
        <div className="flex flex-wrap items-center gap-2">
          <input
            type="datetime-local"
            value={when}
            onChange={(event) => setWhen(event.target.value)}
            className="min-h-11 rounded-lg border border-line bg-surface px-3 text-sm"
          />
          <Button type="button" variant="outline" onClick={() => save("draft")}>
            Save draft
          </Button>
          <Button type="button" variant="outline" onClick={() => save("scheduled")}>
            Schedule
          </Button>
          {editing ? (
            <Button
              type="button"
              variant="ghost"
              onClick={() => {
                setEditing(null);
                setText("");
                setWhen("");
              }}
            >
              New post
            </Button>
          ) : null}
          <span className="text-xs tabular-nums text-muted">{text.trim().length}/280</span>
        </div>
        <section className="rounded-lg border border-line p-4">
          <p className="text-xs tracking-widest text-muted uppercase">Preview</p>
          <div className="mt-3 flex gap-3">
            <span className="grid size-10 shrink-0 place-items-center rounded-full bg-surface-2 text-sm font-semibold">
              {(account.name || "You").slice(0, 1)}
            </span>
            <div>
              <p className="text-sm font-medium">
                {account.name || "Not connected"}{" "}
                <span className="font-normal text-muted">{account.handle ? `@${account.handle}` : ""}</span>
              </p>
              <p className="mt-1 text-sm">{text.trim() || "Your post will preview here."}</p>
            </div>
          </div>
        </section>
      </div>
      <div className="space-y-6">
        {groups.map(([label, items]) => (
          <section key={label}>
            <h2 className="mb-2 text-sm font-medium">{label}</h2>
            <ul className="space-y-2">
              {items.map((post) => (
                <li key={post.id} className="rounded-lg border border-line px-3 py-3">
                  <p className="text-sm">{post.text}</p>
                  <p className="mt-2 text-xs text-muted">
                    {post.status === "due" ? "Ready — confirmation still required" : post.status}
                    {post.scheduledFor ? <span> · <Stamp iso={post.scheduledFor} /></span> : null}
                    {post.publishedAt ? <span> · <Stamp iso={post.publishedAt} /></span> : null}
                  </p>
                  <div className="mt-2 flex gap-2">
                    {post.status !== "published" ? (
                      <Button type="button" variant="ghost" className="px-2" onClick={() => load(post)}>
                        Edit
                      </Button>
                    ) : null}
                    {post.status !== "published" ? (
                      <Button type="button" variant="primary" className="px-3" onClick={() => setConfirmId(post.id)}>
                        Publish
                      </Button>
                    ) : null}
                  </div>
                </li>
              ))}
              {items.length === 0 ? <li className="text-sm text-muted">None</li> : null}
            </ul>
          </section>
        ))}
      </div>
      <ConfirmDialog
        open={Boolean(target)}
        title="Publish this post?"
        body={
          account.status === "live"
            ? "This sends the text to X from the connected account."
            : "This only records the post in the workspace. It will not be sent to X."
        }
        confirmLabel="Publish post"
        busy={busy}
        onOpenChange={(open) => {
          if (!open) setConfirmId(null);
        }}
        onConfirm={() => void publish()}
      />
    </div>
  );
}

function toLocal(iso: string) {
  const date = new Date(iso);
  const pad = (value: number) => String(value).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}
