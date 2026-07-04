import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";
import { requireEnv } from "@/core/config/env";
import type { Database } from "./database.types";

/**
 * Cliente Supabase para el servidor (Server Components, Server Actions, route
 * handlers). Usa la **publishable key** y lee/escribe la sesión de auth en las
 * cookies de la request vía `@supabase/ssr`.
 *
 * A diferencia de `admin.ts` (secret key, ignora RLS, para la ingesta), este
 * cliente actúa como el usuario autenticado. Aquí lo usamos solo para la
 * compuerta de login (verificar sesión / iniciar-cerrar sesión).
 */
export async function createServerSupabase() {
  const jar = await cookies();
  return createServerClient<Database>(
    requireEnv("NEXT_PUBLIC_SUPABASE_URL"),
    requireEnv("NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY"),
    {
      cookies: {
        getAll() {
          return jar.getAll();
        },
        setAll(cookiesToSet) {
          // En Server Components `set` puede lanzar (solo se puede escribir en
          // Server Actions/route handlers). Se ignora: el middleware refresca la
          // sesión, así que basta con leerla aquí.
          try {
            for (const { name, value, options } of cookiesToSet) {
              jar.set(name, value, options);
            }
          } catch {
            // no-op en contexto de solo lectura
          }
        },
      },
    },
  );
}
