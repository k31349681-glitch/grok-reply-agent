import { useEffect, useState } from "react";
import { rel } from "@/lib/format";

export function useNow() {
  const [now, setNow] = useState<number | null>(null);
  useEffect(() => {
    setNow(Date.now());
    const id = setInterval(() => setNow(Date.now()), 30000);
    return () => clearInterval(id);
  }, []);
  return now;
}

export function Stamp({ iso }: { iso: string }) {
  const now = useNow();
  return (
    <time dateTime={iso} className="text-xs tabular-nums text-muted">
      {now ? rel(iso, now) : "Recent"}
    </time>
  );
}
