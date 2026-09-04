"use client";

import {
  useRef,
  useState,
  useSyncExternalStore,
  type ForwardRefExoticComponent,
  type RefAttributes,
} from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  AudioLinesIcon,
  BlocksIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  GitCommitVerticalIcon,
  InstagramIcon,
  LayersIcon,
  LayoutGridIcon,
  LinkIcon,
  MenuIcon,
  TrendingUpIcon,
} from "@animateicons/react/lucide";
import { CircleHelp, X } from "lucide-react";
import { BrandGlyph } from "@/components/brand-mark";
import { cn } from "@/lib/utils";
import { runTour } from "@/components/tour/run-tour";
import { tourRouteFor } from "@/components/tour/steps";
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
  { label: "Historia", href: "/historia", icon: GitCommitVerticalIcon },
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
 * Fila/tile del rail. Colapsado: cuadrado de 38px solo-icono con radio 14.
 * Expandido: fila completa con etiqueta. El activo se marca solo con fondo
 * translúcido + contenido a plena opacidad (el rail ya es oscuro; meterle
 * color rompería el monocromo del sistema).
 */
function railRow(active: boolean, collapsed: boolean): string {
  return cn(
    "relative flex h-[38px] shrink-0 items-center rounded-[14px] transition-colors duration-150",
    collapsed ? "w-[38px] justify-center" : "w-full gap-3 px-2.5",
    active
      ? "bg-sidebar-accent text-sidebar-foreground"
      : "text-sidebar-foreground/40 hover:bg-sidebar-accent/60 hover:text-sidebar-foreground",
  );
}

/** Punto de conexión: en la esquina del tile (colapsado) o al final de la fila. */
function StatusDot({
  connected,
  collapsed,
}: {
  connected: boolean;
  collapsed: boolean;
}) {
  return (
    <span
      className={cn(
        "rounded-full",
        collapsed ? "absolute top-1.5 right-1.5 size-1.5" : "ml-auto size-1.5",
        connected ? "bg-primary" : "bg-sidebar-foreground/25",
      )}
      aria-label={connected ? "conectada" : "sin conectar"}
    />
  );
}

function RailLink({
  item,
  status,
  collapsed,
}: {
  item: NavItem;
  status: ConnectionStatus;
  collapsed: boolean;
}) {
  const pathname = usePathname();
  const [iconRef, hover] = useHoverIcon();
  const Icon = item.icon;
  const active = isActive(pathname, item.href);

  return (
    <Link
      href={item.href}
      title={collapsed ? item.label : undefined}
      aria-current={active ? "page" : undefined}
      className={railRow(active, collapsed)}
      {...hover}
    >
      <Icon ref={iconRef} size={17} className="shrink-0" />
      {!collapsed && <span className="truncate text-[13px]">{item.label}</span>}
      {item.status && (
        <StatusDot connected={status[item.status]} collapsed={collapsed} />
      )}
    </Link>
  );
}

/**
 * Botón de ayuda: relanza el tour guiado de la ruta actual (el auto-start solo
 * corre la primera visita; esto es el "volver a ver"). Se oculta en rutas sin
 * tour registrado.
 */
function TourButton({ expanded }: { expanded: boolean }) {
  const pathname = usePathname();
  const route = tourRouteFor(pathname);
  if (!route) return null;

  return (
    <button
      type="button"
      onClick={() => void runTour(route)}
      aria-label="Guía de esta pantalla"
      title={expanded ? undefined : "Guía de esta pantalla"}
      className={cn(
        "text-sidebar-foreground/40 hover:bg-sidebar-accent/60 hover:text-sidebar-foreground flex h-[38px] shrink-0 items-center rounded-[14px] transition-colors duration-150",
        expanded ? "w-full gap-3 px-2.5" : "w-[38px] justify-center",
      )}
    >
      <CircleHelp className="size-[17px] shrink-0" />
      {expanded && <span className="truncate text-[13px]">Guía</span>}
    </button>
  );
}

const COLLAPSE_KEY = "rail-collapsed";
const COLLAPSE_EVENT = "rail-collapsed-change";

function subscribeCollapsed(callback: () => void) {
  window.addEventListener(COLLAPSE_EVENT, callback);
  window.addEventListener("storage", callback);
  return () => {
    window.removeEventListener(COLLAPSE_EVENT, callback);
    window.removeEventListener("storage", callback);
  };
}

/**
 * Preferencia de rail colapsado, leída de localStorage (external store, sin
 * flash de hidratación). Default: COLAPSADO — el icon-rail es el canon del
 * diseño; expandirlo es la preferencia que se recuerda.
 */
function useCollapsed(): [boolean, () => void] {
  const collapsed = useSyncExternalStore(
    subscribeCollapsed,
    () => localStorage.getItem(COLLAPSE_KEY) !== "0",
    () => true,
  );
  const toggle = () => {
    localStorage.setItem(COLLAPSE_KEY, collapsed ? "0" : "1");
    window.dispatchEvent(new Event(COLLAPSE_EVENT));
  };
  return [collapsed, toggle];
}

/**
 * Rail flotante (desktop). Columna oscura redondeada que flota sobre el lienzo
 * — la firma estructural de Acid Grid. Dos estados: colapsado (62px, icon-only,
 * el canon del canvas) y expandido (218px, con etiquetas). El toggle vive al
 * pie, en el sitio estándar, y la preferencia persiste en localStorage.
 */
export function DesktopSidebar({
  status,
  user,
}: {
  status: ConnectionStatus;
  user: UserInfo;
}) {
  const [collapsed, toggle] = useCollapsed();
  const [collapseRef, collapseHover] = useHoverIcon();

  return (
    <aside className="hidden shrink-0 md:block">
      <div
        className={cn(
          "sticky top-5 flex h-[calc(100dvh-2.5rem)] flex-col gap-1 rounded-[26px] bg-sidebar py-3 text-sidebar-foreground shadow-rail transition-[width] duration-200 motion-reduce:transition-none",
          collapsed ? "w-[62px] items-center" : "w-[218px] px-3",
        )}
      >
        <Link
          href="/"
          title={collapsed ? "Reels Analytics" : undefined}
          aria-label="Reels Analytics"
          className={cn(
            "mb-3 flex shrink-0 items-center",
            !collapsed && "w-full gap-2.5 px-0.5",
          )}
        >
          <span className="group bg-primary text-primary-foreground flex size-[38px] shrink-0 items-center justify-center rounded-[14px]">
            <BrandGlyph className="size-[20px]" />
          </span>
          {!collapsed && (
            <span className="truncate text-[13px] font-medium tracking-[-0.01em]">
              Reels Analytics
            </span>
          )}
        </Link>

        {NAV.map((item) => (
          <RailLink
            key={item.href}
            item={item}
            status={status}
            collapsed={collapsed}
          />
        ))}

        <div className="flex-1" />

        {SETTINGS.map((item) => (
          <RailLink
            key={item.href}
            item={item}
            status={status}
            collapsed={collapsed}
          />
        ))}

        <TourButton expanded={!collapsed} />
        <ThemeToggle variant="rail" expanded={!collapsed} />
        <LogoutButton variant="rail" expanded={!collapsed} />

        <button
          type="button"
          onClick={toggle}
          aria-expanded={!collapsed}
          aria-label={collapsed ? "Expandir menú" : "Colapsar menú"}
          title={collapsed ? "Expandir menú" : undefined}
          className={railRow(false, collapsed)}
          {...collapseHover}
        >
          {collapsed ? (
            <ChevronRightIcon ref={collapseRef} size={17} className="shrink-0" />
          ) : (
            <>
              <ChevronLeftIcon ref={collapseRef} size={17} className="shrink-0" />
              <span className="truncate text-[13px]">Colapsar</span>
            </>
          )}
        </button>

        {collapsed ? (
          <span
            title={`${user.name} · ${user.email}`}
            className="border-primary bg-sidebar-accent mt-2 flex size-[34px] shrink-0 items-center justify-center rounded-full border-2 font-mono text-[11px] font-medium"
          >
            {user.initials}
          </span>
        ) : (
          <div className="mt-2 flex w-full shrink-0 items-center gap-2.5 px-0.5">
            <span className="border-primary bg-sidebar-accent flex size-[34px] shrink-0 items-center justify-center rounded-full border-2 font-mono text-[11px] font-medium">
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
          </div>
        )}
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
        <span className="group bg-primary text-primary-foreground flex size-7 items-center justify-center rounded-[10px]">
          <BrandGlyph className="size-[16px]" />
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
              <span className="group bg-primary text-primary-foreground flex size-8 items-center justify-center rounded-[12px]">
                <BrandGlyph className="size-[17px]" />
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
              <TourButton expanded={false} />
              <ThemeToggle variant="rail" />
              <LogoutButton variant="rail" />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
