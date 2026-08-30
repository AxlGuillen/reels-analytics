import { skillMarkdown } from "@/modules/mcp/discovery";
import { agentText } from "@/core/lib/agent-response";

export const runtime = "nodejs";

/** SKILL.md pública (Agent Skills Discovery): cómo usar el MCP del sitio. */
export function GET() {
  return agentText(skillMarkdown());
}
