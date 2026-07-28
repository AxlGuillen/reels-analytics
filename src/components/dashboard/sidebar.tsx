"use client";

import {
  useRef,
  useState,
  type ForwardRefExoticComponent,
  type RefAttributes,
} from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  ActivityIcon,
  AudioLinesIcon,
  BlocksIcon,
  InstagramIcon,
  LayersIcon,
  LayoutGridIcon,
  LinkIcon,
  MenuIcon,
  TrendingUpIcon,
} from "@animateicons/react/lucide";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";
import { LogoutButton } from "./logout-button";
import { ThemeToggle } from "./theme-toggle";

/** Handle imperativo que expone cada icono de AnimateIcons. */
export interface IconHandle {
  startAnimation: () => void;
  stopAnimation: () => void;
}

/** Forma común de un icono animado (subconjunto de props que usamos). */
type AnimatedIcon = ForwardRefExoticComponent<
  { size?: number; className?: string } & RefAttributes<IconHandle>
>;

/** Ref + handlers para animar un icono al hacer hover en toda su fila. */
function useHoverIcon() {
  const ref = useRef<IconHandle>(null);
  const hover = {
    onMouseEnter: () => ref.current?.startAnimation(),
    onMouseLeave: () => ref.current?.stopAnimation(),
  };
  return [ref, hover] as const;
}

export interface ConnectionStatus {
  tiktok: boolean;
  instagram: boolean;
}

/** Datos del creador para el avatar del rail / la cabecera del drawer. */
export interface UserInfo {
  name: string;
  email: string;
  initials: string;
}

interface NavItem {
  label: string;
  href: string;
  icon: AnimatedIcon;
  /** clave de estado de conexión a mostrar como punto. */
  status?: keyof ConnectionStatus;
}

/**
 * El rail no tiene títulos de grupo (es solo iconos), así que la navegación es
 * una lista plana. El orden es el del diseño: general → plataformas.
 */
const NAV: NavItem[] = [
  { label: "Overview", href: "/", icon: LayoutGridIcon },
  { label: "Crecimiento", href: "/growth", icon: TrendingUpIcon },
  { label: "Contenido", href: "/content", icon: LayersIcon },
  { label: "TikTok", href: "/tiktok", icon: AudioLinesIcon, status: "tiktok" },
  {
    label: "Instagram",
    href: "/instagram",
    icon: InstagramIcon,
    status: "instagram",
  },
];

/** Enlaces de ajustes, al pie del rail. */
const SETTINGS: NavItem[] = [
  { label: "Conexiones", href: "/settings/connections", icon: LinkIcon },
  { label: "MCP", href: "/settings/mcp", icon: BlocksIcon },
];

function isActive(pathname: string, href: string): boolean {
  if (href === "/") return pathname === "/";
  return pathname === href || pathname.startsWith(`${href}/`);
}

/**
 * Tile del rail: cuadrado de 38px con radio 14. El activo se marca solo con
 * fondo translúcido + icono a plena opacidad (el rail ya es oscuro; meterle
 * color rompería el monocromo del sistema).
 */
function railTile(active: boolean): string {
  return cn(
    "relative flex size-[38px] shrink-0 items-center justify-center rounded-[14px] transition-colors duration-150",
    active
      ? "bg-sidebar-accent text-sidebar-foreground"
      : "text-sidebar-foreground/40 hover:bg-sidebar-accent/60 hover:text-sidebar-foreground",
  );
}

/** Punto de conexión en la esquina del tile (el rail no tiene sitio para texto). */
function StatusDot({ connected }: { connected: boolean }) {
  return (
    <span
      className={cn(
        "absolute top-1.5 right-1.5 size-1.5 rounded-full",
        connected ? "bg-primary" : "bg-sidebar-foreground/25",
      )}
      aria-label={connected ? "conectada" : "sin conectar"}
    />
  );
}

function RailLink({
  item,
  status,
}: {
  item: NavItem;
  status: ConnectionStatus;
}) {
  const pathname = usePathname();
  const [iconRef, hover] = useHoverIcon();
  const Icon = item.icon;
  const active = isActive(pathname, item.href);

  return (
    <Link
      href={item.href}
      title={item.label}
      aria-label={item.label}
      aria-current={active ? "page" : undefined}
      className={railTile(active)}
      {...hover}
    >
      <Icon ref={iconRef} size={17} />
      {item.status && <StatusDot connected={status[item.status]} />}
    </Link>
  );
}

/**
 * Rail flotante de iconos (desktop). Columna oscura redondeada que flota sobre
 * el lienzo — la firma estructural de Acid Grid. Siempre es icon-only: el
 * diseño no contempla estado expandido, así que no hay toggle de colapso.
 */
export function DesktopSidebar({
  status,
  user,
}: {
  status: ConnectionStatus;
  user: UserInfo;
}) {
  const [brandRef, brandHover] = useHoverIcon();

  return (
    <aside className="hidden shrink-0 md:block">
      <div className="sticky top-5 flex h-[calc(100dvh-2.5rem)] w-[62px] flex-col items-center gap-1 rounded-[26px] bg-sidebar py-3 text-sidebar-foreground shadow-rail">
        <Link
          href="/"
          title="Reels Analytics"
          aria-label="Reels Analytics"
          className="mb-3 flex size-[38px] shrink-0 items-center justify-center rounded-[14px] bg-primary text-primary-foreground"
          {...brandHover}
        >
          <ActivityIcon ref={brandRef} size={18} />
        </Link>

        {NAV.map((item) => (
          <RailLink key={item.href} item={item} status={status} />
        ))}

        <div className="flex-1" />

        {SETTINGS.map((item) => (
          <RailLink key={item.href} item={item} status={status} />
        ))}

        <ThemeToggle variant="rail" />
        <LogoutButton variant="rail" />

        <span
          title={`${user.name} · ${user.email}`}
          className="mt-2 flex size-[34px] shrink-0 items-center justify-center rounded-full border-2 border-primary bg-sidebar-accent font-mono text-[11px] font-medium text-sidebar-foreground"
        >
          {user.initials}
        </span>
      </div>
    </aside>
  );
}

/**
 * Móvil: el rail no cabe, así que se mantiene barra superior + drawer con
 * etiquetas (el diseño solo cubre desktop).
 */
export function MobileNav({
  status,
  user,
}: {
  status: ConnectionStatus;
  user: UserInfo;
}) {
  const [open, setOpen] = useState(false);
  const close = () => setOpen(false);
  const pathname = usePathname();

  return (
    <div className="md:hidden">
      <header className="bg-background/90 sticky top-0 z-30 flex items-center gap-3 px-4 py-3 backdrop-blur">
        <button
          type="button"
          onClick={() => setOpen(true)}
          aria-label="Abrir menú"
          className="text-muted-foreground hover:text-foreground"
        >
          <MenuIcon size={20} />
        </button>
        <span className="bg-primary text-primary-foreground flex size-7 items-center justify-center rounded-[10px]">
          <ActivityIcon size={15} />
        </span>
        <span className="text-sm font-medium tracking-tight">Reels Analytics</span>
      </header>

      {open && (
        <div className="fixed inset-0 z-40">
          <div
            className="absolute inset-0 bg-foreground/50"
            onClick={close}
            aria-hidden
          />
          <div className="bg-sidebar text-sidebar-foreground absolute inset-y-0 left-0 flex w-64 flex-col gap-1 rounded-r-[26px] p-4">
            <div className="mb-3 flex items-center gap-2.5">
              <span className="bg-primary text-primary-foreground flex size-8 items-center justify-center rounded-[12px]">
                <ActivityIcon size={16} />
              </span>
              <span className="flex-1 text-sm font-medium">Reels Analytics</span>
              <button
                type="button"
                onClick={close}
                aria-label="Cerrar menú"
                className="text-sidebar-foreground/50 hover:text-sidebar-foreground"
              >
                <X className="size-5" />
              </button>
            </div>

            {[...NAV, ...SETTINGS].map((item) => {
              const active = isActive(pathname, item.href);
              const Icon = item.icon;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={close}
                  aria-current={active ? "page" : undefined}
                  className={cn(
                    "flex items-center gap-3 rounded-full px-3 py-2 text-sm transition-colors",
                    active
                      ? "bg-sidebar-accent text-sidebar-foreground font-medium"
                      : "text-sidebar-foreground/55 hover:text-sidebar-foreground",
                  )}
                >
                  <Icon size={18} className="shrink-0" />
                  {item.label}
                  {item.status && (
                    <span
                      className={cn(
                        "ml-auto size-1.5 rounded-full",
                        status[item.status]
                          ? "bg-primary"
                          : "bg-sidebar-foreground/25",
                      )}
                    />
                  )}
                </Link>
              );
            })}

            <div className="mt-auto flex items-center gap-2.5 pt-3">
              <span className="border-primary bg-sidebar-accent flex size-9 shrink-0 items-center justify-center rounded-full border-2 font-mono text-[11px]">
                {user.initials}
              </span>
              <div className="min-w-0 flex-1">
                <div className="truncate text-[12.5px] leading-tight font-medium">
                  {user.name}
                </div>
                <div className="text-sidebar-foreground/50 truncate font-mono text-[10.5px] leading-tight">
                  {user.email}
                </div>
              </div>
              <ThemeToggle variant="rail" />
              <LogoutButton variant="rail" />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
