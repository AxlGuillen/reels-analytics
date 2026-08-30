"use client";

import { useEffect, useRef } from "react";
import {
  ActivityIcon,
  BlocksIcon,
  LayoutGridIcon,
  MessageCircleIcon,
  TrendingUpIcon,
} from "@animateicons/react/lucide";
import type { IconHandle } from "@/components/dashboard/sidebar";

/**
 * Icono animado para la landing (puente client sobre @animateicons: la página
 * es un server component y no puede pasar componentes como props, así que el
 * mapa nombre→icono vive aquí). Anima dos veces:
 *  - una sola vez al entrar al viewport (IntersectionObserver), para que los
 *    iconos "saluden" con el scroll;
 *  - en hover del propio tile.
 * No usa GSAP: no toca el contrato data-* ni la regla de imports de gsap.
 */

const ICONS = {
  activity: ActivityIcon,
  "trending-up": TrendingUpIcon,
  "layout-grid": LayoutGridIcon,
  "message-circle": MessageCircleIcon,
  blocks: BlocksIcon,
} as const;

export type LandingIconName = keyof typeof ICONS;

export function LandingIcon({
  name,
  size = 15,
  className,
}: {
  name: LandingIconName;
  size?: number;
  className?: string;
}) {
  const iconRef = useRef<IconHandle>(null);
  const spanRef = useRef<HTMLSpanElement>(null);
  const Icon = ICONS[name];

  // Saludo único al asomarse (respetar reduced-motion: sin observer).
  useEffect(() => {
    const el = spanRef.current;
    if (!el) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) {
          iconRef.current?.startAnimation();
          observer.disconnect();
        }
      },
      { threshold: 0.6 },
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  return (
    <span
      ref={spanRef}
      className={className}
      onMouseEnter={() => iconRef.current?.startAnimation()}
      onMouseLeave={() => iconRef.current?.stopAnimation()}
    >
      <Icon ref={iconRef} size={size} className="shrink-0" />
    </span>
  );
}
