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

// Aún ninguna es obligatoria: el core arranca sin credenciales.
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
