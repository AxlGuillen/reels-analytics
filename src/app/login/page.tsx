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
    <main className="flex min-h-dvh items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <div className="mb-8 flex flex-col items-center gap-3 text-center">
          <div className="bg-primary/15 flex size-12 items-center justify-center rounded-xl">
            <Activity className="text-primary size-6" />
          </div>
          <div>
            <h1 className="font-display text-lg tracking-wide">Reels Analytics</h1>
            <p className="text-muted-foreground mt-1 text-sm">
              Inicia sesión para ver tus métricas
            </p>
          </div>
        </div>

        <div className="bg-card rounded-xl border p-6">
          <LoginForm />
        </div>
      </div>
    </main>
  );
}
