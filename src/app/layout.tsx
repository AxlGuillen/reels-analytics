import type { Metadata } from "next";
import { Chakra_Petch, Russo_One } from "next/font/google";
import "./globals.css";

// UI y números: técnica, legible en datos. Marca/titulares: impacto gaming.
const chakraPetch = Chakra_Petch({
  variable: "--font-sans",
  weight: ["300", "400", "500", "600", "700"],
  subsets: ["latin"],
});

const russoOne = Russo_One({
  variable: "--font-display",
  weight: "400",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Reels Analytics",
  description:
    "Centraliza y analiza el rendimiento de tus videos de TikTok e Instagram.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`dark ${chakraPetch.variable} ${russoOne.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
