"use client";

import { useEffect } from "react";

/**
 * WebMCP (webmachinelearning.github.io/webmcp, API experimental): expone
 * acciones simples de la landing a agentes que corren en el navegador vía
 * `navigator.modelContext.provideContext()`. Feature-detect estricto: en
 * navegadores sin la API es un no-op silencioso. No usa GSAP ni toca el DOM
 * fuera de sus tools.
 */

interface WebMcpTool {
  name: string;
  description: string;
  inputSchema: Record<string, unknown>;
  execute: (args: Record<string, unknown>) => Promise<{ content: string }>;
}

interface ModelContext {
  provideContext: (context: { tools: WebMcpTool[] }) => void;
}

const SECTIONS = ["producto", "como-funciona", "mcp"] as const;

function buildTools(): WebMcpTool[] {
  return [
    {
      name: "open_section",
      description:
        "Desplaza la página a una sección de la landing: producto, como-funciona o mcp.",
      inputSchema: {
        type: "object",
        properties: {
          section: { type: "string", enum: [...SECTIONS] },
        },
        required: ["section"],
      },
      async execute(args) {
        const section = String(args.section ?? "");
        const el = document.getElementById(section);
        if (!el) return { content: `Sección desconocida: ${section}` };
        el.scrollIntoView({ block: "start" });
        return { content: `Mostrando la sección ${section}.` };
      },
    },
    {
      name: "get_product_summary",
      description: "Resumen de qué es Reels Analytics y qué ofrece.",
      inputSchema: { type: "object", properties: {} },
      async execute() {
        // Reusa la versión markdown curada de la landing.
        const res = await fetch("/landing.md");
        return { content: await res.text() };
      },
    },
    {
      name: "get_mcp_connection_info",
      description:
        "Cómo conectar el servidor MCP del sitio (URL, OAuth y guía para agentes).",
      inputSchema: { type: "object", properties: {} },
      async execute() {
        return {
          content: [
            `Servidor MCP: ${location.origin}/api/mcp`,
            "Conexión: pega esa URL en un conector remoto MCP (Claude/Cowork); OAuth 2.1 con registro dinámico hace el resto.",
            `Guía completa: ${location.origin}/auth.md`,
          ].join("\n"),
        };
      },
    },
  ];
}

export function WebMcp() {
  useEffect(() => {
    const modelContext = (
      navigator as Navigator & { modelContext?: ModelContext }
    ).modelContext;
    if (!modelContext?.provideContext) return;
    try {
      modelContext.provideContext({ tools: buildTools() });
    } catch {
      // API experimental: si el shape cambió, mejor sin tools que romper la landing.
    }
  }, []);

  return null;
}
