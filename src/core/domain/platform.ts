/**
 * Plataformas soportadas por la app.
 * Facebook queda fuera de alcance por ahora (ver CLAUDE.md).
 */
export const PLATFORMS = ["tiktok", "instagram"] as const;

export type Platform = (typeof PLATFORMS)[number];

export function isPlatform(value: string): value is Platform {
  return (PLATFORMS as readonly string[]).includes(value);
}
