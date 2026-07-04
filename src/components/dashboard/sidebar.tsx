"use client";

import { useState, useSyncExternalStore } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Activity,
  Camera,
  ChevronLeft,
  ChevronRight,
  LayoutDashboard,
  Menu,
  Music2,
  Plug,
  TrendingUp,
  X,
  type LucideIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";

export interface ConnectionStatus {
  tiktok: boolean;
  instagram: boolean;
}

interface NavItem {
  label: string;
  href: string;
  icon: LucideIcon;
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
      { label: "Overview", href: "/", icon: LayoutDashboard },
      { label: "Crecimiento", href: "/growth", icon: TrendingUp, soon: true },
    ],
  },
  {
    title: "plataformas",
    items: [
      { label: "TikTok", href: "/tiktok", icon: Music2, status: "tiktok" },
      { label: "Instagram", href: "/instagram", icon: Camera, status: "instagram" },
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
        connected ? "bg-green-500" : "bg-border",
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
        <Icon className="size-[18px] shrink-0" />
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
    >
      <Icon className="size-[18px] shrink-0" />
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
      >
        <Activity className="text-primary size-5 shrink-0" />
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
        >
          <Plug className="size-[18px] shrink-0" />
          {!collapsed && "Conexiones"}
        </Link>

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
          >
            {collapsed ? (
              <ChevronRight className="size-[18px] shrink-0" />
            ) : (
              <>
                <ChevronLeft className="size-[18px] shrink-0" />
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
          <Menu className="size-5" />
        </button>
        <div className="flex items-center gap-2">
          <Activity className="text-primary size-5" />
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
