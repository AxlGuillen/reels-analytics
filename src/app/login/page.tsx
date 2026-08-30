import Link from "next/link";
import { redirect } from "next/navigation";
import { Sparkle } from "lucide-react";
import { BrandGlyph } from "@/components/brand-mark";
import { createServerSupabase } from "@/core/supabase/server";
import { LoginForm } from "./login-form";

/** Argumentos de venta del panel oscuro (numerados, en mono lima). */
const FEATURES = [
  "Snapshots históricos: crecimiento medido en el tiempo.",
  "Mejor día, engagement y tipos de contenido.",
  "Detalle por video con su curva de crecimiento.",
];

/** Alturas (%) del mini-chart decorativo; el índice 3 va en lima. */
const BARS = [38, 60, 48, 88, 68, 96, 74];

/**
 * Pantalla de login (fuera del grupo `(dashboard)`, sin rail). Si ya hay
 * sesión, salta directo al dashboard. La verificación real de acceso vive en el
 * proxy; esto evita mostrar el form a quien ya entró.
 */
export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string }>;
}) {
  const { next } = await searchParams;
  // Solo rutas internas (el `next` viene de la URL: no es confiable).
  const safeNext = next?.startsWith("/") && !next.startsWith("//") ? next : "/";

  const supabase = await createServerSupabase();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (user) redirect(safeNext);

  return (
    <main className="bg-grain flex min-h-dvh items-center justify-center p-4 md:p-8">
      {/* Panel bento flotante: oscuro (relato) + claro (formulario). */}
      <div className="animate-fade-up shadow-lift grid w-full max-w-4xl overflow-hidden rounded-[26px] lg:grid-cols-[0.95fr_1.05fr]">
        <aside className="bg-foreground text-background relative hidden flex-col justify-between p-10 lg:flex">
          <div className="bg-halftone pointer-events-none absolute inset-0" />

          <Link
            href="/landing"
            className="relative flex w-fit items-center gap-2.5"
          >
            <span className="group bg-primary text-primary-foreground flex size-9 items-center justify-center rounded-[14px]">
              <BrandGlyph className="size-[19px]" />
            </span>
            <span className="text-[13px] font-medium tracking-[-0.01em]">
              Reels Analytics
            </span>
          </Link>

          <div className="relative">
            <h2 className="max-w-[15ch] text-[2.1rem] leading-[1.12] font-medium tracking-[-0.025em]">
              Mide lo que publicas.{" "}
              <span className="bg-primary text-primary-foreground inline-flex items-center gap-1.5 rounded-full px-3 pt-0.5 pb-1">
                <Sparkle className="size-4" />
                Entiende
              </span>{" "}
              lo que crece.
            </h2>

            <ol className="mt-8 flex flex-col gap-3.5">
              {FEATURES.map((feature, i) => (
                <li key={feature} className="flex gap-3.5">
                  {/* El panel se invierte a crema en oscuro: el lima como texto
                      dejaría de leerse, así que ahí el número pasa a tinta. */}
                  <span className="text-primary dark:text-primary-foreground font-mono text-[11px] leading-5">
                    {String(i + 1).padStart(2, "0")}
                  </span>
                  <span className="text-background/70 text-[13px] leading-5">
                    {feature}
                  </span>
                </li>
              ))}
            </ol>
          </div>

          {/* Mini-chart: cápsulas, como las del dashboard. */}
          <div className="relative flex h-11 items-end gap-1.5" aria-hidden>
            {BARS.map((h, i) => (
              <div
                key={i}
                className={
                  i === 3
                    ? "bg-primary dark:bg-background w-3.5 rounded-full"
                    : "bg-background/15 w-3.5 rounded-full"
                }
                style={{ height: `${h}%` }}
              />
            ))}
          </div>
        </aside>

        <div className="bg-card flex flex-col justify-center p-8 sm:p-12">
          <div className="mx-auto w-full max-w-sm">
            <h1 className="text-[1.6rem] font-medium tracking-[-0.025em]">
              Inicia sesión
            </h1>
            <p className="text-muted-foreground mt-1.5 mb-7 text-sm">
              Accede a tu panel de analíticas.
            </p>

            <LoginForm next={safeNext} />

            <p className="text-muted-foreground/70 mt-7 text-center font-mono text-[10.5px] tracking-[0.04em]">
              TIKTOK · INSTAGRAM
            </p>
            <Link
              href="/landing"
              className="text-muted-foreground hover:text-foreground mt-4 block text-center text-xs transition-colors"
            >
              ← Volver a la landing
            </Link>
          </div>
        </div>
      </div>
    </main>
  );
}
