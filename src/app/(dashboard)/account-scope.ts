import "server-only";
import { cookies } from "next/headers";
import type { Platform } from "@/core/domain";
import {
  resolveAccounts,
  type ReadGrowthOptions,
  type ScopedAccount,
} from "@/modules/analytics/history";

/**
 * Alcance de cuentas elegido en el panel: "todas" (default) o una cuenta.
 *
 * Vive en una cookie y no en la URL a propósito: los links del rail,
 * `PeriodNav`, `FreshPeriodNotice` y `RangeSelect` reconstruyen la URL desde
 * cero, así que un `?account=` se perdería al pasar de una pantalla a otra. La
 * cookie viaja sola en cada request y las páginas ya son dinámicas.
 */

export const SCOPE_COOKIE = "ra_scope";
export const ALL_ACCOUNTS = "all";

const PLATFORM_LABEL: Record<Platform, string> = {
  tiktok: "TikTok",
  instagram: "Instagram",
};

/** "@handle · TikTok": la plataforma desambigua (@axelsine13 existe en ambas). */
export function accountOptionLabel(account: ScopedAccount): string {
  const name = account.handle ? `@${account.handle}` : "cuenta nueva";
  return `${name} · ${PLATFORM_LABEL[account.platform]}`;
}

export interface AccountScopeState {
  /** valor del selector: `ALL_ACCOUNTS` o el id de una cuenta existente. */
  value: string;
  /** todas las cuentas, en orden de desglose: las opciones del selector. */
  accounts: ScopedAccount[];
  /** la cuenta elegida, o null en "todas". */
  selected: ScopedAccount | null;
  /** alcance listo para pasar a las lecturas de analítica. */
  scope: ReadGrowthOptions;
}

export async function getAccountScope(): Promise<AccountScopeState> {
  const [jar, accounts] = await Promise.all([
    cookies(),
    resolveAccounts({ account: "all" }),
  ]);
  // Una cookie con una cuenta que ya no existe cae a "todas" en vez de dejar
  // el panel vacío.
  const selected =
    accounts.find((a) => a.accountId === jar.get(SCOPE_COOKIE)?.value) ?? null;
  return selected
    ? {
        value: selected.accountId,
        accounts,
        selected,
        scope: { account: { accountId: selected.accountId } },
      }
    : { value: ALL_ACCOUNTS, accounts, selected: null, scope: { account: "all" } };
}

/** Props del `AccountSelector` a partir del estado (mismo selector en 3 pantallas). */
export function selectorProps(state: AccountScopeState) {
  return {
    value: state.value,
    allValue: ALL_ACCOUNTS,
    options: state.accounts.map((a) => ({
      value: a.accountId,
      label: accountOptionLabel(a),
    })),
  };
}
