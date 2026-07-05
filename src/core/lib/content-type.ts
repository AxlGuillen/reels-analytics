/**
 * Tipos de contenido del creador, derivados de un hashtag identificador.
 *
 * Decisión de diseño: el tipo NO se persiste en Supabase (solo datos crudos). Se
 * **deriva al leer** revisando si el `hashtags[]` del video (ya guardado) incluye
 * el tag reservado. Cambiar reglas o sumar un tipo = editar este diccionario, sin
 * migración ni re-backfill. Este archivo es la única fuente de verdad.
 */

export type ContentTypeKey = "audioviral" | "dui" | "duiyhal";

export interface ContentTypeDef {
  /** hashtag identificador (sin `#`, en minúsculas, como lo devuelve el parser). */
  tag: string;
  /** etiqueta para la UI. */
  label: string;
}

export const CONTENT_TYPES: Record<ContentTypeKey, ContentTypeDef> = {
  audioviral: { tag: "audioviral", label: "Audio viral" },
  dui: { tag: "dui", label: "Dui (narración)" },
  duiyhal: { tag: "duiyhal", label: "Dui y Hal" },
};

/** Etiqueta para los videos sin ningún tag de tipo. */
export const UNCLASSIFIED_LABEL = "Sin clasificar";

/**
 * Orden de precedencia (más específico primero). Si un video llevara varios tags
 * de tipo, gana el primero de esta lista. `duiyhal` va antes que `dui` por si
 * ambos aparecieran juntos.
 */
const PRECEDENCE: ContentTypeKey[] = ["duiyhal", "dui", "audioviral"];

/** Conjunto de tags reservados (para excluirlos del análisis de hashtags temáticos). */
export const RESERVED_TAGS: ReadonlySet<string> = new Set(
  Object.values(CONTENT_TYPES).map((t) => t.tag),
);

/**
 * Clasifica un video por sus hashtags. Devuelve la clave del tipo o `null` si no
 * lleva ninguno de los identificadores. Espera los tags como los da
 * `extractHashtags` (minúsculas, sin `#`).
 */
export function classifyContentType(hashtags: string[]): ContentTypeKey | null {
  const set = new Set(hashtags);
  for (const key of PRECEDENCE) {
    if (set.has(CONTENT_TYPES[key].tag)) return key;
  }
  return null;
}

/** Etiqueta legible de un tipo (o "Sin clasificar" para `null`). */
export function contentTypeLabel(key: ContentTypeKey | null): string {
  return key ? CONTENT_TYPES[key].label : UNCLASSIFIED_LABEL;
}
