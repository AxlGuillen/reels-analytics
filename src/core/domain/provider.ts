import type { Platform } from "./platform";
import type { AccountStats, VideoMetrics, VideoPage } from "./models";

/**
 * Credencial ya resuelta que un adapter usa para hablar con la API de su
 * plataforma. La obtención/refresco de tokens (OAuth) vivirá en `modules/accounts`;
 * el provider solo consume una conexión válida.
 */
export interface Connection {
  platform: Platform;
  externalAccountId: string;
  accessToken: string;
}

/**
 * PUERTO común de plataforma (patrón ports & adapters).
 *
 * Agregar una plataforma nueva = crear un módulo que implemente esta interfaz,
 * sin tocar el core ni la capa de analítica.
 */
export interface PlatformProvider {
  readonly platform: Platform;

  /** Métricas de la cuenta (seguidores, views, likes). */
  getAccountStats(conn: Connection): Promise<AccountStats>;

  /** Lista los videos de la cuenta, paginando por cursor. */
  listVideos(conn: Connection, cursor?: string): Promise<VideoPage>;

  /** Métricas actuales para un conjunto de videos por su id externo. */
  getVideoMetrics(conn: Connection, externalIds: string[]): Promise<VideoMetrics[]>;
}

/** Error estándar para métodos de provider aún no implementados. */
export class NotImplementedError extends Error {
  constructor(platform: Platform, method: string) {
    super(`[${platform}] ${method} aún no está implementado`);
    this.name = "NotImplementedError";
  }
}
