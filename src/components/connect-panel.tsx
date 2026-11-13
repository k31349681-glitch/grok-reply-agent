import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { useAgent } from "@/lib/store";

export function ConnectXButton({
  onMissing,
  className,
}: {
  onMissing?: (missing: string[]) => void;
  className?: string;
}) {
  const [checking, setChecking] = useState(false);

  async function connectLive() {
    setChecking(true);
    try {
      const res = await fetch("/api/x/auth?check=1");
      const data = (await res.json()) as { configured?: boolean; missing?: string[] };
      if (!data.configured) {
        const missing = data.missing ?? ["X credentials"];
        if (onMissing) onMissing(missing);
        else toast.error(`X connection is not configured: ${missing.join(", ")}`);
        return;
      }
      window.location.href = "/api/x/auth";
    } catch {
      toast.error("Could not reach the X connection service.");
    } finally {
      setChecking(false);
    }
  }

  return (
    <Button type="button" variant="primary" className={className} disabled={checking} onClick={() => void connectLive()}>
      {checking ? "Checking" : "Connect X"}
    </Button>
  );
}

export function ConnectPanel({ compact = false }: { compact?: boolean }) {
  const connectSample = useAgent((state) => state.connectSample);
  const [missing, setMissing] = useState<string[] | null>(null);

  return (
    <div className={compact ? "space-y-3" : "space-y-4 rounded-lg border border-line bg-surface p-5"}>
      {!compact ? (
        <div>
          <h2 className="text-lg font-semibold tracking-tight">Connect X</h2>
          <p className="mt-1 text-sm text-muted">
            Official OAuth 2.0 with PKCE. Tokens stay encrypted on the server. Replies never post until you confirm
            each one.
          </p>
        </div>
      ) : null}
      <div className="flex flex-wrap gap-2">
        <ConnectXButton onMissing={setMissing} />
        <Button type="button" variant="outline" onClick={() => connectSample()}>
          Use sample workspace
        </Button>
      </div>
      {missing ? (
        <p className="text-sm text-muted">
          Live connection is waiting on {missing.join(", ")}. The sample workspace lets you rehearse every step
          without calling X.
        </p>
      ) : null}
    </div>
  );
}
