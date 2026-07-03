import type { IgInsights, IgInsightsResponse, IgMedia, IgPage, IgUser } from "./types";

/**
 * Cliente HTTP de bajo nivel para la Instagram Graph API (Instagram Login).
 *
 * Docs: https://developers.facebook.com/docs/instagram-platform/instagram-api-with-instagram-login
 * El access token va como query param (`access_token`). Devuelve las formas
 * crudas de `types.ts`; el mapeo al dominio ocurre en `mappers.ts`.
 */

const API_BASE = "https://graph.instagram.com";
const API_VERSION = "v21.0";

const USER_FIELDS = [
  "user_id",
  "username",
  "account_type",
  "media_count",
  "followers_count",
  "follows_count",
  "profile_picture_url",
  "name",
  "biography",
];

const MEDIA_FIELDS = [
  "id",
  "caption",
  "media_type",
  "media_product_type",
  "timestamp",
  "permalink",
  "thumbnail_url",
  "like_count",
  "comments_count",
];

/** Insights por Reel que necesita el dominio (likes/comments también los da). */
const INSIGHT_METRICS = ["views", "likes", "comments", "shares", "saved"];

/** Máximo de media por página que pedimos a la API. */
export const MAX_MEDIA_PER_PAGE = 50;

/** Error de la Graph API con el código que devuelve Instagram. */
export class InstagramApiError extends Error {
  constructor(
    readonly code: number | string,
    message: string,
  ) {
    super(`Instagram API [${code}]: ${message}`);
    this.name = "InstagramApiError";
  }
}

interface IgErrorEnvelope {
  error?: { code: number; message: string; type?: string };
}

async function request<T>(
  path: string,
  accessToken: string,
  params: Record<string, string> = {},
): Promise<T> {
  const url = new URL(`${API_BASE}/${API_VERSION}/${path}`);
  for (const [k, v] of Object.entries(params)) url.searchParams.set(k, v);
  url.searchParams.set("access_token", accessToken);

  const res = await fetch(url, { cache: "no-store" });
  const json = (await res.json()) as T & IgErrorEnvelope;
  if (!res.ok || json.error) {
    throw new InstagramApiError(
      json.error?.code ?? res.status,
      json.error?.message ?? "solicitud fallida",
    );
  }
  return json;
}

/** Perfil y estadísticas de la cuenta autenticada. */
export function fetchUserInfo(accessToken: string): Promise<IgUser> {
  return request<IgUser>("me", accessToken, { fields: USER_FIELDS.join(",") });
}

/** Una página de media de la cuenta. `after` = cursor de la página previa. */
export function fetchMediaPage(
  accessToken: string,
  after?: string,
): Promise<IgPage<IgMedia>> {
  return request<IgPage<IgMedia>>("me/media", accessToken, {
    fields: MEDIA_FIELDS.join(","),
    limit: String(MAX_MEDIA_PER_PAGE),
    ...(after ? { after } : {}),
  });
}

/** Insights de un Reel, aplanados a `{ metric: value }`. */
export async function fetchMediaInsights(
  accessToken: string,
  mediaId: string,
): Promise<IgInsights> {
  const res = await request<IgInsightsResponse>(`${mediaId}/insights`, accessToken, {
    metric: INSIGHT_METRICS.join(","),
  });
  const out: IgInsights = {};
  for (const entry of res.data) {
    out[entry.name] = entry.values[0]?.value ?? 0;
  }
  return out;
}
