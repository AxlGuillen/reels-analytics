import crypto from "node:crypto";
import { appUrl, resourceUrl, SCOPE } from "@/core/config/app";
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

/** El mismo resumen en inglés (landing.md?lang=en y el MCP público). */
export const PRODUCT_SUMMARY_EN =
  "Reels Analytics centralizes a creator's TikTok and Instagram Reels metrics: it stores one daily snapshot per video and turns that history into decisions (which format performs, best day and hour, growth curves, weekly-cohort benchmarks).";

/** Pasos de conexión al MCP, en texto plano reutilizable. OJO: la variante
 *  `es` alimenta `skillMarkdown()` (y su sha256 publicado): no cambiarla a la ligera. */
export function mcpConnectionInfo(lang: "es" | "en" = "es"): string {
  if (lang === "en") {
    return [
      `MCP server (Streamable HTTP): ${resourceUrl()}`,
      "Authentication: OAuth 2.1 with PKCE S256 and dynamic client registration (RFC 7591) — paste the URL into a Claude/Cowork remote connector and the flow is automatic.",
      `Scope: ${SCOPE} (read-only).`,
      `Discovery: ${appUrl()}/.well-known/oauth-protected-resource`,
      `Agent registration guide: ${appUrl()}/auth.md`,
      `Public informational MCP (no auth): ${appUrl()}/api/public/mcp`,
    ].join("\n");
  }
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
