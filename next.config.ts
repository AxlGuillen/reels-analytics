import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  async headers() {
    return [
      // Descubrimiento para agentes (RFC 8288) en las dos entradas públicas.
      ...["/", "/landing"].map((source) => ({
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
      ],
      afterFiles: [],
      fallback: [],
    };
  },
};

export default nextConfig;
