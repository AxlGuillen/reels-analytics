import type { Metadata } from "next";

/**
 * Grupo (marketing): páginas públicas sin el rail del dashboard. Comparte el
 * root layout (fuentes + ThemeProvider) pero pinta su propio lienzo. El proxy
 * deja pasar `/landing` sin sesión.
 */

const MARKETING_TITLE =
  "Reels Analytics — Mide lo que publicas. Entiende lo que crece.";
const MARKETING_DESCRIPTION =
  "Snapshots diarios de tus videos de TikTok e Instagram Reels: curvas de crecimiento por video, benchmark contra su semana y un digest cada lunes.";

export const metadata: Metadata = {
  // `absolute` esquiva el template "%s · Reels Analytics" del root: este título
  // ya lleva la marca.
  title: { absolute: MARKETING_TITLE },
  description: MARKETING_DESCRIPTION,
  alternates: { canonical: "/landing" },
  openGraph: {
    type: "website",
    url: "/landing",
    siteName: "Reels Analytics",
    title: MARKETING_TITLE,
    description: MARKETING_DESCRIPTION,
    locale: "es_MX",
  },
  twitter: {
    card: "summary",
    title: MARKETING_TITLE,
    description: MARKETING_DESCRIPTION,
  },
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
