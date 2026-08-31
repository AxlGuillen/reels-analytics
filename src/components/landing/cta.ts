/**
 * Píldoras de acción de la landing. Viven aquí porque las comparten el markup
 * del server (`landing-page.tsx`) y el nav client (`landing-nav.tsx`): al estar
 * duplicadas, un cambio de estilo se aplicaba en un sitio y se olvidaba en el
 * otro.
 *
 * Son cadenas de clases (no `buttonVariants`) a propósito: la landing usa
 * `<Link>`/`<a>` nativos, y el `Button` de shadcn sobre Base UI no soporta
 * `asChild`.
 *
 * Contrato Acid Grid: la CTA primaria es TINTA (`bg-foreground`), nunca lima —
 * el lima es superficie de acento, no de acción. El tamaño (padding y tipo) lo
 * pone cada uso concatenando sus propias clases.
 */

/** Acción principal: tinta sobre fondo claro (se invierte con el tema). */
export const CTA_PRIMARY =
  "bg-foreground text-background hover:bg-foreground/90 inline-flex items-center justify-center rounded-full font-medium transition-colors";

/** Acción secundaria: card con borde; también sirve para toggles e iconos. */
export const CTA_OUTLINE =
  "border-border bg-card hover:bg-muted inline-flex items-center justify-center gap-1.5 rounded-full border transition-colors";
