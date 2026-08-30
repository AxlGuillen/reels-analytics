import type { Metadata, Viewport } from "next";
import { Space_Grotesk, JetBrains_Mono } from "next/font/google";
import "./globals.css";
import { env } from "@/core/config/env";
import { ThemeProvider } from "@/components/theme-provider";

// Grotesca geométrica: toda la UI y los números protagonistas ("Acid Grid").
const spaceGrotesk = Space_Grotesk({
  variable: "--font-sans",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

// Mono para etiquetas técnicas y cifras tabulares (unidades, %, tokens).
const jetbrainsMono = JetBrains_Mono({
  variable: "--font-mono",
  subsets: ["latin"],
  weight: ["400", "500", "700"],
});

export const metadata: Metadata = {
  // Base para URLs relativas de OG/canonical. `APP_URL` es la fuente de verdad
  // del origen (igual que en OAuth); el fallback cubre el build local.
  metadataBase: new URL(env("APP_URL") ?? "http://localhost:3000"),
  title: {
    default: "Reels Analytics",
    // Las páginas que definan `title` heredan la marca sin repetirla a mano.
    template: "%s · Reels Analytics",
  },
  description:
    "Centraliza y analiza el rendimiento de tus videos de TikTok e Instagram.",
  applicationName: "Reels Analytics",
  // El favicon (src/app/icon.svg) lo inyecta Next por convención de archivo.
};

/** Color de la barra del navegador acorde al tema activo. */
export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#f1f1ee" },
    { media: "(prefers-color-scheme: dark)", color: "#111211" },
  ],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="es"
      suppressHydrationWarning
      className={`${spaceGrotesk.variable} ${jetbrainsMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        {/* Solo claro/oscuro (sin "system"): el toggle del rail alterna entre
            los dos y un valor "system" heredado cae al default en el primer clic. */}
        <ThemeProvider
          attribute="class"
          defaultTheme="light"
          enableSystem={false}
          disableTransitionOnChange
        >
          {children}
        </ThemeProvider>
      </body>
    </html>
  );
}
