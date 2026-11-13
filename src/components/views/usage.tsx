import * as Switch from "@radix-ui/react-switch";
import { Stamp } from "@/components/stamp";
import { Button } from "@/components/ui/button";
import { money } from "@/lib/format";
import { useAgent } from "@/lib/store";

export function UsageView() {
  const usage = useAgent((state) => state.usage);
  const prefs = useAgent((state) => state.prefs);
  const setPrefs = useAgent((state) => state.setPrefs);
  const resetSample = useAgent((state) => state.resetSample);
  const spend = usage.reduce((sum, event) => sum + event.usd, 0);
  const reads = usage.filter((event) => event.kind === "x_read").length;
  const writes = usage.filter((event) => event.kind === "x_write").length;
  const ai = usage.filter((event) => event.kind === "ai" && event.usd > 0).length;

  return (
    <div className="space-y-8">
      <p className="max-w-2xl text-sm text-muted">
        Estimates, not an invoice. Reads are cached for a minute, and requests stop when the limit is hit. The monitor
        cron does not post.
      </p>
      <dl className="grid grid-cols-2 gap-px overflow-hidden rounded-lg border border-line bg-line sm:grid-cols-4">
        {[
          ["Estimated", money(spend)],
          ["X reads", String(reads)],
          ["X writes", String(writes)],
          ["Model calls", String(ai)],
        ].map(([label, value]) => (
          <div key={label} className="bg-bg px-4 py-4">
            <dt className="text-xs text-muted">{label}</dt>
            <dd className="mt-1 text-2xl font-semibold tabular-nums">{value}</dd>
          </div>
        ))}
      </dl>
      <div className="grid gap-4 sm:grid-cols-2">
        <label className="block rounded-lg border border-line p-4">
          <span className="text-sm font-medium">Monthly limit</span>
          <input
            type="number"
            min={0}
            step={1}
            value={prefs.budgetUsd}
            onChange={(event) => setPrefs({ budgetUsd: Number(event.target.value) || 0 })}
            className="mt-3 w-full min-h-11 rounded-lg border border-line bg-surface px-3 text-sm tabular-nums"
          />
        </label>
        <div className="flex items-center justify-between gap-4 rounded-lg border border-line p-4">
          <div>
            <p className="text-sm font-medium">Stop at the limit</p>
            <p className="text-xs text-muted">Blocks sync, lists, generation, and publish estimates.</p>
          </div>
          <Switch.Root
            checked={prefs.hardStop}
            onCheckedChange={(hardStop) => setPrefs({ hardStop })}
            className="relative h-7 w-12 shrink-0 rounded-full bg-surface-2 data-[state=checked]:bg-accent"
            aria-label="Stop at the limit"
          >
            <Switch.Thumb className="block size-5 translate-x-1 rounded-full bg-fg transition-transform data-[state=checked]:translate-x-6" />
          </Switch.Root>
        </div>
      </div>
      <section>
        <h2 className="mb-2 text-sm font-medium">Still required for a live X connection</h2>
        <ul className="list-disc space-y-1 pl-5 text-sm text-muted">
          <li>An official X developer app with OAuth 2.0 PKCE and user-context scopes.</li>
          <li>Callback URL pointed at /api/x/callback, plus the encryption key for tokens.</li>
          <li>CRON_SECRET if you want the five-minute monitor. Hobby plans may only allow a daily schedule.</li>
          <li>Written X approval before any autonomous posting. This build cannot turn that on.</li>
        </ul>
      </section>
      <div className="flex flex-wrap gap-2">
        <Button type="button" variant="outline" onClick={() => resetSample()}>
          Reset sample workspace
        </Button>
      </div>
      <ul className="divide-y divide-line border-y border-line">
        {usage.length === 0 ? <li className="py-6 text-sm text-muted">No requests yet.</li> : null}
        {usage.map((event) => (
          <li key={event.id} className="flex items-start justify-between gap-4 py-3">
            <div>
              <p className="text-sm">{event.detail}</p>
              <p className="text-xs text-muted">
                {event.kind}
                {event.cached ? " · cached" : ""} · <Stamp iso={event.at} />
              </p>
            </div>
            <p className="text-sm tabular-nums">{money(event.usd)}</p>
          </li>
        ))}
      </ul>
    </div>
  );
}
