import { useEffect, useState } from "react";
import { toast } from "sonner";
import { ConfirmDialog } from "@/components/confirm-dialog";
import { Stamp } from "@/components/stamp";
import { Button } from "@/components/ui/button";
import { fallbackReply } from "@/lib/fallback-reply";
import { generateReply } from "@/lib/ai.functions";
import { COSTS } from "@/lib/format";
import { activeDraft, useAgent } from "@/lib/store";
import { STYLES, type ReplyStyle } from "@/lib/types";
import { cn } from "@/lib/utils";

const LABELS: Record<ReplyStyle, string> = {
  intelligent: "Intelligent",
  short: "Short",
  analytical: "Analytical",
  alternative: "Alternative",
};

export function StudioView() {
  const notices = useAgent((state) => state.notices);
  const selectedId = useAgent((state) => state.selectedNoticeId);
  const draft = useAgent((state) => (selectedId ? activeDraft(state, selectedId) : null));
  const epoch = useAgent((state) => state.epoch);
  const account = useAgent((state) => state.account);
  const selectNotice = useAgent((state) => state.selectNotice);
  const [style, setStyle] = useState<ReplyStyle>("intelligent");
  const [text, setText] = useState(draft?.text ?? "");
  const [busy, setBusy] = useState(false);
  const [confirm, setConfirm] = useState(false);
  const notice = notices.find((item) => item.id === selectedId) ?? notices[0] ?? null;

  useEffect(() => {
    const current = notice ? activeDraft(useAgent.getState(), notice.id) : null;
    setText(current?.text ?? "");
    if (current?.style) setStyle(current.style);
  }, [notice?.id, epoch]);

  async function generate() {
    if (!notice) return;
    const state = useAgent.getState();
    const gate = state.canSpend(COSTS.ai);
    if (!gate.ok) {
      toast.error(gate.reason === "budget" ? "Budget limit reached. Generation is paused." : "Connect a workspace first.");
      return;
    }
    setBusy(true);
    try {
      const result = await generateReply({
        data: {
          post: notice.text,
          context: notice.context,
          author: notice.authorHandle,
          style,
        },
      });
      state.saveDraft({
        noticeId: notice.id,
        style,
        text: result.text,
        source: result.provider === "template" ? "template" : "ai",
      });
      setText(result.text);
      state.logUsage({
        kind: "ai",
        detail:
          result.provider === "template"
            ? "Local template. No model call succeeded."
            : `Draft via ${result.provider}`,
        usd: result.provider === "template" ? 0 : COSTS.ai,
        cached: false,
      });
      toast(result.provider === "template" ? "Drafted from the local template." : "Draft ready. Nothing has been posted.");
    } catch {
      const fallback = fallbackReply({ post: notice.text, author: notice.authorHandle, style });
      useAgent.getState().saveDraft({ noticeId: notice.id, style, text: fallback, source: "template" });
      setText(fallback);
      toast("Model unavailable. Used the local template.");
    } finally {
      setBusy(false);
    }
  }

  function edit(value: string) {
    setText(value);
    if (!notice) return;
    const current = activeDraft(useAgent.getState(), notice.id);
    if (!current || current.status === "published") return;
    useAgent.getState().editDraft(current.id, value);
  }

  async function copy() {
    if (!text.trim()) return;
    try {
      await navigator.clipboard.writeText(text);
      toast("Copied");
    } catch {
      toast.error("Could not copy");
    }
  }

  async function publish() {
    if (!draft || !notice) return;
    if (account.status !== "live" || !/^\d{5,}$/.test(notice.id)) {
      useAgent.getState().publishDraft(draft.id);
      setConfirm(false);
      toast("Marked published in this workspace. It was not sent to X.");
      return;
    }
    setBusy(true);
    try {
      const res = await fetch("/api/x/publish", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text, confirm: true, replyTo: notice.id }),
      });
      const data = (await res.json()) as { ok?: boolean; error?: string; id?: string };
      if (!res.ok || !data.ok) {
        toast.error(data.error || "X did not accept the reply");
        return;
      }
      useAgent.getState().publishDraft(draft.id);
      useAgent.getState().logUsage({
        kind: "x_write",
        detail: `Reply ${data.id} published on X`,
        usd: COSTS.publish,
        cached: false,
      });
      toast("Published to X");
      setConfirm(false);
    } catch {
      toast.error("Publish failed");
    } finally {
      setBusy(false);
    }
  }

  if (!notice || account.status === "disconnected") {
    return <p className="text-sm text-muted">Connect a workspace and pick a mention before drafting.</p>;
  }

  const locked = draft?.status === "published";

  return (
    <div className="grid gap-6 lg:grid-cols-[18rem_minmax(0,1fr)]">
      <ul className="divide-y divide-line border-y border-line lg:border lg:rounded-lg lg:px-2">
        {notices.map((item) => (
          <li key={item.id}>
            <button
              type="button"
              onClick={() => selectNotice(item.id)}
              className={cn(
                "w-full px-2 py-3 text-left",
                item.id === notice.id ? "text-fg" : "text-muted",
              )}
            >
              <span className="block text-sm font-medium">@{item.authorHandle}</span>
              <span className="mt-1 block text-sm">{item.text}</span>
            </button>
          </li>
        ))}
      </ul>
      <div className="space-y-4">
        <article className="rounded-lg border border-line bg-surface p-4">
          <div className="flex flex-wrap items-center gap-2 text-sm">
            <span className="font-medium">{notice.authorName}</span>
            <span className="text-muted">@{notice.authorHandle}</span>
            <Stamp iso={notice.createdAt} />
          </div>
          <p className="mt-3 text-base">{notice.text}</p>
          <p className="mt-3 text-xs text-muted">{notice.context}</p>
        </article>
        <div className="flex flex-wrap gap-2">
          {STYLES.map((item) => (
            <button
              key={item}
              type="button"
              onClick={() => setStyle(item)}
              className={cn(
                "min-h-11 rounded-lg px-3 text-sm",
                style === item ? "bg-accent text-accent-fg" : "bg-surface text-muted",
              )}
            >
              {LABELS[item]}
            </button>
          ))}
        </div>
        <label className="block">
          <span className="sr-only">Reply draft</span>
          <textarea
            value={text}
            disabled={locked}
            onChange={(event) => edit(event.target.value)}
            rows={5}
            placeholder="Generate a draft, then edit it. It stays unsent until you approve and confirm."
            className="w-full resize-y rounded-lg border border-line bg-surface px-3 py-3 text-sm text-fg outline-none"
          />
        </label>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className={cn("text-xs tabular-nums", text.length > 280 ? "text-accent" : "text-muted")}>
            {text.length}/280
            {draft ? ` · ${draft.status}` : " · no draft"}
            {draft?.source === "edited" ? " · edited" : ""}
          </p>
          <div className="flex flex-wrap gap-2">
            <Button type="button" variant="primary" disabled={busy || locked} onClick={() => void generate()}>
              {busy ? "Working" : draft ? "Regenerate" : "Generate"}
            </Button>
            <Button type="button" variant="outline" disabled={!text.trim()} onClick={() => void copy()}>
              Copy
            </Button>
            <Button
              type="button"
              variant="outline"
              disabled={!draft || locked}
              onClick={() => draft && useAgent.getState().setDraftStatus(draft.id, "approved")}
            >
              Approve
            </Button>
            <Button
              type="button"
              variant="ghost"
              disabled={!draft || locked}
              onClick={() => draft && useAgent.getState().setDraftStatus(draft.id, "rejected")}
            >
              Reject
            </Button>
            <Button
              type="button"
              variant="primary"
              disabled={!draft || draft.status !== "approved" || text.length === 0 || text.length > 280}
              onClick={() => setConfirm(true)}
            >
              Publish
            </Button>
          </div>
        </div>
        <p className="text-xs text-muted">
          Default voice is intelligent, natural, authoritative, and concise. Approval does not post. Autonomous
          replies stay off.
        </p>
      </div>
      <ConfirmDialog
        open={confirm}
        title="Publish this reply?"
        body={
          account.status === "live" && /^\d{5,}$/.test(notice.id)
            ? "This sends the approved text to X as a reply. You can still cancel."
            : "This only marks the draft published inside the workspace. It will not be sent to X."
        }
        confirmLabel="Publish reply"
        busy={busy}
        onOpenChange={setConfirm}
        onConfirm={() => void publish()}
      />
    </div>
  );
}
