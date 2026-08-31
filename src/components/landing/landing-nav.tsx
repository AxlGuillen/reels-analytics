"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { ArrowUpRight, Menu, X } from "lucide-react";
import { BrandGlyph } from "@/components/brand-mark";
import { ThemeToggle } from "@/components/dashboard/theme-toggle";
import { CTA_OUTLINE, CTA_PRIMARY } from "./cta";

/**
 * Nav de la landing: píldora sticky. Client component solo por el menú móvil
 * (estado abierto/cerrado); todo el copy llega por props desde el server (el
 * componente no conoce `content.ts`).
 *
 * Desktop (md+): igual que siempre — links inline + toggles + CTAs.
 * Móvil: marca + CTA + hamburguesa; los links, "ver el código" y los toggles
 * de tema/idioma viven en un panel desplegable que se cierra al elegir, con
 * Escape (devolviendo el foco al botón) o tocando fuera — sin esas dos salidas
 * la única forma de cerrarlo era volver a tocar el hamburguesa.
 */

export interface LandingNavProps {
  brand: string;
  links: readonly { href: string; label: string }[];
  code: { href: string; label: string };
  start: { href: string; label: string };
  otherLang: { href: string; label: string; full: string; hreflang: string };
  menuLabel: string;
}

/** Enlaza el botón con el panel (aria-controls). */
const MENU_PANEL_ID = "landing-nav-menu";

export function LandingNav({
  brand,
  links,
  code,
  start,
  otherLang,
  menuLabel,
}: LandingNavProps) {
  const [open, setOpen] = useState(false);
  const navRef = useRef<HTMLElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);

  // Salidas estándar del menú abierto: Escape (con el foco de vuelta en el
  // botón) y un toque fuera del nav. Los listeners solo viven mientras está
  // abierto. `pointerdown` y no `click`: cierra antes de que el toque llegue a
  // lo que hay debajo.
  useEffect(() => {
    if (!open) return;

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      setOpen(false);
      buttonRef.current?.focus();
    };
    const onPointerDown = (event: PointerEvent) => {
      if (!navRef.current?.contains(event.target as Node)) setOpen(false);
    };

    document.addEventListener("keydown", onKeyDown);
    document.addEventListener("pointerdown", onPointerDown);
    return () => {
      document.removeEventListener("keydown", onKeyDown);
      document.removeEventListener("pointerdown", onPointerDown);
    };
  }, [open]);

  return (
    <nav
      ref={navRef}
      className="bg-card shadow-card sticky top-3 z-50 rounded-full py-2.5 pr-2.5 pl-3"
    >
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <div className="group brand-glyph-intro bg-primary text-primary-foreground flex size-[38px] shrink-0 items-center justify-center rounded-[14px]">
            <BrandGlyph className="size-[20px]" />
          </div>
          <span className="text-sm font-medium tracking-[-0.01em] whitespace-nowrap">
            {brand}
          </span>
        </div>

        <div className="text-muted-foreground hidden items-center gap-6 text-[13px] md:flex">
          {links.map((link) => (
            <a
              key={link.href}
              href={link.href}
              className="hover:text-foreground transition-colors"
            >
              {link.label}
            </a>
          ))}
        </div>

        {/* Desktop: toggles + CTAs completos. */}
        <div className="hidden items-center gap-2 md:flex">
          <ThemeToggle variant="pill" />
          <Link
            href={otherLang.href}
            hrefLang={otherLang.hreflang}
            aria-label={otherLang.full}
            className={`${CTA_OUTLINE} px-3.5 py-2 font-mono text-[11px] tracking-[0.08em]`}
          >
            {otherLang.label}
          </Link>
          <a
            href={code.href}
            target="_blank"
            rel="noreferrer"
            className={`${CTA_OUTLINE} px-4 py-2 text-[13px]`}
          >
            {code.label}
            <ArrowUpRight className="size-[13px]" strokeWidth={2} />
          </a>
          <Link
            href={start.href}
            className={`${CTA_PRIMARY} px-[18px] py-2.5 text-[13px]`}
          >
            {start.label}
          </Link>
        </div>

        {/* Móvil: CTA compacta + hamburguesa. */}
        <div className="flex items-center gap-2 md:hidden">
          <Link
            href={start.href}
            className={`${CTA_PRIMARY} px-4 py-2 text-[13px] whitespace-nowrap`}
          >
            {start.label}
          </Link>
          <button
            ref={buttonRef}
            type="button"
            aria-label={menuLabel}
            aria-expanded={open}
            aria-controls={MENU_PANEL_ID}
            onClick={() => setOpen((value) => !value)}
            className={`${CTA_OUTLINE} size-[38px]`}
          >
            {open ? (
              <X className="size-4" strokeWidth={2} />
            ) : (
              <Menu className="size-4" strokeWidth={2} />
            )}
          </button>
        </div>
      </div>

      {/* Panel móvil: card flotante bajo la píldora. */}
      {open && (
        <div
          id={MENU_PANEL_ID}
          className="landing-menu-panel bg-card shadow-lift absolute inset-x-0 top-[calc(100%+8px)] flex flex-col gap-1 rounded-[22px] p-3 md:hidden"
        >
          {links.map((link) => (
            <a
              key={link.href}
              href={link.href}
              onClick={() => setOpen(false)}
              className="hover:bg-muted rounded-full px-4 py-2.5 text-sm font-medium transition-colors"
            >
              {link.label}
            </a>
          ))}
          <a
            href={code.href}
            target="_blank"
            rel="noreferrer"
            onClick={() => setOpen(false)}
            className="text-muted-foreground hover:bg-muted flex items-center gap-1.5 rounded-full px-4 py-2.5 text-sm transition-colors"
          >
            {code.label}
            <ArrowUpRight className="size-[13px]" strokeWidth={2} />
          </a>
          <div className="border-border mt-1 flex items-center gap-2 border-t px-1.5 pt-3 pb-1">
            <ThemeToggle variant="pill" />
            <Link
              href={otherLang.href}
              hrefLang={otherLang.hreflang}
              onClick={() => setOpen(false)}
              className={`${CTA_OUTLINE} px-3.5 py-2 font-mono text-[11px] tracking-[0.08em]`}
            >
              {otherLang.label} · {otherLang.full}
            </Link>
          </div>
        </div>
      )}
    </nav>
  );
}
