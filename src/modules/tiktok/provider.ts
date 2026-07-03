import {
  NotImplementedError,
  type AccountStats,
  type Connection,
  type PlatformProvider,
  type VideoMetrics,
  type VideoPage,
} from "@/core/domain";

/**
 * Adapter de TikTok — Display API (Login Kit).
 *
 * Endpoints objetivo (ver CLAUDE.md):
 *  - Cuenta:  GET  /v2/user/info/    (scope user.info.stats)
 *  - Videos:  POST /v2/video/list/   (scope video.list)
 *
 * Stub: las llamadas HTTP y los mappers `raw -> dominio` se implementarán cuando
 * conectemos OAuth. La forma normalizada de retorno ya está fijada por el core.
 */
export class TikTokProvider implements PlatformProvider {
  readonly platform = "tiktok" as const;

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

export const tiktokProvider = new TikTokProvider();
