"use client";

import { useEffect } from "react";

/**
 * Ajusta `<html lang>` en el cliente. El root layout fija `lang="es"` (idioma
 * de la app) y un route segment no puede cambiar ese atributo en el SSR sin un
 * root layout propio; para la variante `/en/landing` este efecto mínimo corrige
 * el atributo tras hidratar.
 *
 * NO es lo que marca el idioma del contenido: de eso se encarga el `lang` del
 * propio `<main>` (SSR, sin esperar a la hidratación, así que los lectores de
 * pantalla lo tienen desde la primera pintura) y, para buscadores, el hreflang
 * y `og:locale`. Esto solo pone honesto el elemento raíz, que es lo que miran
 * las heurísticas de traducción del navegador.
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
