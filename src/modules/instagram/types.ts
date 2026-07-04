/**
 * Formas CRUDAS que devuelve la Instagram Graph API (Instagram Login).
 * Confirmadas contra la cuenta real. Solo se usan dentro del módulo; el resto
 * de la app consume el modelo de dominio normalizado.
 */

/** Campos de `GET /me` (Instagram API with Instagram Login). */
export interface IgUser {
  user_id: string;
  username: string;
  account_type?: string;
  media_count?: number;
  followers_count?: number;
  follows_count?: number;
  profile_picture_url?: string;
  name?: string;
  biography?: string;
}

/** Campos de `GET /me/media`. */
export interface IgMedia {
  id: string;
  caption?: string;
  media_type?: string;
  /** REELS | IMAGE | CAROUSEL_ALBUM | ... — filtramos a REELS. */
  media_product_type?: string;
  /** ISO 8601, p. ej. "2026-07-03T00:45:12+0000". */
  timestamp: string;
  permalink?: string;
  thumbnail_url?: string;
  like_count?: number;
  comments_count?: number;
}

/** Respuesta de `GET /{media-id}/insights`. */
export interface IgInsightsResponse {
  data: {
    name: string;
    values: { value: number }[];
  }[];
}

/** Métricas de insights ya aplanadas (name → value). */
export type IgInsights = Record<string, number>;

/** Respuesta paginada genérica de la Graph API. */
export interface IgPage<T> {
  data: T[];
  paging?: {
    cursors?: { before?: string; after?: string };
    next?: string;
  };
}
