import { DesktopSidebar, MobileNav } from "@/components/dashboard/sidebar";
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
  const session = await getSession();
  const status = {
    tiktok: !!session && !isExpired(session),
    instagram: false,
  };

  return (
    <div className="flex min-h-dvh w-full">
      <DesktopSidebar status={status} />
      <div className="flex min-w-0 flex-1 flex-col">
        <MobileNav status={status} />
        <main className="flex-1">{children}</main>
      </div>
    </div>
  );
}
