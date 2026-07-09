import { redirect } from "next/navigation";
import { DesktopSidebar, MobileNav } from "@/components/dashboard/sidebar";
import { env } from "@/core/config/env";
import { createServerSupabase } from "@/core/supabase/server";
import { getSession, isExpired } from "@/modules/tiktok/session";

/**
 * Shell del dashboard: sidebar persistente (desktop) / drawer (móvil) + área de
 * contenido. Calcula el estado de conexión por plataforma para los puntos del nav.
 */
export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // Defensa en profundidad: el middleware ya bloquea, pero verificamos también
  // aquí por si el matcher se desconfigura.
  const supabase = await createServerSupabase();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const session = await getSession();
  const status = {
    tiktok: !!session && !isExpired(session),
    instagram: !!env("INSTAGRAM_ACCESS_TOKEN"),
  };

  const email = user.email ?? "";
  const fullName =
    (user.user_metadata?.full_name as string | undefined) ??
    (user.user_metadata?.name as string | undefined) ??
    "";
  const name = fullName || email.split("@")[0] || "Cuenta";
  const initials =
    name
      .split(/\s+/)
      .map((w) => w[0])
      .slice(0, 2)
      .join("")
      .toUpperCase() || "?";
  const userInfo = { name, email, initials };

  return (
    <div className="flex min-h-dvh w-full">
      <DesktopSidebar status={status} user={userInfo} />
      <div className="flex min-w-0 flex-1 flex-col">
        <MobileNav status={status} user={userInfo} />
        <main className="bg-dots flex-1">{children}</main>
      </div>
    </div>
  );
}
