"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { Platform } from "@/core/domain";
import { captureSnapshotAction } from "@/app/actions/capture";

/**
 * Botón "Capturar snapshot": dispara el server action de ingesta y muestra el
 * resultado (cuántos videos y snapshots se guardaron).
 */
export function CaptureButton({ platform }: { platform: Platform }) {
  const [pending, startTransition] = useTransition();
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);

  function run() {
    setMsg(null);
    startTransition(async () => {
      const res = await captureSnapshotAction(platform);
      setMsg(
        res.ok
          ? {
              ok: true,
              text: `Guardado · ${res.result.videos} videos · ${res.result.snapshots} snapshots`,
            }
          : { ok: false, text: res.message },
      );
    });
  }

  return (
    <div className="flex flex-col items-end gap-1">
      <Button variant="outline" onClick={run} disabled={pending}>
        {pending ? "Guardando…" : "Capturar snapshot"}
      </Button>
      {msg && (
        <p className={cn("text-xs", msg.ok ? "text-green-400" : "text-red-400")}>
          {msg.text}
        </p>
      )}
    </div>
  );
}
