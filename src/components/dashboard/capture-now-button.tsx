"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Check, CircleAlert, RefreshCw, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { captureAllAction } from "@/app/actions/capture";

const LABEL = "Capturar ahora";
const AUTO_DISMISS_MS = 6000;

type Tone = "ok" | "warn" | "error";
type Status = { tone: Tone; text: string };

/**
 * Dispara la ingesta de AMBAS plataformas a demanda, sin esperar al cron de las
 * 08:00 — el caso típico es un periodo recién empezado, que necesita una segunda
 * captura para tener deltas que mostrar. Al terminar hace `router.refresh()`:
 * la prueba de que funcionó es que la pantalla se repinta con datos nuevos.
 *
 * Vive en el rail (desktop) y en la barra superior (móvil), no dentro de una
 * página: es una acción global, como el tour o el tema. NO se condiciona al
 * estado de conexión del rail — ese refleja la sesión en cookie de TikTok,
 * mientras que la captura corre con los tokens persistidos en `ra_connections`.
 */
export function CaptureNowButton({
  variant = "rail",
  expanded = false,
}: {
  variant?: "rail" | "topbar";
  expanded?: boolean;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [status, setStatus] = useState<Status | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const clearTimer = () => {
    if (timer.current) clearTimeout(timer.current);
    timer.current = null;
  };
  useEffect(() => clearTimer, []);

  function run() {
    if (pending) return;
    clearTimer();
    setStatus(null);

    startTransition(async () => {
      const res = await captureAllAction();

      if (!res.ok) {
        // Los fallos se quedan hasta que se cierren: suelen pedir acción
        // (reconectar una cuenta), no son un aviso de paso.
        setStatus({ tone: "error", text: res.message });
        return;
      }

      const detail = `${res.snapshots} snapshots · ${res.videos} videos`;
      if (res.failures.length > 0) {
        const failed = res.failures.map((f) => f.platform).join(", ");
        setStatus({
          tone: "warn",
          text: `Guardado ${detail}, pero ${failed} falló: ${res.failures[0].message}`,
        });
      } else {
        setStatus({ tone: "ok", text: `Datos actualizados · ${detail}` });
        timer.current = setTimeout(() => setStatus(null), AUTO_DISMISS_MS);
      }
      router.refresh();
    });
  }

  const icon = (
    <RefreshCw
      className={cn(
        variant === "rail" ? "size-[17px]" : "size-[18px]",
        "shrink-0",
        pending && "animate-spin motion-reduce:animate-none",
      )}
      aria-hidden
    />
  );

  return (
    <>
      <button
        type="button"
        onClick={run}
        disabled={pending}
        aria-busy={pending}
        aria-label={LABEL}
        title={variant === "topbar" || !expanded ? LABEL : undefined}
        className={cn(
          "flex shrink-0 items-center transition-colors duration-150",
          // El atenuado da señal de "trabajando" también con reduced-motion,
          // donde el spinner no gira.
          pending && "opacity-60",
          variant === "rail"
            ? cn(
                "text-sidebar-foreground/40 hover:bg-sidebar-accent/60 hover:text-sidebar-foreground h-[38px] rounded-[14px]",
                expanded ? "w-full gap-3 px-2.5" : "w-[38px] justify-center",
              )
            : "text-muted-foreground hover:text-foreground size-9 justify-center rounded-full",
        )}
      >
        {icon}
        {variant === "rail" && expanded && (
          <span className="truncate text-[13px]">
            {pending ? "Capturando…" : LABEL}
          </span>
        )}
      </button>

      {/*
        El toast va con `text-foreground` explícito: es descendiente del rail,
        que pinta `text-sidebar-foreground` (crema, para fondo oscuro), y
        `position: fixed` NO rompe la herencia de color — sin eso el texto sale
        crema sobre card blanca (1.1:1, ilegible).
      */}
      {status && (
        <div
          role="status"
          aria-live="polite"
          className="bg-card text-foreground shadow-lift fixed right-5 bottom-5 z-50 flex max-w-[min(360px,calc(100vw-2.5rem))] items-start gap-2.5 rounded-[18px] py-3 pr-2.5 pl-3.5"
        >
          {status.tone === "ok" ? (
            // El lima como TEXTO no cumple AA sobre la card; como icono sí
            // (umbral 3:1 de elementos no textuales).
            <Check className="text-success mt-px size-4 shrink-0" aria-hidden />
          ) : (
            <CircleAlert
              className="text-destructive mt-px size-4 shrink-0"
              aria-hidden
            />
          )}
          <p className="flex-1 text-[12.5px] leading-[1.45]">{status.text}</p>
          <button
            type="button"
            onClick={() => {
              clearTimer();
              setStatus(null);
            }}
            aria-label="Cerrar aviso"
            className="text-muted-foreground hover:text-foreground -mt-0.5 shrink-0 p-1"
          >
            <X className="size-3.5" />
          </button>
        </div>
      )}
    </>
  );
}
