import type { Metadata } from "next";

/**
 * Grupo (marketing): páginas públicas sin el rail del dashboard. Comparte el
 * root layout (fuentes + ThemeProvider) pero pinta su propio lienzo. El proxy
 * deja pasar `/landing` sin sesión.
 */

export const metadata: Metadata = {
  title: "Reels Analytics — Mide lo que publicas. Entiende lo que crece.",
  description:
    "Snapshots diarios de tus videos de TikTok e Instagram Reels: curvas de crecimiento por video, benchmark contra su semana y un digest cada lunes.",
};

export default function MarketingLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    // overflow-x-clip: la banda full-bleed usa un breakout w-screen y sin esto
    // aparecería una scrollbar horizontal.
    <div className="bg-background bg-grain text-foreground min-h-dvh flex-1 overflow-x-clip">
      {children}
    </div>
  );
}
