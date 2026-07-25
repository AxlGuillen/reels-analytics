"use server";

import { redirect } from "next/navigation";
import { createServerSupabase } from "@/core/supabase/server";
import { GRANTED_SCOPE, getClient, issueCode } from "@/modules/oauth/store";
import { redirectUriMatches } from "@/modules/oauth/tokens";
import { resourceUrl } from "@/modules/oauth/config";

/**
 * Resuelve el consentimiento. Revalida TODO desde cero (cliente, redirect_uri,
 * sesión): los campos ocultos del form llegan del navegador y no son confiables.
 */
export async function decideAction(formData: FormData): Promise<void> {
  const clientId = String(formData.get("client_id") ?? "");
  const redirectUri = String(formData.get("redirect_uri") ?? "");
  const codeChallenge = String(formData.get("code_challenge") ?? "");
  const state = String(formData.get("state") ?? "");
  const allowed = formData.get("decision") === "allow";

  const client = await getClient(clientId);
  if (!client || !redirectUriMatches(client.redirectUris, redirectUri)) {
    // redirect_uri no confiable: no se redirige a él bajo ninguna circunstancia.
    throw new Error("Solicitud de autorización inválida.");
  }

  const target = new URL(redirectUri);
  if (state) target.searchParams.set("state", state);

  if (!allowed) {
    target.searchParams.set("error", "access_denied");
    redirect(target.toString());
  }

  const supabase = await createServerSupabase();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const code = await issueCode({
    clientId,
    redirectUri,
    codeChallenge,
    scope: GRANTED_SCOPE,
    resource: resourceUrl(),
    userId: user.id,
  });

  target.searchParams.set("code", code);
  redirect(target.toString());
}
