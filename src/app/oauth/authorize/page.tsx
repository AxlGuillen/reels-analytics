import { redirect } from "next/navigation";
import { CircleAlert } from "lucide-react";
import { Button } from "@/components/ui/button";
import { createServerSupabase } from "@/core/supabase/server";
import { SCOPE } from "@/modules/oauth/config";
import { getClient } from "@/modules/oauth/store";
import { redirectUriMatches } from "@/modules/oauth/tokens";
import { decideAction } from "./actions";

export const runtime = "nodejs";

/** Pantalla de error: se usa cuando NO podemos confiar en el `redirect_uri`. */
function AuthorizeError({ message }: { message: string }) {
  return (
    <main className="bg-page-glow flex min-h-dvh items-center justify-center px-6">
      <div className="w-full max-w-md">
        <div className="border-destructive/30 bg-destructive/10 text-destructive flex items-start gap-2 rounded-lg border px-4 py-3 text-sm">
          <CircleAlert className="mt-0.5 size-4 shrink-0" />
          <div>
            <p className="font-medium">No se pudo autorizar la conexión</p>
            <p className="mt-1">{message}</p>
          </div>
        </div>
      </div>
    </main>
  );
}

/** Redirige de vuelta al cliente con un error OAuth (redirect_uri ya validado). */
function redirectWithError(
  redirectUri: string,
  state: string | undefined,
  error: string,
  description: string,
): never {
  const target = new URL(redirectUri);
  target.searchParams.set("error", error);
  target.searchParams.set("error_description", description);
  if (state) target.searchParams.set("state", state);
  redirect(target.toString());
}

/**
 * Authorization endpoint (pantalla de consentimiento). Orden de validación
 * pensado a propósito: primero lo que decide si el `redirect_uri` es confiable
 * (cliente + coincidencia exacta) y solo después el resto — así nunca se
 * redirige un error a una URI no verificada.
 */
export default async function AuthorizePage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const sp = await searchParams;
  const one = (key: string): string | undefined => {
    const value = sp[key];
    return Array.isArray(value) ? value[0] : value;
  };

  const clientId = one("client_id");
  const redirectUri = one("redirect_uri");
  const state = one("state");
  const codeChallenge = one("code_challenge");

  if (!clientId || !redirectUri) {
    return <AuthorizeError message="Faltan `client_id` o `redirect_uri`." />;
  }

  const client = await getClient(clientId);
  if (!client) {
    return <AuthorizeError message="El cliente no está registrado." />;
  }
  if (!redirectUriMatches(client.redirectUris, redirectUri)) {
    return (
      <AuthorizeError message="El `redirect_uri` no coincide con el registrado." />
    );
  }

  // A partir de aquí el redirect_uri es de confianza: los errores vuelven al cliente.
  if (one("response_type") !== "code") {
    redirectWithError(
      redirectUri,
      state,
      "unsupported_response_type",
      "Solo se admite response_type=code.",
    );
  }
  if (!codeChallenge || one("code_challenge_method") !== "S256") {
    redirectWithError(
      redirectUri,
      state,
      "invalid_request",
      "PKCE con code_challenge_method=S256 es obligatorio.",
    );
  }

  // El proxy ya exige sesión; esto es defensa en profundidad.
  const supabase = await createServerSupabase();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const clientLabel = client.clientName ?? "Aplicación sin nombre";
  const redirectHost = new URL(redirectUri).host;

  return (
    <main className="bg-page-glow flex min-h-dvh items-center justify-center px-6 py-16">
      <div className="animate-fade-up w-full max-w-md">
        <div className="bg-primary mb-5 h-0.5 w-10 rounded-full" />
        <h1 className="font-display text-[1.7rem] font-semibold tracking-tight">
          Autorizar conexión
        </h1>
        <p className="text-muted-foreground mt-1.5 mb-8 text-sm">
          Una aplicación quiere leer tus métricas desde el servidor MCP.
        </p>

        <div className="bg-card shadow-card rounded-lg border p-5">
          <dl className="flex flex-col gap-3 text-sm">
            <div className="flex items-baseline justify-between gap-4">
              <dt className="text-muted-foreground">Aplicación</dt>
              <dd className="font-medium">{clientLabel}</dd>
            </div>
            <div className="flex items-baseline justify-between gap-4 border-t pt-3">
              <dt className="text-muted-foreground">Te enviará a</dt>
              <dd className="font-mono text-xs break-all">{redirectHost}</dd>
            </div>
            <div className="flex items-baseline justify-between gap-4 border-t pt-3">
              <dt className="text-muted-foreground">Permiso</dt>
              <dd className="font-mono text-xs">{SCOPE}</dd>
            </div>
          </dl>

          <p className="text-muted-foreground mt-4 border-t pt-3 text-xs">
            Solo lectura: podrá consultar tus métricas ya guardadas, no publicar ni
            modificar nada. Verifica que reconoces el destino antes de continuar.
          </p>

          <form className="mt-5 flex gap-2">
            <input type="hidden" name="client_id" value={clientId} />
            <input type="hidden" name="redirect_uri" value={redirectUri} />
            <input type="hidden" name="code_challenge" value={codeChallenge} />
            <input type="hidden" name="state" value={state ?? ""} />
            <Button
              type="submit"
              name="decision"
              value="deny"
              variant="outline"
              size="lg"
              formAction={decideAction}
              className="flex-1"
            >
              Denegar
            </Button>
            <Button
              type="submit"
              name="decision"
              value="allow"
              size="lg"
              formAction={decideAction}
              className="flex-1"
            >
              Autorizar
            </Button>
          </form>
        </div>
      </div>
    </main>
  );
}
