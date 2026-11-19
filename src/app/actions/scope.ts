"use server";

import { cookies } from "next/headers";
import { createServerSupabase } from "@/core/supabase/server";
import { resolveAccounts } from "@/modules/analytics/history";
import { ALL_ACCOUNTS, SCOPE_COOKIE } from "@/app/(dashboard)/account-scope";

/**
 * Cambia la cuenta que muestra el panel. Escribir la cookie desde un server
 * action hace que Next vuelva a renderizar la ruta actual con el alcance nuevo,
 * sin un `router.refresh()` aparte.
 */
export async function setAccountScopeAction(value: string): Promise<void> {
  const supabase = await createServerSupabase();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return;

  if (value !== ALL_ACCOUNTS) {
    const accounts = await resolveAccounts({ account: "all" });
    if (!accounts.some((a) => a.accountId === value)) return;
  }

  (await cookies()).set(SCOPE_COOKIE, value, {
    path: "/",
    sameSite: "lax",
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    maxAge: 60 * 60 * 24 * 365,
  });
}
