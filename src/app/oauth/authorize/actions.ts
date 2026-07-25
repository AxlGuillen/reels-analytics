"use server";

import { redirect } from "next/navigation";
import { createServerSupabase } from "@/core/supabase/server";
import { GRANTED_SCOPE, getClient, issueCode } from "@/modules/oauth/store";
import { redirectUriMatches } from "@/modules/oauth/tokens";
import { resourceUrl } from "@/modules/oauth/config";

/**
 * Resolución del consentimiento: una acción por botón.
 *
 * Antes había una sola acción que leía un campo `decision` del submitter
 * (`name`/`value` del botón). Ese dato no sobrevivía al `Button` de Base UI, así
 * que "Autorizar" se interpretaba como denegar y el cliente recibía
 * `access_denied`. Con una acción por botón la intención va en QUÉ se ejecuta,
 * no en un campo que puede perderse o manipularse.
 */

/** Datos del formulario, revalidados siempre contra la BD. */
async function loadRequest(formData: FormData) {
  const clientId = String(formData.get("client_id") ?? "");
  const redirectUri = String(formData.get("redirect_uri") ?? "");
  const codeChallenge = String(formData.get("code_challenge") ?? "");
  const state = String(formData.get("state") ?? "");

  // Los campos ocultos llegan del navegador: no son confiables.
  const client = await getClient(clientId);
  if (!client || !redirectUriMatches(client.redirectUris, redirectUri)) {
    // redirect_uri no verificado: no se redirige ahí bajo ninguna circunstancia.
    throw new Error("Solicitud de autorización inválida.");
  }

  const target = new URL(redirectUri);
  if (state) target.searchParams.set("state", state);
  return { clientId, redirectUri, codeChallenge, target };
}

/** Concede el acceso: emite el code y vuelve al cliente. */
export async function approveAction(formData: FormData): Promise<void> {
  const { clientId, redirectUri, codeChallenge, target } =
    await loadRequest(formData);

  const supabase = await createServerSupabase();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    // Traza: la página solo se renderiza con sesión, así que llegar aquí sin
    // usuario significa que la cookie no viajó en el POST de la server action.
    console.error("[oauth] consent: aprobado sin sesión visible", { clientId });
    redirect("/login");
  }

  const code = await issueCode({
    clientId,
    redirectUri,
    codeChallenge,
    scope: GRANTED_SCOPE,
    resource: resourceUrl(),
    userId: user.id,
  });

  console.error("[oauth] consent: code emitido", { clientId, host: target.host });
  target.searchParams.set("code", code);
  redirect(target.toString());
}

/** Deniega el acceso: devuelve `access_denied` al cliente. */
export async function denyAction(formData: FormData): Promise<void> {
  const { clientId, target } = await loadRequest(formData);
  console.error("[oauth] consent: denegado", { clientId });
  target.searchParams.set("error", "access_denied");
  redirect(target.toString());
}
