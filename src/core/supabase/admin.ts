import "server-only";
import { createClient } from "@supabase/supabase-js";
import { requireEnv } from "@/core/config/env";
import type { Database } from "./database.types";

/**
 * Cliente Supabase con la SECRET key: solo servidor, **ignora RLS**.
 * Se usa para la ingesta (escribir snapshots). Nunca importar desde el cliente.
 *
 * Es una función (no un singleton exportado) para no leer env en tiempo de
 * import: solo lanza si falta una variable cuando de verdad se usa.
 */
export function createAdminClient() {
  return createClient<Database>(
    requireEnv("NEXT_PUBLIC_SUPABASE_URL"),
    requireEnv("SUPABASE_SECRET_KEY"),
    { auth: { persistSession: false, autoRefreshToken: false } },
  );
}
