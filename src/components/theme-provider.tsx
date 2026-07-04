"use client";

import { ThemeProvider as NextThemesProvider } from "next-themes";

/**
 * Proveedor de tema (claro/oscuro) sobre next-themes. Alterna la clase `.dark`
 * en <html>, persiste la elección y evita el flash SSR. Envuelve la app en el
 * root layout.
 */
export function ThemeProvider({
  children,
  ...props
}: React.ComponentProps<typeof NextThemesProvider>) {
  return <NextThemesProvider {...props}>{children}</NextThemesProvider>;
}
