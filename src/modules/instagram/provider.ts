import {
  NotImplementedError,
  type AccountStats,
  type Connection,
  type PlatformProvider,
  type VideoMetrics,
  type VideoPage,
} from "@/core/domain";

/**
 * Adapter de Instagram — Graph API (Instagram API with Instagram Login).
 *
 * Endpoints objetivo (ver CLAUDE.md):
 *  - Cuenta:  GET /{ig-user-id}          (followers_count, media_count)
 *             GET /{ig-user-id}/insights (reach, views, ...)
 *  - Videos:  GET /{ig-user-id}/media    (filtrar media_product_type = REELS)
 *             GET /{media-id}/insights    (views, shares, saved, ...)
 *
 * Stub: las llamadas HTTP y los mappers `raw -> dominio` se implementarán cuando
 * conectemos OAuth. La forma normalizada de retorno ya está fijada por el core.
 */
export class InstagramProvider implements PlatformProvider {
  readonly platform = "instagram" as const;

  async getAccountStats(_conn: Connection): Promise<AccountStats> {
    throw new NotImplementedError(this.platform, "getAccountStats");
  }

  async listVideos(_conn: Connection, _cursor?: string): Promise<VideoPage> {
    throw new NotImplementedError(this.platform, "listVideos");
  }

  async getVideoMetrics(
    _conn: Connection,
    _externalIds: string[],
  ): Promise<VideoMetrics[]> {
    throw new NotImplementedError(this.platform, "getVideoMetrics");
  }
}

export const instagramProvider = new InstagramProvider();
