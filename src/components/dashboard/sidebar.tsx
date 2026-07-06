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
  LogoutIcon,
  MenuIcon,
  TrendingUpIcon,
} from "@animateicons/react/lucide";
import { X } from "lucide-react";
import { signOutAction } from "@/app/login/actions";
import { cn } from "@/lib/utils";
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

/** Estilo base compartido por links y botones del nav. */
function rowClass(active: boolean, collapsed: boolean): string {
  return cn(
    "flex items-center gap-3 rounded-md px-3 py-2 text-sm transition-colors",
    collapsed && "justify-center px-0",
    active
      ? "bg-primary/15 text-primary"
      : "text-muted-foreground hover:bg-muted hover:text-foreground",
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
  collapsed,
  onToggle,
  onNavigate,
}: {
  status: ConnectionStatus;
  collapsed: boolean;
  onToggle?: () => void;
  onNavigate?: () => void;
}) {
  const pathname = usePathname();
  const connectionsActive = isActive(pathname, "/settings/connections");
  const [brandRef, brandHover] = useHoverIcon();
  const [connRef, connHover] = useHoverIcon();
  const [logoutRef, logoutHover] = useHoverIcon();
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
        <ActivityIcon ref={brandRef} size={20} className="text-primary shrink-0" />
        {!collapsed && (
          <span className="font-display text-sm tracking-wide">Reels Analytics</span>
        )}
      </Link>

      {GROUPS.map((group) => (
        <div key={group.title} className="mt-2">
          {!collapsed && (
            <div className="text-muted-foreground/60 px-3 pb-1 text-[11px] tracking-wide">
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

        <ThemeToggle collapsed={collapsed} />

        <form action={signOutAction}>
          <button
            type="submit"
            aria-label="Cerrar sesión"
            title={collapsed ? "Cerrar sesión" : undefined}
            className={cn(
              "text-muted-foreground hover:bg-muted hover:text-foreground flex w-full items-center gap-3 rounded-md px-3 py-2 text-sm transition-colors",
              collapsed && "justify-center px-0",
            )}
            {...logoutHover}
          >
            <LogoutIcon ref={logoutRef} size={18} className="shrink-0" />
            {!collapsed && "Cerrar sesión"}
          </button>
        </form>

        {onToggle && (
          <button
            type="button"
            onClick={onToggle}
            aria-label={collapsed ? "Expandir menú" : "Colapsar menú"}
            title={collapsed ? "Expandir" : undefined}
            className={cn(
              "text-muted-foreground hover:bg-muted hover:text-foreground flex w-full items-center gap-3 rounded-md px-3 py-2 text-sm transition-colors",
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
export function DesktopSidebar({ status }: { status: ConnectionStatus }) {
  const [collapsed, toggle] = useCollapsed();

  return (
    <aside
      className={cn(
        "bg-card/40 hidden shrink-0 border-r transition-[width] duration-200 md:block",
        collapsed ? "w-16" : "w-60",
      )}
    >
      <div className="sticky top-0 h-dvh">
        <SidebarNav status={status} collapsed={collapsed} onToggle={toggle} />
      </div>
    </aside>
  );
}

/** Barra superior con menú desplegable en móvil (oculta en desktop). */
export function MobileNav({ status }: { status: ConnectionStatus }) {
  const [open, setOpen] = useState(false);
  const close = () => setOpen(false);

  return (
    <div className="md:hidden">
      <header className="bg-card/40 sticky top-0 z-30 flex items-center gap-3 border-b px-4 py-3">
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
          <div className="bg-card absolute inset-y-0 left-0 w-64 border-r">
            <button
              type="button"
              onClick={close}
              aria-label="Cerrar menú"
              className="text-muted-foreground hover:text-foreground absolute top-3 right-3"
            >
              <X className="size-5" />
            </button>
            <SidebarNav status={status} collapsed={false} onNavigate={close} />
          </div>
        </div>
      )}
    </div>
  );
}
