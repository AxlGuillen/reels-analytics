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
  ActivityIcon,
  AudioLinesIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  InstagramIcon,
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

/** Datos del creador para la tarjeta del footer del sidebar. */
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
  /** deshabilitado: ruta aún no disponible (se explica, no se oculta). */
  soon?: boolean;
}

interface NavGroup {
  title: string;
  items: NavItem[];
}

const GROUPS: NavGroup[] = [
  {
    title: "general",
    items: [
      { label: "Overview", href: "/", icon: LayoutGridIcon },
      { label: "Crecimiento", href: "/growth", icon: TrendingUpIcon },
    ],
  },
  {
    title: "plataformas",
    items: [
      { label: "TikTok", href: "/tiktok", icon: AudioLinesIcon, status: "tiktok" },
      { label: "Instagram", href: "/instagram", icon: InstagramIcon, status: "instagram" },
    ],
  },
];

function isActive(pathname: string, href: string): boolean {
  if (href === "/") return pathname === "/";
  return pathname === href || pathname.startsWith(`${href}/`);
}

function StatusDot({ connected }: { connected: boolean }) {
  return (
    <span
      className={cn(
        "ml-auto size-2 rounded-full",
        connected ? "bg-success" : "bg-border",
      )}
      aria-label={connected ? "conectada" : "sin conectar"}
    />
  );
}

/**
 * Estilo base compartido por links y botones del nav. El activo lleva triple
 * jerarquía: barra indicadora (pseudo-elemento), fondo tenue y color primario.
 */
function rowClass(active: boolean, collapsed: boolean): string {
  return cn(
    "relative flex items-center gap-3 rounded-md px-3 py-2 text-sm transition-colors duration-150",
    collapsed && "justify-center px-0",
    active
      ? "bg-primary/10 text-primary font-medium before:absolute before:left-0 before:top-1/2 before:h-5 before:w-0.5 before:-translate-y-1/2 before:rounded-full before:bg-primary"
      : "text-muted-foreground hover:bg-sidebar-accent hover:text-foreground",
  );
}

function NavLink({
  item,
  status,
  collapsed,
  onNavigate,
}: {
  item: NavItem;
  status: ConnectionStatus;
  collapsed: boolean;
  onNavigate?: () => void;
}) {
  const pathname = usePathname();
  const [iconRef, hover] = useHoverIcon();
  const Icon = item.icon;

  if (item.soon) {
    return (
      <div
        className={cn(
          "text-muted-foreground/50 flex cursor-default items-center gap-3 rounded-md px-3 py-2 text-sm",
          collapsed && "justify-center px-0",
        )}
        title="Disponible al persistir snapshots históricos"
      >
        <Icon size={18} className="shrink-0" />
        {!collapsed && (
          <>
            {item.label}
            <span className="ml-auto text-[10px] tracking-wide uppercase">pronto</span>
          </>
        )}
      </div>
    );
  }

  const active = isActive(pathname, item.href);
  return (
    <Link
      href={item.href}
      onClick={onNavigate}
      aria-current={active ? "page" : undefined}
      title={collapsed ? item.label : undefined}
      className={rowClass(active, collapsed)}
      {...hover}
    >
      <Icon ref={iconRef} size={18} className="shrink-0" />
      {!collapsed && (
        <>
          {item.label}
          {item.status && <StatusDot connected={status[item.status]} />}
        </>
      )}
    </Link>
  );
}

function SidebarNav({
  status,
  user,
  collapsed,
  onToggle,
  onNavigate,
}: {
  status: ConnectionStatus;
  user: UserInfo;
  collapsed: boolean;
  onToggle?: () => void;
  onNavigate?: () => void;
}) {
  const pathname = usePathname();
  const connectionsActive = isActive(pathname, "/settings/connections");
  const [brandRef, brandHover] = useHoverIcon();
  const [connRef, connHover] = useHoverIcon();
  const [collapseRef, collapseHover] = useHoverIcon();

  return (
    <div className="flex h-full flex-col gap-1 p-3">
      <Link
        href="/"
        onClick={onNavigate}
        title={collapsed ? "Reels Analytics" : undefined}
        className={cn(
          "mb-3 flex items-center gap-2 px-2 py-1",
          collapsed && "justify-center px-0",
        )}
        {...brandHover}
      >
        <span className="bg-foreground flex size-8 shrink-0 items-center justify-center rounded-lg">
          <ActivityIcon ref={brandRef} size={17} className="text-primary" />
        </span>
        {!collapsed && (
          <span className="font-display text-sm tracking-wide">Reels Analytics</span>
        )}
      </Link>

      {GROUPS.map((group) => (
        <div key={group.title} className="mt-2">
          {!collapsed && (
            <div className="text-muted-foreground/70 px-3 pb-1.5 text-[10px] font-medium tracking-widest uppercase">
              {group.title}
            </div>
          )}
          {group.items.map((item) => (
            <NavLink
              key={item.label}
              item={item}
              status={status}
              collapsed={collapsed}
              onNavigate={onNavigate}
            />
          ))}
        </div>
      ))}

      <div className="mt-auto space-y-1 border-t pt-2">
        <Link
          href="/settings/connections"
          onClick={onNavigate}
          aria-current={connectionsActive ? "page" : undefined}
          title={collapsed ? "Conexiones" : undefined}
          className={rowClass(connectionsActive, collapsed)}
          {...connHover}
        >
          <LinkIcon ref={connRef} size={18} className="shrink-0" />
          {!collapsed && "Conexiones"}
        </Link>

        {collapsed ? (
          <ThemeToggle collapsed />
        ) : (
          <div className="border-border/70 bg-background/50 mt-1 flex items-center gap-2.5 rounded-md border px-2.5 py-2">
            <span className="bg-foreground text-primary font-display flex size-8 shrink-0 items-center justify-center rounded-md text-xs font-semibold">
              {user.initials}
            </span>
            <div className="min-w-0 flex-1">
              <div className="truncate text-[12.5px] leading-tight font-semibold">
                {user.name}
              </div>
              <div className="text-muted-foreground truncate font-mono text-[10.5px] leading-tight">
                {user.email}
              </div>
            </div>
            <ThemeToggle variant="icon" />
          </div>
        )}

        <LogoutButton collapsed={collapsed} />

        {onToggle && (
          <button
            type="button"
            onClick={onToggle}
            aria-label={collapsed ? "Expandir menú" : "Colapsar menú"}
            title={collapsed ? "Expandir" : undefined}
            className={cn(
              "text-muted-foreground hover:bg-sidebar-accent hover:text-foreground flex w-full items-center gap-3 rounded-md px-3 py-2 text-sm transition-colors duration-150",
              collapsed && "justify-center px-0",
            )}
            {...collapseHover}
          >
            {collapsed ? (
              <ChevronRightIcon ref={collapseRef} size={18} className="shrink-0" />
            ) : (
              <>
                <ChevronLeftIcon ref={collapseRef} size={18} className="shrink-0" />
                Colapsar
              </>
            )}
          </button>
        )}
      </div>
    </div>
  );
}

const COLLAPSE_KEY = "sidebar-collapsed";
const COLLAPSE_EVENT = "sidebar-collapsed-change";

function subscribeCollapsed(callback: () => void) {
  window.addEventListener(COLLAPSE_EVENT, callback);
  window.addEventListener("storage", callback);
  return () => {
    window.removeEventListener(COLLAPSE_EVENT, callback);
    window.removeEventListener("storage", callback);
  };
}

/** Estado colapsado leído de localStorage (external store, sin flash de hidratación). */
function useCollapsed(): [boolean, () => void] {
  const collapsed = useSyncExternalStore(
    subscribeCollapsed,
    () => localStorage.getItem(COLLAPSE_KEY) === "1",
    () => false,
  );
  const toggle = () => {
    localStorage.setItem(COLLAPSE_KEY, collapsed ? "0" : "1");
    window.dispatchEvent(new Event(COLLAPSE_EVENT));
  };
  return [collapsed, toggle];
}

/** Columna persistente en desktop (oculta en móvil). Colapsable a rail de iconos. */
export function DesktopSidebar({
  status,
  user,
}: {
  status: ConnectionStatus;
  user: UserInfo;
}) {
  const [collapsed, toggle] = useCollapsed();

  return (
    <aside
      className={cn(
        "bg-sidebar text-sidebar-foreground shadow-rail hidden shrink-0 border-r transition-[width] duration-200 md:block",
        collapsed ? "w-16" : "w-60",
      )}
    >
      <div className="sticky top-0 h-dvh">
        <SidebarNav
          status={status}
          user={user}
          collapsed={collapsed}
          onToggle={toggle}
        />
      </div>
    </aside>
  );
}

/** Barra superior con menú desplegable en móvil (oculta en desktop). */
export function MobileNav({
  status,
  user,
}: {
  status: ConnectionStatus;
  user: UserInfo;
}) {
  const [open, setOpen] = useState(false);
  const close = () => setOpen(false);

  return (
    <div className="md:hidden">
      <header className="bg-sidebar/95 shadow-card sticky top-0 z-30 flex items-center gap-3 border-b px-4 py-3 backdrop-blur">
        <button
          type="button"
          onClick={() => setOpen(true)}
          aria-label="Abrir menú"
          className="text-muted-foreground hover:text-foreground"
        >
          <MenuIcon size={20} />
        </button>
        <div className="flex items-center gap-2">
          <ActivityIcon size={20} className="text-primary" />
          <span className="font-display text-sm tracking-wide">Reels Analytics</span>
        </div>
      </header>

      {open && (
        <div className="fixed inset-0 z-40">
          <div className="absolute inset-0 bg-black/50" onClick={close} aria-hidden />
          <div className="bg-sidebar shadow-rail absolute inset-y-0 left-0 w-64 border-r">
            <button
              type="button"
              onClick={close}
              aria-label="Cerrar menú"
              className="text-muted-foreground hover:text-foreground absolute top-3 right-3"
            >
              <X className="size-5" />
            </button>
            <SidebarNav
              status={status}
              user={user}
              collapsed={false}
              onNavigate={close}
            />
          </div>
        </div>
      )}
    </div>
  );
}
