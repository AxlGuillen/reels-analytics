import { redirect } from "next/navigation";
import { Activity } from "lucide-react";
import { createServerSupabase } from "@/core/supabase/server";
import { LoginForm } from "./login-form";

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
    <main className="bg-page-glow flex min-h-dvh items-center justify-center px-4">
      <div className="animate-fade-up w-full max-w-sm">
        <div className="mb-8 flex flex-col items-center gap-4 text-center">
          <div className="from-primary/20 to-primary/5 ring-primary/20 shadow-card flex size-14 items-center justify-center rounded-2xl bg-gradient-to-br ring-1">
            <Activity className="text-primary size-7" />
          </div>
          <div>
            <h1 className="font-display text-xl tracking-wide">Reels Analytics</h1>
            <p className="text-muted-foreground mt-1 text-sm">
              Inicia sesión para ver tus métricas
            </p>
          </div>
        </div>

        <div className="bg-card shadow-lift ring-border/60 rounded-2xl p-6 ring-1 sm:p-7">
          <LoginForm />
        </div>

        <p className="text-muted-foreground/70 mt-6 text-center text-xs">
          TikTok · Instagram — métricas y crecimiento en un solo lugar
        </p>
      </div>
    </main>
  );
}
