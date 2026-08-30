import type { Metadata } from "next";

/**
 * Copy de la landing en ambos idiomas. La landing vive dos veces (`/landing` en
 * español, `/en/landing` en inglés) pero el markup es UNO (`landing-page.tsx`);
 * aquí están todas las cadenas visibles, tipadas para que un idioma no pueda
 * quedarse sin una clave que el otro sí tiene.
 *
 * Regla editorial (CLAUDE.md): al tocar copy de la landing se tocan LOS DOS
 * idiomas y la versión markdown (`/landing.md`). Los números de muestra van
 * formateados por locale (coma/punto decimal, separador de miles).
 */

export type Lang = "es" | "en";

export interface LandingCopy {
  meta: {
    title: string;
    description: string;
    /** Ruta pública de esta variante (canonical / OG url). */
    path: string;
    ogLocale: string;
  };
  nav: { product: string; how: string; mcp: string; code: string; start: string };
  hero: {
    kicker: string;
    /** El H1 se parte en tres: texto — píldora de acento — texto. */
    h1a: string;
    h1accent: string;
    h1b: string;
    sub: string;
  };
  collage: { snapshotLabel: string; snapshotMeta: string };
  bento: {
    viewsTitle: string;
    viewsValue: string;
    viewsUnit: string;
    /** Etiquetas Lun→Dom de la gráfica de cápsulas (7). */
    weekDays: readonly [string, string, string, string, string, string, string];
    weekLeader: string;
    followersTitle: string;
    followersValue: string;
    followersMeta: string;
    followersNote: string;
    bestLabel: string;
    bestTitle: string;
    bestViews: string;
    chartTitle: string;
    sectionsTitle: string;
    /** Etiquetas de las barras horizontales (4, mismo orden que las anchuras). */
    sectionLabels: readonly [string, string, string, string];
    sectionsNote: string;
  };
  band: {
    kicker: string;
    title: string;
    body: string;
    ago14: string;
    ago14Views: string;
    ago7: string;
    ago7Views: string;
    today: string;
    todayViews: string;
  };
  steps: {
    title: string;
    items: readonly [
      { title: string; body: string },
      { title: string; body: string },
      { title: string; body: string },
    ];
  };
  features: {
    items: readonly [
      { title: string; body: string },
      { title: string; body: string },
      { title: string; body: string },
      { title: string; body: string },
    ];
  };
  closing: { title: string; mono: string };
  footer: { product: string; how: string; mcp: string; github: string; rights: string };
}

const es: LandingCopy = {
  meta: {
    title: "Reels Analytics — Mide lo que publicas. Entiende lo que crece.",
    description:
      "Snapshots diarios de tus videos de TikTok e Instagram Reels: curvas de crecimiento por video, benchmark contra su semana y un digest cada lunes.",
    path: "/landing",
    ogLocale: "es_MX",
  },
  nav: {
    product: "Producto",
    how: "Cómo funciona",
    mcp: "MCP",
    code: "Ver el código",
    start: "Empieza a medir",
  },
  hero: {
    kicker: "TIKTOK · INSTAGRAM — SNAPSHOTS DIARIOS DESDE EL DÍA CERO",
    h1a: "Mide lo que publicas.",
    h1accent: "Entiende",
    h1b: "lo que crece.",
    sub: "Las APIs de TikTok e Instagram solo devuelven el presente. Reels Analytics guarda un snapshot diario de cada video y convierte esa historia en decisiones: qué formato rinde, qué día despegó y contra qué compararte.",
  },
  collage: {
    snapshotLabel: "SNAPSHOT DIARIO",
    snapshotMeta: "captura #417 · 2 plataformas",
  },
  bento: {
    viewsTitle: "Vistas de la semana",
    viewsValue: "683,5",
    viewsUnit: "mil · 57% TT",
    weekDays: ["Lun", "Mar", "Mié", "Jue", "Vie", "Sáb", "Dom"],
    weekLeader: "160,8 mil",
    followersTitle: "Seguidores nuevos",
    followersValue: "+1.951",
    followersMeta: "en 7 días",
    followersNote:
      "Cada delta se atribuye al día en que ocurrió, no al día en que el cron lo capturó.",
    bestLabel: "MEJOR VIDEO",
    bestTitle: "Día 5 del SoloQ Challenge y todos estancados",
    bestViews: "92,4 mil vistas",
    chartTitle: "La curva que las APIs no te dan",
    sectionsTitle: "Secciones por hashtag",
    sectionLabels: ["Narración", "SoloQ", "Noticias", "Audio viral"],
    sectionsNote:
      "Etiqueta con un hashtag y cada sección se mide sola — sin migraciones, sin hojas de cálculo.",
  },
  band: {
    kicker: "PROFUNDIDAD",
    title: "Cada día, una capa más de historia.",
    body: "Los snapshots se apilan en silencio, hoy encima de ayer. Cuando necesitas la curva de un video, ya lleva semanas escribiéndose.",
    ago14: "HACE 14 DÍAS",
    ago14Views: "1.220 vistas",
    ago7: "HACE 7 DÍAS",
    ago7Views: "8.427 vistas",
    today: "HOY",
    todayViews: "92.453 vistas",
  },
  steps: {
    title: "Tres pasos, cero mantenimiento",
    items: [
      {
        title: "Conecta tus cuentas",
        body: "OAuth con TikTok e Instagram. Los tokens se refrescan solos antes de usarse.",
      },
      {
        title: "El cron captura a diario",
        body: "Un snapshot por video cada 24 h. La historia se acumula aunque no abras el panel.",
      },
      {
        title: "Decide con evidencia",
        body: "Curvas por video, benchmark contra su semana y un digest cada lunes por Telegram.",
      },
    ],
  },
  features: {
    items: [
      {
        title: "Curva por video",
        body: "Vistas a los 7 días, velocidad inicial y el momento exacto del despegue.",
      },
      {
        title: "Cohorte semanal",
        body: "Cada video se compara contra los de su misma semana — el crecimiento de audiencia no infla el veredicto.",
      },
      {
        title: "Digest por Telegram",
        body: "Cada lunes: vistas, seguidores, secciones y mejor video. Además vigila que la ingesta no se caiga.",
      },
      {
        title: "Habla con tus datos",
        body: "Servidor MCP con 9 tools de solo lectura: pregúntale a Claude por tu analítica desde donde escribes.",
      },
    ],
  },
  closing: {
    title: "Tu historia empieza el día que empiezas a guardarla.",
    mono: "SELF-HOSTED · NEXT.JS + SUPABASE · TUS DATOS SON TUYOS",
  },
  footer: {
    product: "PRODUCTO",
    how: "CÓMO FUNCIONA",
    mcp: "MCP",
    github: "GITHUB",
    rights: "© 2026 — HECHO PARA MEDIR",
  },
};

const en: LandingCopy = {
  meta: {
    title: "Reels Analytics — Measure what you post. Understand what grows.",
    description:
      "Daily snapshots of your TikTok and Instagram Reels: per-video growth curves, same-week benchmarks and a digest every Monday.",
    path: "/en/landing",
    ogLocale: "en_US",
  },
  nav: {
    product: "Product",
    how: "How it works",
    mcp: "MCP",
    code: "View the code",
    start: "Start measuring",
  },
  hero: {
    kicker: "TIKTOK · INSTAGRAM — DAILY SNAPSHOTS FROM DAY ZERO",
    h1a: "Measure what you post.",
    h1accent: "Understand",
    h1b: "what grows.",
    sub: "The TikTok and Instagram APIs only return the present. Reels Analytics stores a daily snapshot of every video and turns that history into decisions: which format performs, which day it took off, and what to compare yourself against.",
  },
  collage: {
    snapshotLabel: "DAILY SNAPSHOT",
    snapshotMeta: "capture #417 · 2 platforms",
  },
  bento: {
    viewsTitle: "Views this week",
    viewsValue: "683.5",
    viewsUnit: "K · 57% TT",
    weekDays: ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"],
    weekLeader: "160.8K",
    followersTitle: "New followers",
    followersValue: "+1,951",
    followersMeta: "in 7 days",
    followersNote:
      "Every delta is attributed to the day it happened, not the day the cron captured it.",
    bestLabel: "BEST VIDEO",
    bestTitle: "Day 5 of the SoloQ Challenge and everyone's stuck",
    bestViews: "92.4K views",
    chartTitle: "The curve the APIs won't give you",
    sectionsTitle: "Sections by hashtag",
    sectionLabels: ["Narration", "SoloQ", "News", "Viral audio"],
    sectionsNote:
      "Tag with a hashtag and every section measures itself — no migrations, no spreadsheets.",
  },
  band: {
    kicker: "DEPTH",
    title: "Every day, one more layer of history.",
    body: "Snapshots stack up quietly, today on top of yesterday. By the time you need a video's curve, it has been writing itself for weeks.",
    ago14: "14 DAYS AGO",
    ago14Views: "1,220 views",
    ago7: "7 DAYS AGO",
    ago7Views: "8,427 views",
    today: "TODAY",
    todayViews: "92,453 views",
  },
  steps: {
    title: "Three steps, zero maintenance",
    items: [
      {
        title: "Connect your accounts",
        body: "OAuth with TikTok and Instagram. Tokens refresh themselves before every use.",
      },
      {
        title: "The cron captures daily",
        body: "One snapshot per video every 24 h. History keeps stacking even if you never open the panel.",
      },
      {
        title: "Decide with evidence",
        body: "Per-video curves, a benchmark against its own week and a digest every Monday on Telegram.",
      },
    ],
  },
  features: {
    items: [
      {
        title: "Per-video curve",
        body: "Views at day 7, initial velocity and the exact moment it took off.",
      },
      {
        title: "Weekly cohort",
        body: "Every video is compared against the ones published its same week — audience growth doesn't inflate the verdict.",
      },
      {
        title: "Telegram digest",
        body: "Every Monday: views, followers, sections and best video. It also watches that ingestion never stops.",
      },
      {
        title: "Talk to your data",
        body: "An MCP server with 9 read-only tools: ask Claude about your analytics right where you write.",
      },
    ],
  },
  closing: {
    title: "Your history starts the day you start saving it.",
    mono: "SELF-HOSTED · NEXT.JS + SUPABASE · YOUR DATA IS YOURS",
  },
  footer: {
    product: "PRODUCT",
    how: "HOW IT WORKS",
    mcp: "MCP",
    github: "GITHUB",
    rights: "© 2026 — BUILT TO MEASURE",
  },
};

export const COPY: Record<Lang, LandingCopy> = { es, en };

/** hreflang cruzado de las dos variantes; `x-default` cae al español (idioma
 *  del creador y de la ruta histórica). */
const LANGUAGE_ALTERNATES = {
  es: "/landing",
  en: "/en/landing",
  "x-default": "/landing",
};

/** Metadata completa de una variante (título absoluto: ya lleva la marca). */
export function landingMetadata(lang: Lang): Metadata {
  const { meta } = COPY[lang];
  return {
    title: { absolute: meta.title },
    description: meta.description,
    alternates: { canonical: meta.path, languages: LANGUAGE_ALTERNATES },
    openGraph: {
      type: "website",
      url: meta.path,
      siteName: "Reels Analytics",
      title: meta.title,
      description: meta.description,
      locale: meta.ogLocale,
      alternateLocale: lang === "es" ? "en_US" : "es_MX",
    },
    twitter: {
      // Con opengraph-image (convención de archivo) ya hay imagen: tarjeta grande.
      card: "summary_large_image",
      title: meta.title,
      description: meta.description,
    },
  };
}
