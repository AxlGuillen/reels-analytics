"use client";

import { useTransition } from "react";
import { cn } from "@/lib/utils";
import { setAccountScopeAction } from "@/app/actions/scope";

export interface AccountOption {
  value: string;
  label: string;
}

/**
 * Cuenta que muestra el panel: "Todas las cuentas" o una sola. Es global (se
 * guarda en una cookie desde el server action): elegir una cuenta en el
 * Overview la mantiene al pasar a Crecimiento o Contenido.
 */
export function AccountSelector({
  value,
  options,
  allValue,
}: {
  value: string;
  options: AccountOption[];
  /** valor de "todas": viene del servidor para no duplicar la constante. */
  allValue: string;
}) {
  const [pending, startTransition] = useTransition();

  return (
    <select
      aria-label="Cuenta a mostrar"
      value={value}
      disabled={pending}
      aria-busy={pending}
      onChange={(e) => {
        const next = e.target.value;
        startTransition(() => setAccountScopeAction(next));
      }}
      className={cn(
        "border-border bg-card text-foreground focus-visible:ring-ring/40 h-9 max-w-full rounded-full border px-3.5 text-[13px] font-medium transition-opacity outline-none focus-visible:ring-2",
        // Atenuado mientras el servidor re-renderiza con la cuenta nueva.
        pending && "opacity-60",
      )}
    >
      <option value={allValue}>Todas las cuentas</option>
      {options.map((o) => (
        <option key={o.value} value={o.value}>
          {o.label}
        </option>
      ))}
    </select>
  );
}
