/**
 * Tipos de contenido del creador, derivados de un hashtag identificador.
 *
 * Decisión de diseño: el tipo NO se persiste en Supabase (solo datos crudos). Se
 * **deriva al leer** revisando si el `hashtags[]` del video (ya guardado) incluye
 * alguno de los tags reservados del tipo. Cambiar reglas o sumar un tipo = editar
 * este diccionario, sin migración ni re-backfill. Este archivo es la única fuente
 * de verdad.
 */

export type ContentTypeKey =
  | "audioviral"
  | "dui"
  | "duiyhal"
  | "news"
  | "mundial2026"
  | "cumpleaneros";

export interface ContentTypeDef {
  /**
   * Hashtags identificadores (sin `#`, en minúsculas, como los devuelve el
   * parser). El primero es el canónico; los demás son **alias** que cuentan como
   * el mismo tipo (p. ej. el creador ha usado tanto `mundial` como `mundial2026`).
   */
  tags: string[];
  /** etiqueta para la UI. */
  label: string;
}

export const CONTENT_TYPES: Record<ContentTypeKey, ContentTypeDef> = {
  audioviral: { tags: ["audioviral"], label: "Audio viral" },
  dui: { tags: ["dui"], label: "Dui (narración)" },
  duiyhal: { tags: ["duiyhal"], label: "Dui y Hal" },
  news: { tags: ["news"], label: "Noticias" },
  mundial2026: { tags: ["mundial2026", "mundial"], label: "Mundial 2026" },
  cumpleaneros: { tags: ["cumpleañeros"], label: "Cumpleañeros" },
};

/** Etiqueta para los videos sin ningún tag de tipo. */
export const UNCLASSIFIED_LABEL = "Sin clasificar";

/**
 * Orden de precedencia (más específico primero). Si un video llevara varios tags
 * de tipo, gana el primero de esta lista. `duiyhal` va antes que `dui` por si
 * ambos aparecieran juntos.
 */
const PRECEDENCE: ContentTypeKey[] = [
  "duiyhal",
  "dui",
  "news",
  "mundial2026",
  "cumpleaneros",
  "audioviral",
];

/** Conjunto de tags reservados (para excluirlos del análisis de hashtags temáticos). */
export const RESERVED_TAGS: ReadonlySet<string> = new Set(
  Object.values(CONTENT_TYPES).flatMap((t) => t.tags),
);

/**
 * Clasifica un video por sus hashtags. Devuelve la clave del tipo o `null` si no
 * lleva ninguno de los identificadores (ni sus alias). Espera los tags como los
 * da `extractHashtags` (minúsculas, sin `#`).
 */
export function classifyContentType(hashtags: string[]): ContentTypeKey | null {
  const set = new Set(hashtags);
  for (const key of PRECEDENCE) {
    if (CONTENT_TYPES[key].tags.some((tag) => set.has(tag))) return key;
  }
  return null;
}

/** Etiqueta legible de un tipo (o "Sin clasificar" para `null`). */
export function contentTypeLabel(key: ContentTypeKey | null): string {
  return key ? CONTENT_TYPES[key].label : UNCLASSIFIED_LABEL;
}

/** Hashtag canónico (primer alias) de un tipo — para textos tipo "etiqueta con #x". */
export function contentTypeTag(key: ContentTypeKey): string {
  return CONTENT_TYPES[key].tags[0];
}

/** Valor del query param `?type=` para el grupo sin tag (la clave real es `null`). */
export const UNCLASSIFIED_PARAM = "unclassified";

/**
 * URL canónica del drill-down de un tipo en la vista Contenido. Única fuente de
 * verdad del link (la usan /content y /growth); así un cambio de convención del
 * param no rompe enlaces en silencio.
 */
export function contentHref(
  key: ContentTypeKey | null,
  platform?: "tiktok" | "instagram",
): string {
  const params = new URLSearchParams();
  params.set("type", key ?? UNCLASSIFIED_PARAM);
  if (platform) params.set("platform", platform);
  return `/content?${params.toString()}`;
}
