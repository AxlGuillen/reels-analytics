/**
 * Grupo (marketing): páginas públicas sin el rail del dashboard. Comparte el
 * root layout (fuentes + ThemeProvider) pero pinta su propio lienzo. El proxy
 * deja pasar `/landing` y `/en/landing` sin sesión.
 *
 * La metadata vive en cada `page.tsx` (via `landingMetadata`): cambia por
 * idioma (título, descripción, `og:locale`, canonical, hreflang).
 */
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
