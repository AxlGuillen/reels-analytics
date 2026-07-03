/**
 * Extrae hashtags de un caption/description.
 *
 * Ni TikTok ni Instagram exponen los hashtags como campo estructurado; se derivan
 * del texto al ingerir. Devuelve los tags en minúsculas, sin el `#` y sin duplicados,
 * preservando el orden de aparición.
 */
export function extractHashtags(text: string | null | undefined): string[] {
  if (!text) return [];

  // Soporta letras (incluye acentos/Unicode), números y guion bajo.
  const matches = text.matchAll(/#([\p{L}\p{N}_]+)/gu);

  const seen = new Set<string>();
  const tags: string[] = [];
  for (const match of matches) {
    const tag = match[1].toLowerCase();
    if (!seen.has(tag)) {
      seen.add(tag);
      tags.push(tag);
    }
  }
  return tags;
}
