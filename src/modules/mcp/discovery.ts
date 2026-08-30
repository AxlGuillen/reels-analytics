import crypto from "node:crypto";
import { appUrl, resourceUrl, SCOPE } from "@/modules/oauth/config";
import { MCP_TOOLS } from "./catalog";

/**
 * Contenido compartido de los endpoints de descubrimiento para agentes
 * (agent-skills, WebMCP, landing.md, auth.md). Vive en un solo lugar para que
 * el índice de skills y el SKILL.md publiquen exactamente la misma cadena (el
 * sha256 del índice se calcula sobre esto) y para que el resumen del producto
 * no se cuente distinto en cada endpoint.
 */

/** Resumen del producto en una frase (lo usan WebMCP y los catálogos). */
export const PRODUCT_SUMMARY =
  "Reels Analytics centraliza las métricas de TikTok e Instagram Reels de un creador: guarda un snapshot diario por video y convierte esa historia en decisiones (qué formato rinde, mejor día y hora, curvas de crecimiento, benchmark por cohorte semanal).";

/** Pasos de conexión al MCP, en texto plano reutilizable. */
export function mcpConnectionInfo(): string {
  return [
    `Servidor MCP (Streamable HTTP): ${resourceUrl()}`,
    "Autenticación: OAuth 2.1 con PKCE S256 y registro dinámico (RFC 7591) — pega la URL en un conector remoto de Claude/Cowork y el flujo es automático.",
    `Scope: ${SCOPE} (solo lectura).`,
    `Descubrimiento: ${appUrl()}/.well-known/oauth-protected-resource`,
    `Guía de registro para agentes: ${appUrl()}/auth.md`,
  ].join("\n");
}

/** SKILL.md pública: cómo usar el MCP del sitio. */
export function skillMarkdown(): string {
  const tools = MCP_TOOLS.map(
    (tool) => `- \`${tool.name}\` — ${tool.title}: ${tool.description}`,
  ).join("\n");

  return `---
name: reels-analytics-mcp
description: Consulta la analítica de TikTok/Instagram del creador vía el servidor MCP de reels-analytics (solo lectura).
---

# Usar el MCP de Reels Analytics

${PRODUCT_SUMMARY}

## Conexión

${mcpConnectionInfo()}

## Tools disponibles

${tools}

## Ejemplos de preguntas

- "¿Cuál fue mi mejor video de la última semana?"
- "Compara TikTok contra Instagram en los últimos 30 días."
- "¿Qué videos están despegando ahora mismo?"
- "Dame el bloque de stats del guion 'X' para Obsidian."
`;
}

/** Digest sha256 (hex) del SKILL.md — el índice y el archivo nunca se desfasan. */
export function skillDigest(): string {
  return crypto.createHash("sha256").update(skillMarkdown()).digest("hex");
}
