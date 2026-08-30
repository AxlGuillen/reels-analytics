import { appUrl } from "@/modules/oauth/config";
import { skillDigest } from "@/modules/mcp/discovery";

export const runtime = "nodejs";

/**
 * Índice de Agent Skills Discovery (RFC v0.2.0 de Cloudflare). Una sola skill
 * pública: cómo usar el MCP del sitio. El sha256 se calcula sobre el mismo
 * módulo que sirve el SKILL.md, así que no puede desfasarse.
 */
export function GET() {
  const body = {
    $schema:
      "https://agentskills.io/schemas/agent-skills-discovery/v0.2.0/index.json",
    skills: [
      {
        name: "reels-analytics-mcp",
        type: "skill",
        description:
          "Consulta la analítica de TikTok/Instagram del creador vía el servidor MCP de reels-analytics (OAuth 2.1, solo lectura).",
        url: `${appUrl()}/.well-known/agent-skills/reels-analytics-mcp/SKILL.md`,
        sha256: skillDigest(),
      },
    ],
  };

  return new Response(JSON.stringify(body), {
    headers: {
      "Content-Type": "application/json",
      "Access-Control-Allow-Origin": "*",
      "Cache-Control": "public, max-age=3600",
    },
  });
}
