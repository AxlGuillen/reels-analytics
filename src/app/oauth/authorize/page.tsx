import { redirect } from "next/navigation";
import { Blocks, CircleAlert } from "lucide-react";
import { Button } from "@/components/ui/button";
import { createServerSupabase } from "@/core/supabase/server";
import { SCOPE } from "@/modules/oauth/config";
import { getClient } from "@/modules/oauth/store";
import { redirectUriMatches } from "@/modules/oauth/tokens";
import { approveAction, denyAction } from "./actions";

/** Datos de la petición OAuth que ambos formularios reenvían a su acción. */
function RequestFields({
  clientId,
  redirectUri,
  codeChallenge,
  state,
}: {
  clientId: string;
  redirectUri: string;
  codeChallenge: string;
  state?: string;
}) {
  return (
    <>
      <input type="hidden" name="client_id" value={clientId} />
      <input type="hidden" name="redirect_uri" value={redirectUri} />
      <input type="hidden" name="code_challenge" value={codeChallenge} />
      <input type="hidden" name="state" value={state ?? ""} />
    </>
  );
}

export const runtime = "nodejs";

/** Pantalla de error: se usa cuando NO podemos confiar en el `redirect_uri`. */
function AuthorizeError({ message }: { message: string }) {
  return (
    <main className="bg-grain flex min-h-dvh items-center justify-center px-6">
      <div className="bg-card shadow-lift w-full max-w-md rounded-lg p-6">
        <span className="bg-destructive/10 text-destructive flex size-[26px] items-center justify-center rounded-[9px]">
          <CircleAlert className="size-3.5" />
        </span>
        <p className="mt-3 text-lg font-medium tracking-[-0.02em]">
          No se pudo autorizar la conexión
        </p>
        <p className="text-muted-foreground mt-1.5 text-sm">{message}</p>
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
    <main className="bg-grain flex min-h-dvh items-center justify-center px-6 py-16">
      <div className="animate-fade-up w-full max-w-md">
        <div className="bg-card shadow-lift rounded-lg p-6">
          <span className="bg-primary text-primary-foreground flex size-9 items-center justify-center rounded-[14px]">
            <Blocks className="size-[18px]" />
          </span>
          <h1 className="mt-4 text-[1.6rem] leading-tight font-medium tracking-[-0.025em]">
            Autorizar conexión
          </h1>
          <p className="text-muted-foreground mt-1.5 mb-6 text-sm">
            Una aplicación quiere leer tus métricas desde el servidor MCP.
          </p>

          <dl className="bg-muted flex flex-col gap-3 rounded-[18px] p-4 text-sm">
            <div className="flex items-baseline justify-between gap-4">
              <dt className="text-muted-foreground">Aplicación</dt>
              <dd className="font-medium">{clientLabel}</dd>
            </div>
            <div className="flex items-baseline justify-between gap-4">
              <dt className="text-muted-foreground">Te enviará a</dt>
              <dd className="font-mono text-xs break-all">{redirectHost}</dd>
            </div>
            <div className="flex items-baseline justify-between gap-4">
              <dt className="text-muted-foreground">Permiso</dt>
              <dd className="font-mono text-xs">{SCOPE}</dd>
            </div>
          </dl>

          <p className="text-muted-foreground mt-4 text-xs leading-relaxed">
            Solo lectura: podrá consultar tus métricas ya guardadas, no publicar ni
            modificar nada. Verifica que reconoces el destino antes de continuar.
          </p>

          {/* Un form por decisión: la intención va en QUÉ acción se ejecuta, no
              en un campo del submitter (que el Button de Base UI no propaga). */}
          <div className="mt-5 flex gap-2">
            <form action={denyAction} className="flex-1">
              <RequestFields
                clientId={clientId}
                redirectUri={redirectUri}
                codeChallenge={codeChallenge}
                state={state}
              />
              <Button type="submit" variant="outline" className="h-11 w-full">
                Denegar
              </Button>
            </form>
            <form action={approveAction} className="flex-1">
              <RequestFields
                clientId={clientId}
                redirectUri={redirectUri}
                codeChallenge={codeChallenge}
                state={state}
              />
              <Button type="submit" className="h-11 w-full">
                Autorizar
              </Button>
            </form>
          </div>
        </div>
      </div>
    </main>
  );
}
