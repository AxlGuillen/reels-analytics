import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    // El CSS global (~17 KiB) era el único request que bloqueaba el primer
    // render (PageSpeed: 300 ms). Inline en el HTML: un roundtrip menos.
    inlineCss: true,
  },
  async headers() {
    return [
      // Hardening global: el proyecto es público en redes, así que el
      // perímetro conviene endurecido. Sin CSP completa a propósito (con Next
      // exigiría nonces en cada inline; el costo/beneficio no da hoy).
      {
        source: "/(.*)",
        headers: [
          // El navegador no debe adivinar content-types (sniffing).
          { key: "X-Content-Type-Options", value: "nosniff" },
          // Nadie puede meternos en un iframe (clickjacking; obligatorio para
          // la pantalla de consentimiento OAuth).
          { key: "X-Frame-Options", value: "DENY" },
          // Al salir hacia otros orígenes solo viaja el origen, no el path.
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          // Capacidades del navegador que esta app jamás usa.
          {
            key: "Permissions-Policy",
            value: "camera=(), microphone=(), geolocation=(), payment=()",
          },
        ],
      },
      // Descubrimiento para agentes (RFC 8288) en las entradas públicas.
      ...["/", "/landing", "/en/landing"].map((source) => ({
        source,
        headers: [
          {
            key: "Link",
            value:
              '</.well-known/api-catalog>; rel="api-catalog", </landing.md>; rel="alternate"; type="text/markdown"',
          },
        ],
      })),
    ];
  },
  async rewrites() {
    return {
      beforeFiles: [
        // "Markdown for Agents": /landing negocia a markdown por Accept.
        {
          source: "/landing",
          has: [{ type: "header", key: "accept", value: ".*text/markdown.*" }],
          destination: "/landing.md",
        },
        {
          source: "/en/landing",
          has: [{ type: "header", key: "accept", value: ".*text/markdown.*" }],
          destination: "/landing.md?lang=en",
        },
      ],
      afterFiles: [],
      fallback: [],
    };
  },
};

export default nextConfig;
