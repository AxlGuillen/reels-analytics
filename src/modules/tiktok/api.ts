import type { TikTokUser, TikTokVideo } from "./types";

/**
 * Cliente HTTP de bajo nivel para la Display API de TikTok.
 *
 * Docs: https://developers.tiktok.com/doc/display-api-get-started/
 * Todas las llamadas usan el access token del usuario (Bearer) y devuelven las
 * formas crudas de `types.ts`. El mapeo al dominio ocurre en `mappers.ts`.
 */

const API_BASE = "https://open.tiktokapis.com/v2";

const USER_FIELDS = [
  "open_id",
  "display_name",
  "avatar_url",
  "username",
  "bio_description",
  "is_verified",
  "follower_count",
  "following_count",
  "likes_count",
  "video_count",
];

const VIDEO_FIELDS = [
  "id",
  "create_time",
  "video_description",
  "duration",
  "cover_image_url",
  "share_url",
  "view_count",
  "like_count",
  "comment_count",
  "share_count",
];

/** Máximo de videos por página/consulta que admite la API. */
export const MAX_VIDEOS_PER_PAGE = 20;

/** Error de la Display API con el código que devuelve TikTok. */
export class TikTokApiError extends Error {
  constructor(
    readonly code: string,
    message: string,
  ) {
    super(`TikTok API [${code}]: ${message}`);
    this.name = "TikTokApiError";
  }
}

interface TikTokEnvelope<T> {
  data: T;
  error: { code: string; message: string; log_id: string };
}

async function request<T>(
  path: string,
  accessToken: string,
  body?: unknown,
): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    method: body ? "POST" : "GET",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      ...(body ? { "Content-Type": "application/json" } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
    cache: "no-store",
  });

  const json = (await res.json()) as TikTokEnvelope<T>;
  // TikTok siempre incluye `error`; `code === "ok"` indica éxito.
  if (!res.ok || (json.error && json.error.code !== "ok")) {
    throw new TikTokApiError(
      json.error?.code ?? String(res.status),
      json.error?.message ?? "solicitud fallida",
    );
  }
  return json.data;
}

/** Perfil y estadísticas de la cuenta autenticada. */
export async function fetchUserInfo(accessToken: string): Promise<TikTokUser> {
  const data = await request<{ user: TikTokUser }>(
    `/user/info/?fields=${USER_FIELDS.join(",")}`,
    accessToken,
  );
  return data.user;
}

export interface VideoListResult {
  videos: TikTokVideo[];
  cursor: number;
  hasMore: boolean;
}

/** Lista paginada de los videos del usuario (más recientes primero). */
export async function fetchVideoList(
  accessToken: string,
  cursor?: number,
): Promise<VideoListResult> {
  const data = await request<{
    videos: TikTokVideo[];
    cursor: number;
    has_more: boolean;
  }>(`/video/list/?fields=${VIDEO_FIELDS.join(",")}`, accessToken, {
    max_count: MAX_VIDEOS_PER_PAGE,
    ...(cursor ? { cursor } : {}),
  });
  return {
    videos: data.videos ?? [],
    cursor: data.cursor,
    hasMore: data.has_more,
  };
}

/** Métricas actuales de videos concretos por su id (hasta 20 por llamada). */
export async function queryVideos(
  accessToken: string,
  ids: string[],
): Promise<TikTokVideo[]> {
  if (ids.length === 0) return [];
  const data = await request<{ videos: TikTokVideo[] }>(
    `/video/query/?fields=${VIDEO_FIELDS.join(",")}`,
    accessToken,
    { filters: { video_ids: ids.slice(0, MAX_VIDEOS_PER_PAGE) } },
  );
  return data.videos ?? [];
}
