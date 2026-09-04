/**
 * Línea de tiempo del proyecto — datos PUROS, curados a partir del git log.
 *
 * Por qué curado y no `git log` en vivo: en Vercel no hay `.git` en runtime y
 * los commits crudos no cuentan la historia (mezclan fixes, refactors y docs,
 * en inglés técnico). Cada hito de aquí sí sale de un commit real: `sha` es el
 * hash corto verificable en GitHub. Regla de mantenimiento: al estrenar una
 * feature grande se agrega su hito (un objeto por feature; ver CLAUDE.md).
 */

export interface Milestone {
  /** fecha ISO (YYYY-MM-DD) del commit que estrenó el hito. */
  date: string;
  title: string;
  description: string;
  /** sha corto del commit real; sin sha = el commit que estrena este hito aún no existía al escribirlo. */
  sha?: string;
  /** chip lima: marca los hitos clave (jerarquía por tono, no todos iguales). */
  tag?: string;
}

export interface Chapter {
  id: string;
  title: string;
  /** rango legible, p. ej. "2 – 9 de julio". */
  period: string;
  intro: string;
  milestones: Milestone[];
}

export const REPO_URL = "https://github.com/AxlGuillen/reels-analytics";

export const TIMELINE: Chapter[] = [
  {
    id: "arranque",
    title: "El arranque: una semana, un producto",
    period: "2 – 9 de julio",
    intro:
      "La idea fundacional en siete días: las APIs oficiales solo devuelven el presente de una métrica, así que el valor está en guardar snapshots y comparar. Todo lo demás se construyó alrededor de eso.",
    milestones: [
      {
        date: "2026-07-02",
        title: "Nace el proyecto",
        description:
          "Scaffold modular con puertos y adaptadores desde el día uno: cada plataforma sería un módulo aislado detrás de un contrato común, para que la analítica nunca dependiera de los detalles de cada API.",
        sha: "63ffa38",
        tag: "El origen",
      },
      {
        date: "2026-07-03",
        title: "TikTok conectado y leyendo",
        description:
          "OAuth con PKCE por la mañana; por la tarde el dashboard ya mostraba perfil, videos y analítica derivada (mejor día y hora, engagement, hashtags).",
        sha: "fb413c4",
      },
      {
        date: "2026-07-03",
        title: "Instagram, el mismo día",
        description:
          "El contrato PlatformProvider probó su valor de inmediato: la segunda plataforma entró sin tocar el core.",
        sha: "1737160",
      },
      {
        date: "2026-07-04",
        title: "La memoria: Supabase y el cron diario",
        description:
          "Esquema de snapshots inmutables y una ingesta diaria a las 8:00. Desde este día, cada métrica tiene un ayer con el que compararse — el corazón del producto.",
        sha: "ead7354",
        tag: "El corazón",
      },
      {
        date: "2026-07-04",
        title: "Compuerta single-user",
        description:
          "Login con Supabase Auth y registros cerrados: una sola llave para todo el panel, con guardas en capas.",
        sha: "b1bd650",
      },
      {
        date: "2026-07-05",
        title: "La vista de Crecimiento",
        description:
          "El primer consumidor de la historia persistida: seguidores en el tiempo y rendimiento por tipo, leyendo de los snapshots y no de las APIs.",
        sha: "25508df",
      },
      {
        date: "2026-07-06",
        title: "La curva de cada video",
        description:
          "Detalle por video con su crecimiento desde la publicación — la primera pantalla imposible de hacer con las APIs solas.",
        sha: "3df665d",
      },
      {
        date: "2026-07-07",
        title: "El día de los motores",
        description:
          "Cuatro features grandes en un día: métricas normalizadas por edad, benchmark contra la mediana con breakouts, digest semanal por Telegram y el servidor MCP — la analítica consultable desde Claude.",
        sha: "bf5d1b0",
      },
      {
        date: "2026-07-09",
        title: "Tipos de contenido",
        description:
          "Cada video se clasifica por su hashtag identificador al leer, no al guardar: cambiar las reglas o sumar un formato nunca exige migración.",
        sha: "ff6c268",
      },
    ],
  },
  {
    id: "cara",
    title: "Encontrar la cara",
    period: "14 – 30 de julio",
    intro:
      "Con los motores andando, el problema pasó a ser cómo se ve y cómo se abre al exterior. La identidad visual tardó cuatro intentos en llegar.",
    milestones: [
      {
        date: "2026-07-16",
        title: "Overview por periodo",
        description:
          "La portada cross-platform: semana o mes navegable, con deltas ganados en el periodo y el reparto TikTok/Instagram.",
        sha: "7ceba6b",
      },
      {
        date: "2026-07-25",
        title: "OAuth 2.1 para conectores",
        description:
          "La app se volvió su propio authorization server: los conectores remotos de Claude entran con OAuth y PKCE, sin pegar tokens a mano.",
        sha: "1301555",
      },
      {
        date: "2026-07-28",
        title: "Acid Grid, la identidad definitiva",
        description:
          "Cuarto intento visual y el bueno — antes cayeron el neón Arcane, el índigo de admin y el papel Ledger. Bento monocromo con un solo acento: el lima ácido.",
        sha: "d2c33ac",
        tag: "La cara",
      },
      {
        date: "2026-07-30",
        title: "Oscuro con contrato de contraste",
        description:
          "Tema oscuro separado por luz (anillo luminoso, no sombra) y un test que rompe el build si algún par texto/fondo baja de AA.",
        sha: "3a002a3",
      },
    ],
  },
  {
    id: "pulir",
    title: "Pulir con datos reales",
    period: "10 – 29 de agosto",
    intro:
      "Seis semanas de snapshots enseñaron cosas que el diseño original no sabía — y el proyecto aprendió a presentarse solo.",
    milestones: [
      {
        date: "2026-08-20",
        title: "Benchmark por cohorte semanal",
        description:
          "La audiencia creció ~3.5× en seis semanas y comparar contra todo el catálogo mentía: cada video se mide ahora contra los publicados su misma semana.",
        sha: "e1a1440",
      },
      {
        date: "2026-08-21",
        title: "Tours guiados",
        description:
          "Onboarding por pantalla con anclas testeadas: si un refactor rompe una guía, falla el build antes de llegar a producción.",
        sha: "699461e",
      },
      {
        date: "2026-08-28",
        title: "La landing pública",
        description:
          "La puerta de entrada en Acid Grid con movimiento GSAP ligado al scroll: por primera vez el proyecto se explica a quien no tiene sesión.",
        sha: "260acfb",
        tag: "La puerta",
      },
      {
        date: "2026-08-29",
        title: "La marca 4XL",
        description:
          "El glifo propio reemplazó al icono improvisado en todas partes: favicon, rail, login, landing y tarjetas sociales.",
        sha: "d89e14f",
      },
      {
        date: "2026-08-30",
        title: "Legible para agentes",
        description:
          "robots con Content-Signal, catálogos .well-known, markdown negociado por Accept y un MCP público informativo: la app también se explica a las IAs.",
        sha: "90ed39d",
      },
      {
        date: "2026-08-30",
        title: "Dos idiomas y Lighthouse 94",
        description:
          "i18n es/en de la landing y una tarde de performance real: mover la intro del hero a CSS puro recortó 2.5 s de LCP en móvil.",
        sha: "d9c5460",
      },
    ],
  },
  {
    id: "mundo",
    title: "Listo para el mundo",
    period: "31 de agosto en adelante",
    intro:
      "Antes de enseñarlo en redes: que cargar se sienta honesto, que el perímetro aguante visitas ajenas y que la propia historia sea parte del panel.",
    milestones: [
      {
        date: "2026-08-31",
        title: "Esqueletos honestos",
        description:
          "Estados de carga fieles en todas las pantallas y un aviso claro cuando el periodo recién empieza y aún no hay deltas que mostrar.",
        sha: "028a0d2",
      },
      {
        date: "2026-09-02",
        title: "Perímetro endurecido",
        description:
          "Headers de seguridad globales, 404 con marca, auditoría del auth en producción y reglas de repo público con main protegido.",
        sha: "b72fd82",
      },
      {
        date: "2026-09-03",
        title: "Esta línea de tiempo",
        description:
          "La historia se volvió una pantalla del propio panel: cada hito enlaza a su commit real en el repo, que ahora es público.",
        sha: "9464931",
        tag: "Estás aquí",
      },
    ],
  },
];

/** Números derivados de la propia línea de tiempo (puros, testeables). */
export function timelineStats(chapters: Chapter[] = TIMELINE): {
  milestones: number;
  firstDate: string;
  lastDate: string;
  days: number;
} {
  const all = chapters.flatMap((c) => c.milestones);
  const dates = all.map((m) => m.date).sort();
  const firstDate = dates[0];
  const lastDate = dates[dates.length - 1];
  const days =
    Math.round(
      (Date.parse(`${lastDate}T00:00:00Z`) -
        Date.parse(`${firstDate}T00:00:00Z`)) /
        86_400_000,
    ) + 1;
  return { milestones: all.length, firstDate, lastDate, days };
}

/** "2026-07-02" → "02 jul" (sin tocar zonas horarias: la fecha es editorial). */
export function formatMilestoneDate(iso: string): string {
  const [, month, day] = iso.split("-");
  const MONTHS = [
    "ene",
    "feb",
    "mar",
    "abr",
    "may",
    "jun",
    "jul",
    "ago",
    "sep",
    "oct",
    "nov",
    "dic",
  ];
  return `${day} ${MONTHS[Number(month) - 1]}`;
}
