"use client";

import { useActionState, useState } from "react";
import { EyeIcon, EyeOffIcon } from "@animateicons/react/lucide";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { signInAction, type SignInState } from "./actions";

const initialState: SignInState = {};

/** Form de email+password. El estado de error viene del server action. */
export function LoginForm() {
  const [state, formAction, pending] = useActionState(signInAction, initialState);
  const [showPassword, setShowPassword] = useState(false);

  return (
    <form action={formAction} className="flex flex-col gap-4">
      <div className="flex flex-col gap-1.5">
        <label htmlFor="email" className="text-muted-foreground text-sm">
          Email
        </label>
        <input
          id="email"
          name="email"
          type="email"
          autoComplete="email"
          required
          className="border-border bg-background focus-visible:border-ring focus-visible:ring-ring/50 h-9 rounded-lg border px-3 text-sm outline-none focus-visible:ring-3"
        />
      </div>

      <div className="flex flex-col gap-1.5">
        <label htmlFor="password" className="text-muted-foreground text-sm">
          Contraseña
        </label>
        <div className="relative">
          <input
            id="password"
            name="password"
            type={showPassword ? "text" : "password"}
            autoComplete="current-password"
            required
            className="border-border bg-background focus-visible:border-ring focus-visible:ring-ring/50 h-9 w-full rounded-lg border pr-10 pl-3 text-sm outline-none focus-visible:ring-3"
          />
          <button
            type="button"
            onClick={() => setShowPassword((v) => !v)}
            aria-label={showPassword ? "Ocultar contraseña" : "Mostrar contraseña"}
            aria-pressed={showPassword}
            className="text-muted-foreground hover:text-foreground absolute inset-y-0 right-0 flex items-center px-3"
          >
            {showPassword ? (
              <EyeOffIcon size={16} />
            ) : (
              <EyeIcon size={16} />
            )}
          </button>
        </div>
      </div>

      {state.error && (
        <p className="text-destructive text-sm" role="alert">
          {state.error}
        </p>
      )}

      <Button type="submit" size="lg" disabled={pending} className="mt-2 w-full">
        {pending && <Loader2 className="animate-spin" />}
        {pending ? "Entrando…" : "Entrar"}
      </Button>
    </form>
  );
}
