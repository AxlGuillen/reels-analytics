/**
 * Glifo "4XL" de la marca (mismo trazo que src/app/icon.svg, sin el fondo).
 *
 * Pinta con `currentColor` a propósito: el contraste lo decide la zona que lo
 * usa — tile lima → glifo tinta (`text-primary-foreground`), superficie oscura
 * → glifo lima con su swap `dark:`, etc. Server-safe (SVG puro, sin JS).
 */
export function BrandGlyph({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 120 120"
      className={className}
      fill="currentColor"
      aria-hidden
    >
      <g transform="translate(8,14)">
        {/* Clases para la micro-animación CSS (globals: "Marca 4XL"). */}
        <path className="brand-glyph-bar" d="M0 52 H104 V66 H0 Z" />
        <path className="brand-glyph-four" d="M66 0 H80 V78 H104 V92 H66 V20 L26 60 H6 Z" />
      </g>
    </svg>
  );
}
