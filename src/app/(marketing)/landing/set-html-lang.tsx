"use client";

import { useEffect } from "react";

/**
 * Ajusta `<html lang>` en el cliente. El root layout fija `lang="es"` (idioma
 * de la app) y un route segment no puede cambiar ese atributo en el SSR sin un
 * root layout propio; para la variante `/en/landing` este efecto mínimo corrige
 * el atributo tras hidratar (los crawlers leen el idioma real vía hreflang y
 * `og:locale`, que sí van por SSR).
 */
export function SetHtmlLang({ lang }: { lang: string }) {
  useEffect(() => {
    const previous = document.documentElement.lang;
    document.documentElement.lang = lang;
    return () => {
      document.documentElement.lang = previous;
    };
  }, [lang]);

  return null;
}
