import Link from "next/link";
import {
  ArrowUpRight,
  AudioLines,
  BarChart3,
  Eye,
  Layers,
  MessageCircle,
  Sparkle,
  UserPlus,
} from "lucide-react";
// lucide v1 quitó los iconos de marca; el de Instagram vive en animateicons.
import { InstagramIcon } from "@animateicons/react/lucide";
import { PeriodNav } from "@/components/dashboard/period-nav";
import { Suspense } from "react";
import { PageTour } from "@/components/tour/page-tour";
import { dayKey } from "@/core/lib/datetime";
import { CREATOR_TIMEZONE } from "@/modules/analytics/insights";
import { resolvePeriod } from "@/modules/analytics/period";
import { OverviewBodySkeleton } from "./overview-skeleton";
import { FreshPeriodNotice } from "./fresh-period-notice";
import { formatCount, formatPercent } from "@/core/lib/format";
import { contentHref, type ContentTypeKey } from "@/core/lib/content-type";
import { AccountSelector } from "@/components/dashboard/account-selector";
import type { ReadGrowthOptions } from "@/modules/analytics/history";
import {
  readOverviewSummary,
  type AccountBreakdown,
  type OverviewSummary,
  type SubBucketMetrics,
} from "@/modules/analytics/overview";
import { getAccountScope, selectorProps } from "./account-scope";

/** Tile de icono de 26px que encabeza cada card (motivo del sistema). */
function IconTile({
  children,
  tone = "muted",
}: {
  children: React.ReactNode;
  tone?: "muted" | "onAccent" | "onDark";
}) {
  return (
    <span
      className={
        tone === "muted"
          ? "bg-muted text-muted-foreground flex size-[26px] items-center justify-center rounded-[9px]"
          : tone === "onAccent"
            ? "bg-foreground/10 text-foreground flex size-[26px] items-center justify-center rounded-[9px]"
            : "bg-background/10 text-background flex size-[26px] items-center justify-center rounded-[9px]"
      }
    >
      {children}
    </span>
  );
}

/**
 * Barras cápsula de progreso del periodo: llenas los sub-buckets ya
 * transcurridos, punteadas los que faltan. Comunica "vas por aquí".
 */
function ProgressCapsules({
  buckets,
  tone,
}: {
  buckets: SubBucketMetrics[];
  tone: "onCard" | "onAccent";
}) {
  return (
    <div className="mt-4 flex gap-1.5">
      {buckets.map((b) => {
        const elapsed = b.combined.views > 0 || b.combined.videosPublished > 0;
        return (
          <div
            key={b.key}
            className={
              elapsed
                ? tone === "onAccent"
                  ? "bg-foreground h-9 flex-1 rounded-[9px]"
                  : "bg-foreground h-9 flex-1 rounded-[9px]"
                : tone === "onAccent"
                  ? "border-foreground/30 h-9 flex-1 rounded-[9px] border border-dashed"
                  : "border-muted-foreground/40 h-9 flex-1 rounded-[9px] border border-dashed"
            }
          />
        );
      })}
    </div>
  );
}

const CHART_H = 176;

/**
 * Gráfica de barras cápsula: cada barra es la cápsula oscura (TikTok) con el
 * segmento lima (Instagram) apilado al pie. Se resalta el sub-bucket líder.
 */
function StatsChart({ buckets }: { buckets: SubBucketMetrics[] }) {
  const max = Math.max(1, ...buckets.map((b) => b.combined.views));
  const topKey = buckets.reduce(
    (best, b) => (b.combined.views > (best?.combined.views ?? -1) ? b : best),
    buckets[0],
  )?.key;

  return (
    <div className="flex h-[214px] items-end pt-3">
      <div className="text-muted-foreground/70 flex h-[176px] w-9 flex-col justify-between pr-2.5 text-right font-mono text-[9px]">
        {[1, 0.8, 0.6, 0.4, 0.2, 0].map((f) => (
          <span key={f}>{f === 0 ? "0" : formatCount(Math.round(max * f))}</span>
        ))}
      </div>

      <div className="relative flex h-[176px] flex-1 items-end justify-around gap-2">
        <div
          className="pointer-events-none absolute inset-x-0 top-0 bottom-5"
          style={{
            backgroundImage:
              "linear-gradient(to bottom, color-mix(in oklab, var(--foreground) 7%, transparent) 1px, transparent 1px)",
            backgroundSize: "100% 31.2px",
          }}
          aria-hidden
        />
        {buckets.map((b) => {
          const total = Math.max(0, b.combined.views);
          const ig = Math.max(0, b.instagram.views);
          const h = Math.max(total > 0 ? 10 : 4, (total / max) * CHART_H);
          const igH = total > 0 ? Math.min(h - 6, (ig / max) * CHART_H) : 0;
          const isTop = b.key === topKey && total > 0;

          return (
            <div
              key={b.key}
              className="relative flex h-full flex-1 flex-col items-center justify-end"
            >
              {isTop && (
                <div className="bg-foreground text-background absolute top-3 right-0.5 rounded-full px-2 py-0.5 font-mono text-[10px]">
                  {formatCount(total)}
                </div>
              )}
              <div
                className={
                  isTop
                    ? "bg-foreground flex w-[26px] flex-col justify-end rounded-full p-[3px] outline-1 outline-dashed outline-muted-foreground/40 outline-offset-[5px]"
                    : "bg-foreground flex w-[26px] flex-col justify-end rounded-full p-[3px]"
                }
                style={{ height: h }}
                title={`${b.label}: ${formatCount(total)} vistas`}
              >
                {igH > 0 && (
                  // En oscuro la cápsula se invierte a crema: el segmento IG
                  // pasa a tinta para conservar el contraste interno.
                  <div
                    className="bg-primary dark:bg-background w-full rounded-full"
                    style={{ height: igH }}
                  />
                )}
              </div>
              <span
                className={
                  isTop
                    ? "text-foreground mt-2 text-[10px] font-medium"
                    : "text-muted-foreground mt-2 text-[10px]"
                }
              >
                {b.label}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

/** Barras horizontales cápsula por tipo de contenido. */
function TypeBars({ types }: { types: OverviewSummary["contentTypes"] }) {
  const sorted = [...types].sort((a, b) => b.totalViews - a.totalViews);
  const max = Math.max(1, ...sorted.map((t) => t.totalViews));
  // Escala monocroma + lima: el 2.º puesto es el acento, el resto se apaga.
  // El 4.º tono era bg-border: invisible sobre el track en ambos temas (1.08/1.3).
  const fill = ["bg-foreground", "bg-primary", "bg-muted-foreground", "bg-muted-foreground/50"];

  return (
    <div className="flex flex-col">
      {sorted.map((t, i) => (
        <Link
          key={String(t.key)}
          href={contentHref(t.key as ContentTypeKey | null)}
          className="hover:bg-muted/60 -mx-2 flex items-center gap-3 rounded-full px-2 py-2.5 transition-colors"
        >
          <span className="text-muted-foreground w-[74px] shrink-0 truncate text-[12.5px]">
            {t.label}
          </span>
          <span className="bg-muted h-4 flex-1 overflow-hidden rounded-full">
            <span
              className={`block h-full rounded-full ${fill[Math.min(i, fill.length - 1)]}`}
              style={{ width: `${Math.max(4, (t.totalViews / max) * 100)}%` }}
            />
          </span>
          <span className="w-[56px] shrink-0 text-right font-mono text-[11px] tabular-nums">
            {formatCount(t.totalViews)}
          </span>
        </Link>
      ))}
    </div>
  );
}

/** Card pequeña de plataforma (columna derecha). */
function PlatformCard({
  href,
  icon,
  name,
  views,
}: {
  href: string;
  icon: React.ReactNode;
  name: string;
  views: number;
}) {
  return (
    <Link
      href={href}
      className="bg-card shadow-card hover:shadow-lift flex h-[88px] flex-col justify-between rounded-[20px] p-3.5 transition-shadow"
    >
      <IconTile>{icon}</IconTile>
      <span className="text-[12.5px] font-medium">
        {name}
        <span className="text-muted-foreground block font-mono text-[10px] font-normal">
          {formatCount(views)} vistas
        </span>
      </span>
    </Link>
  );
}

/**
 * Desglose por cuenta del periodo: la tabla del reporte mensual. Solo en
 * "todas las cuentas" — con una sola, la tabla repetiría los KPIs. Sus filas
 * salen de la misma lista que el total (`aggregateAccounts`), así que la fila
 * de total siempre cuadra con las cards de arriba.
 */
function AccountBreakdownCard({
  rows,
  total,
}: {
  rows: AccountBreakdown[];
  total: OverviewSummary["combined"];
}) {
  const engagement = (likes: number, comments: number, views: number) =>
    views > 0 ? formatPercent((likes + comments) / views) : "—";
  const followers = (v: number | null) =>
    v === null ? "—" : `${v >= 0 ? "+" : ""}${formatCount(v)}`;

  return (
    <section
      data-tour="desglose"
      className="bg-card shadow-card mt-3.5 rounded-lg p-[18px]"
    >
      <div className="mb-3 text-[15px] font-medium tracking-[-0.01em]">
        Desglose por cuenta
      </div>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[520px] text-[13px]">
          <thead>
            <tr className="text-muted-foreground text-left font-mono text-[10.5px] tracking-wider uppercase">
              <th className="pb-2 font-normal">Cuenta</th>
              <th className="pb-2 text-right font-normal">Vistas ganadas</th>
              <th className="pb-2 text-right font-normal">Seguidores</th>
              <th className="pb-2 text-right font-normal">Publicados</th>
              <th className="pb-2 text-right font-normal">Engagement</th>
            </tr>
          </thead>
          <tbody className="tabular-nums">
            {rows.map((r) => (
              <tr key={r.accountId} className="border-border border-t">
                <td className="py-2.5">
                  <span className="flex items-center gap-2">
                    <span className="font-medium">
                      {r.handle ? `@${r.handle}` : "cuenta nueva"}
                    </span>
                    <span className="text-muted-foreground font-mono text-[10.5px]">
                      {r.platform === "tiktok" ? "TikTok" : "Instagram"}
                    </span>
                    {r.isPrimary && (
                      <span className="bg-primary text-primary-foreground rounded-full px-2 py-[1px] text-[9.5px] font-semibold tracking-wider uppercase">
                        principal
                      </span>
                    )}
                  </span>
                </td>
                <td className="py-2.5 text-right">{formatCount(r.metrics.views)}</td>
                <td className="py-2.5 text-right">{followers(r.followersGained)}</td>
                <td className="py-2.5 text-right">{r.metrics.videosPublished}</td>
                <td className="text-muted-foreground py-2.5 text-right">
                  {engagement(r.metrics.likes, r.metrics.comments, r.metrics.views)}
                </td>
              </tr>
            ))}
            <tr className="border-foreground/80 border-t-2 font-medium">
              <td className="pt-2.5">Total</td>
              <td className="pt-2.5 text-right">{formatCount(total.views)}</td>
              <td className="pt-2.5 text-right">{followers(total.followersGained)}</td>
              <td className="pt-2.5 text-right">{total.videosPublished}</td>
              <td className="pt-2.5 text-right">
                {engagement(total.likes, total.comments, total.views)}
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </section>
  );
}

function PageShell({ children }: { children: React.ReactNode }) {
  return <div className="w-full px-4 py-6 md:px-1">{children}</div>;
}

export default async function OverviewPage({
  searchParams,
}: {
  searchParams: Promise<{ period?: string; anchor?: string }>;
}) {
  const sp = await searchParams;
  const granularity = sp.period === "month" ? "month" : "week";
  // Resolución PURA del periodo (sin BD): el header y el PeriodNav se pintan
  // al instante; solo el cuerpo (datos) suspende. readOverviewSummary vuelve a
  // resolver internamente con los mismos helpers — duplicación aceptada.
  const period = resolvePeriod(
    granularity,
    sp.anchor,
    dayKey(new Date(), CREATOR_TIMEZONE),
  );
  const currentAnchor =
    granularity === "month" ? `${period.key}-01` : period.key;
  const accountState = await getAccountScope();
  const selected = accountState.selected;

  return (
    <PageShell>
      <header
        data-tour="periodo"
        className="mb-5 flex flex-wrap items-start justify-between gap-4"
      >
        <h1 className="max-w-[520px] text-[2.1rem] leading-[1.1] font-medium tracking-[-0.025em]">
          Cómo van{" "}
          <span className="bg-primary text-primary-foreground inline-flex items-center gap-1.5 rounded-full px-3.5 pt-0.5 pb-1">
            <Sparkle className="size-4" />
            {selected?.handle ? `@${selected.handle}` : "tus reels"}
          </span>{" "}
          {period.granularity === "week" ? "esta semana" : "este mes"}
        </h1>
        <div className="flex flex-wrap items-center gap-2.5">
          <AccountSelector {...selectorProps(accountState)} />
          <PeriodNav
            granularity={period.granularity}
            label={period.label}
            currentAnchor={currentAnchor}
            prevAnchor={period.prevAnchor}
            nextAnchor={period.nextAnchor}
          />
        </div>
      </header>

      {/* key = periodo RESUELTO: cambiar de periodo remonta el Suspense y
          muestra el skeleton (los cambios de searchParams NO pasan por
          loading.tsx; esta capa cubre esa transición y el streaming de la
          primera carga). */}
      <Suspense
        key={`${accountState.value}:${granularity}:${period.key}`}
        fallback={<OverviewBodySkeleton />}
      >
        <OverviewBody
          granularity={granularity}
          anchor={sp.anchor}
          scope={accountState.scope}
          allAccounts={selected === null}
        />
      </Suspense>
    </PageShell>
  );
}

/**
 * Cuerpo con datos: aquí vive el await pesado. El tour viaja con el cuerpo
 * porque sus targets (kpis/chart/tipos/plataformas) se montan aquí; fuera del
 * Suspense podría arrancar sin ellos.
 */
async function OverviewBody({
  granularity,
  anchor,
  scope,
  allAccounts,
}: {
  granularity: "week" | "month";
  anchor?: string;
  scope: ReadGrowthOptions;
  /** true en "todas las cuentas": hay reparto entre plataformas y desglose. */
  allAccounts: boolean;
}) {
  let summary: OverviewSummary;
  try {
    summary = await readOverviewSummary({ granularity, anchor, scope });
  } catch (err) {
    return (
      <div className="bg-card shadow-card rounded-lg p-5">
        <p className="text-destructive text-sm">
          No se pudo leer el resumen:{" "}
          {err instanceof Error ? err.message : "error desconocido"}
        </p>
      </div>
    );
  }

  const {
    period,
    combined,
    byPlatform,
    byAccount,
    subBuckets,
    contentTypes,
    bestVideo,
  } = summary;
  const unit = period.subGranularity === "day" ? "día" : "semana";
  // El % de TikTok solo dice algo cuando hay más de una plataforma en juego.
  const tkShare =
    allAccounts && combined.views > 0
      ? Math.round((byPlatform.tiktok.views / combined.views) * 100)
      : null;
  // "Recién empezado" = periodo actual sin UN SOLO delta observado (solo hay
  // una captura del cron). `videosPublished` no entra: puede ser >0 con una
  // sola captura y el aviso seguiría siendo el correcto.
  const freshPeriod =
    period.isCurrent &&
    combined.views === 0 &&
    combined.likes === 0 &&
    combined.comments === 0 &&
    combined.followersGained === null;

  return (
    <>
      {freshPeriod && (
        <FreshPeriodNotice
          granularity={period.granularity}
          prevAnchor={period.prevAnchor}
        />
      )}
      <div className="flex flex-col gap-3.5 xl:flex-row">
        {/* Columna principal */}
        <div className="min-w-0 flex-1">
          <section data-tour="kpis" className="grid gap-3.5 sm:grid-cols-2 lg:grid-cols-3">
            {/* Vistas — card blanca */}
            <div className="bg-card shadow-card rounded-lg p-[18px]">
              <div className="flex items-center justify-between">
                <span className="flex items-center gap-2.5">
                  <IconTile>
                    <Eye className="size-3.5" />
                  </IconTile>
                  <span className="text-[13px] font-medium">Vistas</span>
                </span>
              </div>
              <div className="mt-4 flex items-baseline gap-2">
                <span className="text-[2.75rem] leading-none font-medium tracking-[-0.03em] tabular-nums">
                  {formatCount(combined.views)}
                </span>
                {tkShare !== null && (
                  <span className="text-muted-foreground font-mono text-xs">
                    {tkShare}% TT
                  </span>
                )}
              </div>
              <ProgressCapsules buckets={subBuckets} tone="onCard" />
            </div>

            {/* Seguidores — card de acento (lima) */}
            <div className="bg-primary text-primary-foreground shadow-card relative overflow-hidden rounded-lg p-[18px]">
              <div className="bg-halftone pointer-events-none absolute inset-0" />
              <div className="relative flex items-center justify-between">
                <span className="flex items-center gap-2.5">
                  <IconTile tone="onAccent">
                    <UserPlus className="size-3.5" />
                  </IconTile>
                  <span className="text-[13px] font-medium">Seguidores</span>
                </span>
              </div>
              <div className="relative mt-4 flex items-baseline gap-2">
                <span className="text-[2.75rem] leading-none font-medium tracking-[-0.03em] tabular-nums">
                  {combined.followersGained === null
                    ? "—"
                    : `${combined.followersGained >= 0 ? "+" : ""}${formatCount(combined.followersGained)}`}
                </span>
              </div>
              <div className="relative">
                <ProgressCapsules buckets={subBuckets} tone="onAccent" />
              </div>
            </div>

            {/* Mejor video — card oscura */}
            <div className="bg-foreground text-background shadow-lift relative overflow-hidden rounded-lg p-[18px] sm:col-span-2 lg:col-span-1">
              <div className="bg-halftone pointer-events-none absolute inset-0" />
              {/* Franja decorativa estrecha: el titular manda, no el adorno. */}
              <div className="bg-hatch pointer-events-none absolute inset-y-0 right-0 w-[56px] opacity-40" />
              {/* Chip lima (no texto lima): sobrevive la inversión de la card
                  en oscuro — regla "el lima es superficie". */}
              <div className="bg-primary text-primary-foreground relative inline-block rounded-full px-2.5 py-1 font-mono text-[9.5px] tracking-[0.14em] uppercase">
                Mejor video
              </div>
              {bestVideo ? (
                <>
                  <div className="relative mt-2.5 pr-12 text-[19px] leading-[1.2] font-medium tracking-[-0.015em]">
                    <span className="line-clamp-3">
                      {bestVideo.caption?.trim() || bestVideo.externalId}
                    </span>
                  </div>
                  <Link
                    href={`/video/${bestVideo.platform}/${bestVideo.externalId}`}
                    className="bg-background text-foreground relative mt-3.5 flex w-fit items-center gap-2.5 rounded-full py-2 pr-1.5 pl-3.5 text-[12.5px] font-medium"
                  >
                    {formatCount(bestVideo.views)} vistas
                    <span className="bg-primary text-primary-foreground flex size-[22px] items-center justify-center rounded-full">
                      <ArrowUpRight className="size-3" />
                    </span>
                  </Link>
                </>
              ) : (
                <p className="text-background/60 relative mt-2.5 pr-12 text-[13px]">
                  No publicaste videos en este periodo.
                </p>
              )}
            </div>
          </section>

          {/* Estadísticas */}
          <section
            data-tour="chart"
            className="bg-card shadow-card mt-3.5 rounded-lg p-[18px]"
          >
            <div className="mb-1 flex flex-wrap items-center justify-between gap-3">
              <span className="flex flex-wrap items-center gap-2.5">
                <IconTile>
                  <BarChart3 className="size-3.5" />
                </IconTile>
                <span className="text-[19px] font-medium tracking-[-0.02em]">
                  Vistas por {unit}
                </span>
                <span className="text-muted-foreground ml-3 flex items-center gap-3.5 text-[11.5px]">
                  <span className="flex items-center gap-1.5">
                    <span className="bg-foreground size-[7px] rounded-full" />
                    TikTok
                  </span>
                  <span className="flex items-center gap-1.5">
                    <span className="bg-primary ring-foreground/15 dark:bg-background dark:ring-foreground/40 size-[7px] rounded-full ring-1" />
                    Instagram
                  </span>
                </span>
              </span>
              <span className="border-border text-muted-foreground rounded-full border px-3 py-1.5 text-xs">
                {period.label}
              </span>
            </div>
            <StatsChart buckets={subBuckets} />
          </section>

          {allAccounts && byAccount.length > 1 && (
            <AccountBreakdownCard rows={byAccount} total={combined} />
          )}

          {/* Tipos de contenido */}
          <section
            data-tour="tipos"
            className="bg-card shadow-card mt-3.5 rounded-lg p-[18px]"
          >
            <div className="mb-2 text-[15px] font-medium tracking-[-0.01em]">
              Tipos de contenido
            </div>
            {contentTypes.length > 0 ? (
              <TypeBars types={contentTypes} />
            ) : (
              <p className="text-muted-foreground text-sm">
                No publicaste videos en este periodo.
              </p>
            )}
          </section>
        </div>

        {/* Columna lateral */}
        <aside
          data-tour="plataformas"
          className="flex w-full shrink-0 flex-col gap-3 xl:w-[246px]"
        >
          <div className="grid grid-cols-2 gap-3">
            <PlatformCard
              href="/tiktok"
              icon={<AudioLines className="size-3.5" />}
              name="TikTok"
              views={byPlatform.tiktok.views}
            />
            <PlatformCard
              href="/instagram"
              icon={<InstagramIcon size={14} />}
              name="Instagram"
              views={byPlatform.instagram.views}
            />
          </div>

          <div className="bg-card shadow-card flex flex-1 flex-col rounded-[20px] p-4">
            {[
              {
                href: "/content",
                icon: <Layers className="size-3.5" />,
                title: "Contenido",
                hint: `Explora los ${combined.videosPublished} videos del periodo`,
              },
              {
                href: "/growth",
                icon: <MessageCircle className="size-3.5" />,
                title: "Interacción",
                hint: `${formatCount(combined.likes)} likes · ${formatCount(combined.comments)} comentarios`,
              },
            ].map((row, i) => (
              <Link
                key={row.href}
                href={row.href}
                className={`group flex items-start justify-between gap-3 ${i === 0 ? "border-border border-b pb-4" : "pt-4"}`}
              >
                <span>
                  <IconTile>{row.icon}</IconTile>
                  <span className="mt-2.5 block text-[13px] font-medium">
                    {row.title}
                  </span>
                  <span className="text-muted-foreground/80 mt-0.5 block text-[11px]">
                    {row.hint}
                  </span>
                </span>
                <ArrowUpRight className="text-muted-foreground/60 group-hover:text-foreground size-4 shrink-0 transition-colors" />
              </Link>
            ))}
          </div>
        </aside>
      </div>

      {/* Tour de primera visita (auto-start una vez; ver components/tour). */}
      <PageTour route="/" />
    </>
  );
}
