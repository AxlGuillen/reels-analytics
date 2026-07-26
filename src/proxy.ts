import { NextResponse, type NextRequest } from "next/server";
import { createServerClient } from "@supabase/ssr";

/**
 * Compuerta de auth de toda la app.
 *
 * Refresca la sesión de Supabase en cada request (patrón oficial de
 * `@supabase/ssr`: escribir las cookies en la MISMA response que se devuelve) y
 * redirige a `/login` si no hay usuario. Rutas públicas: `/login` y los estáticos
 * (`api/cron` ya se excluye en el `matcher` porque se protege con `CRON_SECRET`).
 *
 * Usa `getUser()` (revalida el token contra el servidor de auth), no `getSession()`.
 *
 * Convención `proxy.ts` de Next 16 (reemplaza al antiguo `middleware.ts`).
 */
export async function proxy(request: NextRequest) {
  let response = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          for (const { name, value } of cookiesToSet) {
            request.cookies.set(name, value);
          }
          response = NextResponse.next({ request });
          for (const { name, value, options } of cookiesToSet) {
            response.cookies.set(name, value, options);
          }
        },
      },
    },
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { pathname } = request.nextUrl;
  const isLogin = pathname === "/login";

  // Sin sesión y fuera del login → mandar al login, recordando a dónde iba.
  // El `next` importa para /oauth/authorize: si se perdiera la query, el flujo
  // OAuth se rompería al volver del login.
  if (!user && !isLogin) {
    const url = request.nextUrl.clone();
    const target = `${pathname}${request.nextUrl.search}`;
    url.pathname = "/login";
    url.search = "";
    if (target !== "/") url.searchParams.set("next", target);
    return NextResponse.redirect(url);
  }

  // Con sesión y en el login → mandar al dashboard.
  if (user && isLogin) {
    const url = request.nextUrl.clone();
    url.pathname = "/";
    url.search = "";
    return NextResponse.redirect(url);
  }

  return response;
}

export const config = {
  /**
   * Corre en todo salvo: internals de Next, favicon, archivos con extensión
   * (imágenes, etc.), `api/cron` (se autentica con `CRON_SECRET`), los
   * transportes del MCP (`api/mcp`, `api/sse`, `api/message` — se autentican en
   * su route handler), y los endpoints públicos de OAuth: los `.well-known`
   * (descubrimiento) y `api/oauth` (`/register` y `/token` son máquina-a-máquina
   * y no llevan sesión). `/oauth/authorize` SÍ pasa por aquí: necesita al
   * usuario logueado.
   */
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|\\.well-known|api/cron|api/health|api/mcp|api/sse|api/message|api/oauth|.*\\.[\\w]+$).*)",
  ],
};
