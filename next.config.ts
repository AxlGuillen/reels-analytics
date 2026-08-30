import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    // El CSS global (~17 KiB) era el único request que bloqueaba el primer
    // render (PageSpeed: 300 ms). Inline en el HTML: un roundtrip menos.
    inlineCss: true,
  },
  async headers() {
    return [
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
