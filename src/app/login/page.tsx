import { redirect } from "next/navigation";
import { createServerSupabase } from "@/core/supabase/server";
import { LoginForm } from "./login-form";

/** Argumentos de venta del panel izquierdo (numerados, estilo "libro de cuentas"). */
const FEATURES = [
  "Snapshots históricos: crecimiento medido en el tiempo.",
  "Mejor día y hora, engagement y top hashtags.",
  "Detalle por video con su curva de crecimiento.",
];

/** Alturas de las barras del mini-chart decorativo del panel izquierdo. */
const BARS = [38, 60, 48, 88, 68, 96, 74];

/**
 * Pantalla de login (fuera del grupo `(dashboard)`, sin sidebar). Si ya hay
 * sesión, salta directo al dashboard. La verificación real de acceso vive en el
 * middleware; esto evita mostrar el form a quien ya entró.
 */
export default async function LoginPage() {
  const supabase = await createServerSupabase();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (user) redirect("/");

  return (
    <main className="grid min-h-dvh grid-cols-1 lg:grid-cols-[0.95fr_1.05fr]">
      {/* Panel editorial (oculto en móvil) */}
      <aside className="bg-foreground text-background relative hidden flex-col justify-between overflow-hidden p-12 lg:flex xl:p-14">
        <div
          className="pointer-events-none absolute inset-0 opacity-60"
          style={{
            backgroundImage:
              "radial-gradient(circle, rgb(246 243 236 / 0.06) 1px, transparent 1px)",
            backgroundSize: "22px 22px",
          }}
          aria-hidden
        />
        <div className="border-background/15 text-background/50 relative border-b pb-4 text-[11px] font-semibold tracking-[0.22em] uppercase">
          Reels Analytics
        </div>

        <div className="relative">
          <h2 className="font-display max-w-[16ch] text-[2.4rem] leading-[1.14] font-semibold tracking-tight text-balance">
            Mide lo que publicas. Entiende lo que crece.
          </h2>
          <ol className="mt-8 flex flex-col">
            {FEATURES.map((feature, i) => (
              <li
                key={feature}
                className="border-background/15 flex gap-4 border-t py-3.5 last:border-b"
              >
                <span className="text-primary font-mono text-xs">
                  {String(i + 1).padStart(2, "0")}
                </span>
                <span className="text-background/80 text-sm leading-snug">
                  {feature}
                </span>
              </li>
            ))}
          </ol>
        </div>

        <div className="relative flex h-11 items-end gap-1.5" aria-hidden>
          {BARS.map((h, i) => (
            <div
              key={i}
              className={i === 3 ? "bg-primary w-3.5" : "bg-background/15 w-3.5"}
              style={{ height: `${h}%` }}
            />
          ))}
        </div>
      </aside>

      {/* Panel del formulario */}
      <div className="bg-page-glow flex flex-col justify-center px-6 py-16 sm:px-12 lg:px-16">
        <div className="animate-fade-up mx-auto w-full max-w-sm">
          <div className="bg-primary mb-5 h-0.5 w-10 rounded-full" />
          <h1 className="font-display text-[1.7rem] font-semibold tracking-tight">
            Inicia sesión
          </h1>
          <p className="text-muted-foreground mt-1.5 mb-8 text-sm">
            Accede a tu panel de analíticas.
          </p>

          <LoginForm />

          <p className="text-muted-foreground/70 mt-7 text-center text-[11px] tracking-[0.04em] uppercase">
            TikTok · Instagram — métricas y crecimiento en un solo lugar
          </p>
        </div>
      </div>
    </main>
  );
}
