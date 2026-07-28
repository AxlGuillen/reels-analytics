"use server";

import { redirect } from "next/navigation";
import { createServerSupabase } from "@/core/supabase/server";

export interface SignInState {
  error?: string;
}

/**
 * Solo se admite volver a una ruta **interna**: si aceptáramos una URL absoluta
 * tendríamos un open redirect (y el login del flujo OAuth es justo el blanco
 * goloso para eso). `//host` también se rechaza: el navegador lo trata como
 * protocolo-relativo.
 */
function safeNext(raw: FormDataEntryValue | null): string {
  const value = typeof raw === "string" ? raw : "";
  if (!value.startsWith("/") || value.startsWith("//")) return "/";
  return value;
}

/**
 * Server action del form de login. Autentica con email+password contra Supabase
 * Auth; en éxito, `signInWithPassword` escribe las cookies de sesión y redirige
 * al dashboard. En error devuelve un mensaje para mostrar en el form.
 */
export async function signInAction(
  _prev: SignInState,
  formData: FormData,
): Promise<SignInState> {
  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "");
  const next = safeNext(formData.get("next"));

  if (!email || !password) {
    return { error: "Ingresa tu email y contraseña." };
  }

  const supabase = await createServerSupabase();
  const { error } = await supabase.auth.signInWithPassword({ email, password });

  if (error) {
    return { error: "Credenciales inválidas." };
  }

  redirect(next);
}

/** Cierra la sesión y regresa al login. */
export async function signOutAction() {
  const supabase = await createServerSupabase();
  await supabase.auth.signOut();
  redirect("/login");
}
