import { skillMarkdown } from "@/modules/mcp/discovery";

export const runtime = "nodejs";

/** SKILL.md pública (Agent Skills Discovery): cómo usar el MCP del sitio. */
export function GET() {
  return new Response(skillMarkdown(), {
    headers: {
      "Content-Type": "text/markdown; charset=utf-8",
      "Access-Control-Allow-Origin": "*",
      "Cache-Control": "public, max-age=3600",
    },
  });
}
