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
      if (!res.ok) {
        setMsg({ ok: false, text: res.message });
        return;
      }
      // Con varias cuentas puede guardar una y fallar otra: se dice cuál.
      const failed = res.failures.map((f) => `${f.label}: ${f.message}`);
      setMsg({
        ok: failed.length === 0,
        text:
          `Guardado · ${res.videos} videos · ${res.snapshots} snapshots` +
          (failed.length ? ` — falló ${failed.join(" · ")}` : ""),
      });
    });
  }

  return (
    <div className="flex flex-col items-end gap-1">
      <Button variant="outline" onClick={run} disabled={pending}>
        {pending ? "Guardando…" : "Capturar snapshot"}
      </Button>
      {msg && (
        <p className={cn("text-xs", msg.ok ? "text-success" : "text-destructive")}>
          {msg.text}
        </p>
      )}
    </div>
  );
}
