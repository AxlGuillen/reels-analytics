/**
 * Formas CRUDAS que devuelve la Display API de TikTok. Solo se usan dentro del
 * módulo; el resto de la app consume el modelo de dominio normalizado.
 */

/** Campos de `GET /v2/user/info/` (scopes user.info.basic/profile/stats). */
export interface TikTokUser {
  open_id: string;
  display_name: string;
  avatar_url?: string;
  follower_count: number;
  following_count: number;
  likes_count: number;
  video_count: number;
}

/** Campos de `POST /v2/video/list/` y `/v2/video/query/`. */
export interface TikTokVideo {
  id: string;
  /** timestamp Unix en segundos. */
  create_time: number;
  video_description: string;
  /** duración en segundos. */
  duration: number;
  cover_image_url?: string;
  share_url?: string;
  view_count: number;
  like_count: number;
  comment_count: number;
  share_count: number;
}
