import type { Platform } from "./platform";

/**
 * Modelo de dominio NORMALIZADO, común a todas las plataformas.
 *
 * Los adapters de cada módulo (`modules/<plataforma>`) convierten la respuesta
 * cruda de su API a estas formas mediante sus `mappers/`. La capa de analítica y
 * la UI SOLO conocen estos tipos, nunca la forma cruda de TikTok o Instagram.
 *
 * Estos tipos son la fuente de verdad para, más adelante, derivar el esquema de
 * Supabase y los tipos de la base de datos.
 */

/** Estadísticas a nivel de cuenta en un instante dado. */
export interface AccountStats {
  platform: Platform;
  /** id de la cuenta en la plataforma (no el id interno de nuestra BD). */
  externalId: string;
  /** @handle / username público. */
  handle: string | null;
  followers: number;
  /** vistas totales acumuladas de la cuenta (si la plataforma la expone). */
  totalViews: number | null;
  /** likes totales acumulados de la cuenta (si la plataforma la expone). */
  totalLikes: number | null;
  /** momento en que se capturó esta lectura. */
  capturedAt: Date;

  // Campos de perfil opcionales (para mostrar; no todas las plataformas los dan).
  displayName?: string | null;
  avatarUrl?: string | null;
  verified?: boolean;
  bio?: string | null;
  following?: number | null;
  videoCount?: number | null;
}

/** Metadatos de un video (cambian poco tras publicarse). */
export interface Video {
  platform: Platform;
  externalId: string;
  caption: string | null;
  /** hashtags derivados del caption/description al ingerir. */
  hashtags: string[];
  publishedAt: Date;
  url: string | null;
  durationSeconds: number | null;
  /** miniatura/portada del video, si la plataforma la expone. */
  thumbnailUrl?: string | null;
}

/** Métricas de un video en un instante dado (esto es lo que se historiza). */
export interface VideoMetrics {
  platform: Platform;
  externalId: string;
  views: number;
  likes: number;
  comments: number;
  shares: number;
  /** guardados/colecciones; null si la plataforma no lo expone. */
  saved: number | null;
  capturedAt: Date;
}

/** Página de resultados al listar videos (paginación por cursor). */
export interface VideoPage {
  videos: Video[];
  /** cursor para la siguiente página; null si no hay más. */
  nextCursor: string | null;
}
