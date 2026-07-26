/**
 * Acceso central y validado a variables de entorno.
 *
 * Por ahora solo declara las que necesitaremos; Supabase y las credenciales de
 * plataforma se irán conectando cuando definamos esas integraciones. Mantener
 * TODO acceso a `process.env` a través de aquí evita `process.env.X` regados por
 * el código y permite fallar temprano si falta algo obligatorio.
 */

type EnvSpec = {
  /** si es true, la ausencia lanza en tiempo de arranque del servidor. */
  required: boolean;
};

// Casi ninguna es obligatoria: el core arranca sin credenciales (cada integración
// falla sola si le falta la suya). La excepción es `APP_URL`, que sostiene la
// identidad del authorization server.
const SPEC = {
  NEXT_PUBLIC_SUPABASE_URL: { required: false },
  // Sistema moderno de API keys de Supabase (publishable = cliente, secret = server).
  NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: { required: false },
  SUPABASE_SECRET_KEY: { required: false },
  TIKTOK_CLIENT_KEY: { required: false },
  TIKTOK_CLIENT_SECRET: { required: false },
  TIKTOK_REDIRECT_URI: { required: false },
  INSTAGRAM_APP_ID: { required: false },
  INSTAGRAM_APP_SECRET: { required: false },
  INSTAGRAM_USER_ID: { required: false },
  INSTAGRAM_ACCESS_TOKEN: { required: false },
  // Protege el endpoint del cron (Vercel envía Bearer con este valor).
  CRON_SECRET: { required: false },
  // Digest semanal por Telegram (bot de @BotFather + chat del creador).
  TELEGRAM_BOT_TOKEN: { required: false },
  TELEGRAM_CHAT_ID: { required: false },
  // Protege el servidor MCP (/api/mcp): el cliente manda Bearer con este valor.
  MCP_SECRET: { required: false },
  // Detalle de /api/health. Secreto PROPIO (no se reusa CRON_SECRET): esta URL
  // se le da a un monitor externo y con el del cron podría disparar la ingesta.
  HEALTH_SECRET: { required: false },
  // Origen público de la app (p. ej. https://reels-analytics.vercel.app). Es el
  // issuer y la base del `resource` de OAuth: debe ser fijo, no derivado del
  // header Host (spoofable). Sin barra final. Obligatoria: sin ella el flujo
  // OAuth del MCP no puede emitir ni validar tokens (`requireEnv` ya lanzaba).
  APP_URL: { required: true },
} satisfies Record<string, EnvSpec>;

export type EnvKey = keyof typeof SPEC;

/** Lee una variable; lanza si está marcada como requerida y falta. */
export function env(key: EnvKey): string | undefined {
  const value = process.env[key];
  if (!value && SPEC[key].required) {
    throw new Error(`Falta la variable de entorno obligatoria: ${key}`);
  }
  return value;
}

/** Igual que `env` pero garantiza string no vacío (lanza si falta). */
export function requireEnv(key: EnvKey): string {
  const value = process.env[key];
  if (!value) {
    throw new Error(`Falta la variable de entorno requerida: ${key}`);
  }
  return value;
}
