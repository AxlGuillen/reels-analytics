"use client";

import { useActionState, useState } from "react";
import { EyeIcon, EyeOffIcon } from "@animateicons/react/lucide";
import { CircleAlert, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { signInAction, type SignInState } from "./actions";

const initialState: SignInState = {};

/** Form de email+password. El estado de error viene del server action. */
export function LoginForm({ next = "/" }: { next?: string }) {
  const [state, formAction, pending] = useActionState(signInAction, initialState);
  const [showPassword, setShowPassword] = useState(false);

  return (
    <form action={formAction} className="flex flex-col gap-4">
      {/* A dónde volver tras entrar (p. ej. el /oauth/authorize interrumpido). */}
      <input type="hidden" name="next" value={next} />
      <div className="flex flex-col gap-1.5">
        <label
          htmlFor="email"
          className="text-[12.5px] font-medium"
        >
          Email
        </label>
        <input
          id="email"
          name="email"
          type="email"
          autoComplete="email"
          required
          className="bg-muted focus-visible:ring-ring/30 h-11 rounded-full px-4 text-sm transition-shadow outline-none focus-visible:ring-2"
        />
      </div>

      <div className="flex flex-col gap-1.5">
        <label
          htmlFor="password"
          className="text-[12.5px] font-medium"
        >
          Contraseña
        </label>
        <div className="relative">
          <input
            id="password"
            name="password"
            type={showPassword ? "text" : "password"}
            autoComplete="current-password"
            required
            className="bg-muted focus-visible:ring-ring/30 h-11 w-full rounded-full pr-11 pl-4 text-sm transition-shadow outline-none focus-visible:ring-2"
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
        <div
          className="bg-destructive/10 text-destructive flex items-start gap-2 rounded-[18px] px-4 py-3 text-sm"
          role="alert"
        >
          <CircleAlert className="mt-0.5 size-4 shrink-0" />
          {state.error}
        </div>
      )}

      <Button type="submit" disabled={pending} className="mt-2 h-11 w-full">
        {pending && <Loader2 className="animate-spin" />}
        {pending ? "Entrando…" : "Entrar"}
      </Button>
    </form>
  );
}
