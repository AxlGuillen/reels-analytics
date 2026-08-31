import Image from "next/image";
import Link from "next/link";
import { ArrowUpRight, Eye, Sparkles, UserPlus } from "lucide-react";
import { LandingMotion } from "@/components/landing/landing-motion";
import { LandingNav } from "@/components/landing/landing-nav";
import { CTA_OUTLINE, CTA_PRIMARY } from "@/components/landing/cta";
import { BrandGlyph } from "@/components/brand-mark";
import { WebMcp } from "@/components/landing/web-mcp";
import {
  LandingIcon,
  type LandingIconName,
} from "@/components/landing/landing-icon";
import { COPY, type Lang } from "./content";

/**
 * Landing pública (Acid Grid). Server Component: todo el contenido llega en el
 * SSR; el movimiento (reveals + parallax) lo agrega `LandingMotion` vía los
 * atributos `data-reveal` / `data-plx` — sin JS la página queda estática.
 *
 * Un solo markup para las dos variantes de idioma (`/landing` y `/en/landing`):
 * el copy viene de `content.ts` según `lang`. Los ids de sección (#producto…)
 * son contrato con el nav y con WebMCP, así que no se traducen.
 *
 * Los números de las muestras son datos reales del creador (aprobados), no
 * lorem ipsum: la landing enseña el producto con su propia analítica.
 */

const GITHUB_URL = "https://github.com/AxlGuillen/reels-analytics";

/** Rayado diagonal derivado de --background: para franjas sobre superficies
 *  invertidas (`bg-foreground`), donde `.bg-hatch` (basado en --foreground)
 *  sería invisible. */
const HATCH_INVERT =
  "bg-[repeating-linear-gradient(135deg,color-mix(in_oklab,var(--background)_14%,transparent)_0_7px,color-mix(in_oklab,var(--background)_6%,transparent)_7px_14px)]";

/** Curva de crecimiento de muestra (viewBox 400x150): sube rápido y se aplana,
 *  la forma real de un video. Es una ILUSTRACIÓN de la capacidad, no datos del
 *  creador — los datos reales los trae la captura del panel de más abajo. */
const CURVE_PATH =
  "M0 134 C 24 122, 44 88, 66 74 C 102 50, 142 44, 186 40 C 242 35, 294 30, 346 27 C 372 25.5, 388 24.5, 400 24";
const CURVE_AREA = `${CURVE_PATH} L400 150 L0 150 Z`;

/** Hitos sobre la curva: % de ancho y de alto (coinciden con el trazo). Las
 *  etiquetas vienen del copy (`chartPoints`). */
const CURVE_POINTS = [
  { x: "16.5%", y: "49%" },
  { x: "46.5%", y: "26.5%" },
  { x: "86%", y: "18%" },
] as const;

/** Ranking de formatos: posición + anchura/relleno. Deliberadamente ANÓNIMO
 *  (01…04, no los tipos reales del creador): la card ilustra que el panel los
 *  ordena, no cuáles son ni cuánto miden. */
const SECTION_BARS = [
  { rank: "01", w: "100%", fill: "bg-foreground" },
  { rank: "02", w: "78%", fill: "bg-primary" },
  { rank: "03", w: "46%", fill: "bg-muted-foreground" },
  { rank: "04", w: "30%", fill: "bg-muted-foreground/50" },
] as const;

/** El paso del cron es el corazón del producto: card oscura (jerarquía por
 *  tono, espejo de la card oscura del bento). */
const STEP_DARK = [false, true, false] as const;

/** Iconos de las features; la card del MCP es la de acento (regla Acid Grid:
 *  una card de acento por rejilla). */
const FEATURE_ICONS: readonly {
  icon: LandingIconName;
  accent?: boolean;
}[] = [
  { icon: "trending-up" },
  { icon: "layout-grid" },
  { icon: "message-circle" },
  { icon: "blocks", accent: true },
];

/** Filas fantasma de la banda parallax (la capa lenta del fondo). La banda es
 *  full-bleed, así que cada fila se duplica para cubrir pantallas anchas; van
 *  sobradas de alto porque la capa viaja en dirección contraria al scroll. */
const GHOST_ROWS = Array.from({ length: 12 }, (_, i) => {
  const day = 24 + i;
  const date = day <= 31 ? `2026-08-${day}` : `2026-09-0${day - 31}`;
  const base = `${date} · 08:35 · ${413 + i * 3} videos`;
  return `${base}   ·   ${base}`;
});

export function LandingPage({ lang }: { lang: Lang }) {
  const copy = COPY[lang];
  // Toggle de idioma: apunta siempre a la variante contraria.
  const otherLang =
    lang === "es"
      ? { label: "EN", full: "English", href: "/en/landing", hreflang: "en" }
      : { label: "ES", full: "Español", href: "/landing", hreflang: "es" };

  return (
    <LandingMotion>
      {/* `lang` aquí y no solo en <html>: el root layout sirve `es` y un route
          segment no puede cambiar ese atributo en el SSR, así que sin esto un
          lector de pantalla anunciaría /en/landing en español hasta que
          hidratara `SetHtmlLang`. El atributo del subárbol SÍ llega en el SSR
          y gana para todo el contenido de la página. */}
      <main
        lang={lang}
        className="mx-auto flex max-w-[1180px] flex-col gap-16 px-5 pt-7 pb-24 md:gap-[88px]"
      >
      {/* Nav (sticky; el menú móvil vive en el client component) */}
      <LandingNav
        brand="Reels Analytics"
        links={[
          { href: "#producto", label: copy.nav.product },
          { href: "#como-funciona", label: copy.nav.how },
          { href: "#mcp", label: copy.nav.mcp },
        ]}
        code={{ href: GITHUB_URL, label: copy.nav.code }}
        start={{ href: "/login", label: copy.nav.start }}
        otherLang={otherLang}
        menuLabel={copy.nav.menu}
      />

      {/* Hero */}
      <section className="relative flex items-center gap-14" data-plx-scope>
        {/* Papel milimétrico de fondo (distinto de los anillos de abajo):
            deriva con el scroll y muere en fundido antes del bento. */}
        <div
          className="bg-graph pointer-events-none absolute -inset-x-10 -inset-y-16 [mask-image:linear-gradient(to_bottom,transparent,black_18%,black_62%,transparent)]"
          data-plx="slow"
          aria-hidden
        />
        <div className="relative flex max-w-[760px] flex-1 flex-col gap-6">
          <p className="hero-item text-muted-foreground font-mono text-[11px] tracking-[0.16em]">
            {copy.hero.kicker}
          </p>
          <h1
            className="hero-slide text-[42px] leading-[1.06] font-medium tracking-[-0.025em] md:text-[64px]"
            style={{ animationDelay: "0.1s" }}
          >
            {copy.hero.h1a}{" "}
            <span className="bg-primary text-primary-foreground inline-flex items-center gap-2 rounded-full px-4 pt-0.5 pb-1.5 md:px-5">
              <Sparkles className="size-[0.55em]" strokeWidth={1.9} />
              {copy.hero.h1accent}
            </span>{" "}
            {copy.hero.h1b}
          </h1>
          <p
            className="hero-item text-muted-foreground max-w-[620px] text-lg leading-[1.55]"
            style={{ animationDelay: "0.2s" }}
          >
            {copy.hero.sub}
          </p>
          <div
            className="hero-item flex flex-wrap items-center gap-3"
            style={{ animationDelay: "0.3s" }}
          >
            <Link
              href="/login"
              className={`${CTA_PRIMARY} shadow-lift px-[26px] py-3.5 text-[15px]`}
            >
              {copy.nav.start}
            </Link>
            <a
              href={GITHUB_URL}
              target="_blank"
              rel="noreferrer"
              className={`${CTA_OUTLINE} px-6 py-[13px] text-[15px]`}
            >
              {copy.nav.code}
              <ArrowUpRight className="size-[13px]" strokeWidth={2} />
            </a>
          </div>
        </div>

        {/* Collage texturizado */}
        <div className="relative hidden h-[360px] w-[300px] shrink-0 lg:block">
          <div
            className="hero-piece bg-muted shadow-card absolute top-0 left-5 flex h-[284px] w-[200px] -rotate-3 items-end overflow-hidden rounded-lg p-3"
            style={{ animationDelay: "0.35s" }}
          >
            {/* Frame real de un Reel del creador (dominio propio, con permiso). */}
            <Image
              src="/assets/video-single.png"
              alt=""
              fill
              sizes="200px"
              className="object-cover"
            />
            <span className="bg-foreground text-background relative rotate-3 rounded-full px-3 py-1 font-mono text-[10px] tracking-[0.1em]">
              9:16 · 0:47
            </span>
          </div>
          <div
            className="hero-piece bg-primary text-primary-foreground bg-halftone shadow-lift absolute right-0 bottom-6 flex w-[176px] rotate-3 flex-col gap-1.5 rounded-[18px] p-4"
            style={{ animationDelay: "0.45s" }}
          >
            <span className="text-primary-foreground/60 font-mono text-[9.5px] tracking-[0.14em]">
              {copy.collage.snapshotLabel}
            </span>
            <span className="text-[26px] leading-none font-medium tracking-[-0.03em]">
              08:35
            </span>
            <span className="text-primary-foreground/60 font-mono text-[10px]">
              {copy.collage.snapshotMeta}
            </span>
          </div>
          <div
            className="hero-piece group bg-foreground absolute -top-4 right-6 flex size-16 rotate-6 items-center justify-center rounded-full"
            style={{ animationDelay: "0.55s" }}
          >
            <BrandGlyph className="text-primary dark:text-background size-[28px]" />
          </div>
        </div>
      </section>

      {/* Bento del producto */}
      <section
        id="producto"
        className="relative isolate flex scroll-mt-6 flex-col gap-3.5"
        data-plx-scope
      >
        {/* Textura secundaria de la zona: el glifo 4XL como marca de agua muy
            tenue, asomando por los canales entre cards. `isolate` + `-z-10`
            para que quede detrás de ellas; deriva con el scroll como las demás
            capas de fondo. */}
        <div
          className="pointer-events-none absolute top-1/2 -right-40 -z-10 hidden -translate-y-1/2 xl:block"
          data-plx="slow"
          aria-hidden
        >
          <BrandGlyph className="text-foreground/[0.07] size-[560px]" />
        </div>
        <div className="grid gap-3.5 md:grid-cols-3" data-reveal-stagger>
          <div className="bg-card shadow-card flex flex-col gap-3.5 rounded-lg p-5">
            <div className="flex items-center gap-2.5">
              <div className="bg-foreground/10 text-foreground flex size-[26px] items-center justify-center rounded-[9px]">
                <Eye className="size-3.5" strokeWidth={1.9} />
              </div>
              <span className="text-[13px] font-medium">
                {copy.bento.viewsTitle}
              </span>
            </div>
            <p className="text-[26px] leading-[1.15] font-medium tracking-[-0.025em]">
              {copy.bento.viewsHeadline}
            </p>
            <div className="flex gap-[5px]">
              {[0, 1, 2, 3].map((i) => (
                <div key={i} className="bg-foreground h-9 flex-1 rounded-[9px]" />
              ))}
              {[4, 5, 6].map((i) => (
                <div
                  key={i}
                  className="border-muted-foreground h-9 flex-1 rounded-[9px] border border-dashed"
                />
              ))}
            </div>
            <p className="text-muted-foreground text-[12.5px] leading-[1.45]">
              {copy.bento.viewsNote}
            </p>
          </div>

          <div className="bg-primary text-primary-foreground bg-halftone shadow-card flex flex-col gap-3.5 rounded-lg p-5">
            <div className="flex items-center gap-2.5">
              <div className="bg-primary-foreground/10 flex size-[26px] items-center justify-center rounded-[9px]">
                <UserPlus className="size-3.5" strokeWidth={1.9} />
              </div>
              <span className="text-[13px] font-medium">
                {copy.bento.followersTitle}
              </span>
            </div>
            <p className="text-[26px] leading-[1.15] font-medium tracking-[-0.025em]">
              {copy.bento.followersHeadline}
            </p>
            <p className="text-primary-foreground/60 text-[12.5px] leading-[1.45]">
              {copy.bento.followersNote}
            </p>
          </div>

          <div className="bg-foreground text-background shadow-lift relative flex flex-col gap-2.5 overflow-hidden rounded-lg p-5">
            <div
              className={`${HATCH_INVERT} absolute inset-y-0 right-0 w-14 opacity-50`}
              aria-hidden
            />
            <span className="bg-primary text-primary-foreground relative self-start rounded-full px-2.5 py-[3px] font-mono text-[9.5px] tracking-[0.14em]">
              {copy.bento.bestLabel}
            </span>
            <p className="relative pr-12 text-xl leading-[1.2] font-medium tracking-[-0.015em]">
              {copy.bento.bestTitle}
            </p>
            <div className="bg-background text-foreground relative flex w-fit items-center gap-2.5 rounded-full py-2 pr-1.5 pl-[15px] text-[12.5px] font-medium">
              {copy.bento.bestCta}
              <span className="bg-primary text-primary-foreground flex size-[22px] items-center justify-center rounded-full">
                <ArrowUpRight className="size-3" strokeWidth={2} />
              </span>
            </div>
            <p className="text-background/60 relative pr-12 text-[12.5px] leading-[1.45]">
              {copy.bento.bestNote}
            </p>
          </div>
        </div>

        <div className="grid gap-3.5 lg:grid-cols-[2fr_1fr]" data-reveal-stagger>
          <div className="bg-card shadow-card flex flex-col gap-4 rounded-lg p-[22px]">
            <div className="flex items-start justify-between gap-4">
              <span className="text-[17px] font-medium tracking-[-0.02em]">
                {copy.bento.chartTitle}
              </span>
              <span className="text-muted-foreground hidden shrink-0 font-mono text-[10px] tracking-[0.12em] sm:block">
                {copy.bento.chartAxis}
              </span>
            </div>
            <div className="relative h-[180px] w-full">
              {/* Retícula tenue: da lectura de "gráfica" sin inventar cifras. */}
              <svg
                viewBox="0 0 400 150"
                preserveAspectRatio="none"
                className="h-full w-full"
                aria-hidden
              >
                <g className="text-border" stroke="currentColor">
                  {[30, 70, 110, 150].map((y) => (
                    <line
                      key={y}
                      x1="0"
                      y1={y}
                      x2="400"
                      y2={y}
                      vectorEffect="non-scaling-stroke"
                    />
                  ))}
                </g>
                <path
                  d={CURVE_AREA}
                  className="text-primary"
                  fill="currentColor"
                  fillOpacity="0.35"
                />
                <path
                  d={CURVE_PATH}
                  className="text-foreground"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  vectorEffect="non-scaling-stroke"
                />
              </svg>
              {/* Puntos fuera del SVG: con preserveAspectRatio="none" un
                  <circle> saldría ovalado al estirarse el viewBox. */}
              {CURVE_POINTS.map((point, i) => (
                <span
                  key={copy.bento.chartPoints[i]}
                  className="bg-foreground ring-card absolute size-[9px] -translate-x-1/2 -translate-y-1/2 rounded-full ring-[3px]"
                  style={{ left: point.x, top: point.y }}
                />
              ))}
            </div>
            {/* Eje X: los hitos que el panel marca en cada video. */}
            <div className="relative h-4">
              {CURVE_POINTS.map((point, i) => (
                <span
                  key={copy.bento.chartPoints[i]}
                  className="text-muted-foreground absolute -translate-x-1/2 font-mono text-[10px] whitespace-nowrap"
                  style={{ left: point.x }}
                >
                  {copy.bento.chartPoints[i]}
                </span>
              ))}
            </div>
            <p className="text-muted-foreground text-[12.5px] leading-[1.45]">
              {copy.bento.chartNote}
            </p>
          </div>

          <div className="bg-card shadow-card flex flex-col gap-3 rounded-lg p-[22px]">
            <span className="text-[15px] font-medium tracking-[-0.01em]">
              {copy.bento.sectionsTitle}
            </span>
            <div className="flex flex-col gap-2.5" data-bars-x>
              {SECTION_BARS.map((row) => (
                <div key={row.rank} className="flex items-center gap-3">
                  <span className="text-muted-foreground shrink-0 font-mono text-[11px]">
                    {row.rank}
                  </span>
                  <div className="bg-muted h-3.5 flex-1 rounded-full">
                    <div
                      className={`${row.fill} h-3.5 rounded-full`}
                      style={{ width: row.w }}
                      data-bar-x
                    />
                  </div>
                </div>
              ))}
            </div>
            <p className="text-muted-foreground mt-1 text-xs leading-[1.45]">
              {copy.bento.sectionsNote}
            </p>
          </div>
        </div>

        {/* El panel real (captura del Overview): la variante sigue al tema. */}
        <div
          className="bg-card shadow-card overflow-hidden rounded-lg p-2 sm:p-2.5"
          data-reveal
        >
          <Image
            src="/assets/dashboard-light.webp"
            alt={copy.bento.panelAlt}
            width={1898}
            height={932}
            loading="lazy"
            sizes="(max-width: 1180px) 100vw, 1132px"
            className="w-full rounded-[15px] dark:hidden"
          />
          <Image
            src="/assets/dashboard-dark.webp"
            alt={copy.bento.panelAlt}
            width={1893}
            height={928}
            loading="lazy"
            sizes="(max-width: 1180px) 100vw, 1132px"
            className="hidden w-full rounded-[15px] dark:block"
          />
        </div>
      </section>

      {/* Parallax: la historia como capas */}
      {/* Full-bleed: rompe el max-w del <main> con w-screen + márgenes
          negativos (sin transform, para no pelearse con los tweens de GSAP).
          El overflow-x-clip del layout evita la scrollbar horizontal. */}
      <section
        className="bg-foreground shadow-rail relative h-[420px] w-screen max-w-none overflow-hidden md:h-[520px] -mx-[calc((100vw-100%)/2)]"
        data-plx-scope
        data-reveal
      >
        <div className="bg-halftone text-background absolute inset-0" aria-hidden />
        {/* Sobre-alto (-inset-y-24): la capa `slow` viaja en dirección contraria
            al contenido, así que necesita cubrir más allá de la banda. */}
        <div
          className="text-background/[0.07] absolute -inset-y-24 left-0 flex flex-col justify-center gap-2.5 font-mono text-[42px] tracking-[-0.02em] whitespace-nowrap"
          data-plx="slow"
          aria-hidden
        >
          {GHOST_ROWS.map((row) => (
            <span key={row}>{row}</span>
          ))}
        </div>

        {/* El contenido vuelve a la retícula de 1180px de la página. */}
        <div className="relative mx-auto h-full w-full max-w-[1180px] px-5">
          <div
            className="flex h-full max-w-[620px] flex-col justify-center gap-4 px-3 md:px-8"
            data-plx="slow"
          >
            <span className="bg-primary text-primary-foreground self-start rounded-full px-3 py-1 font-mono text-[10px] tracking-[0.14em]">
              {copy.band.kicker}
            </span>
            <h2
              className="text-background text-[32px] leading-[1.08] font-medium tracking-[-0.03em] md:text-[44px]"
              data-split
            >
              {copy.band.title}
            </h2>
            <p className="text-background/60 max-w-[480px] leading-[1.55]">
              {copy.band.body}
            </p>
          </div>

          <div className="absolute top-[66px] right-[200px] hidden md:block" data-plx="mid">
          <div className="bg-background/10 text-background ring-background/15 shadow-lift flex -rotate-3 flex-col gap-1 rounded-[18px] px-4 py-3.5 ring-1">
            <span className="text-background/50 font-mono text-[9.5px] tracking-[0.12em]">
              {copy.band.ago14}
            </span>
            <span className="text-2xl font-medium tracking-[-0.03em]">
              {copy.band.ago14Views}
            </span>
          </div>
        </div>
          <div className="absolute right-[72px] bottom-[150px] hidden md:block" data-plx="mid">
            <div className="bg-background/10 text-background ring-background/15 shadow-lift flex rotate-2 flex-col gap-1 rounded-[18px] px-4 py-3.5 ring-1">
              <span className="text-background/50 font-mono text-[9.5px] tracking-[0.12em]">
                {copy.band.ago7}
              </span>
              <span className="text-2xl font-medium tracking-[-0.03em]">
                {copy.band.ago7Views}
              </span>
            </div>
          </div>
          <div className="absolute right-[148px] bottom-11 hidden md:block" data-plx="fast">
            <div className="bg-primary text-primary-foreground bg-halftone shadow-lift flex -rotate-2 flex-col gap-1 rounded-[18px] px-[18px] py-4">
              <span className="text-primary-foreground/60 font-mono text-[9.5px] tracking-[0.12em]">
                {copy.band.today}
              </span>
              <span className="text-[30px] font-medium tracking-[-0.03em]">
                {copy.band.todayViews}
              </span>
            </div>
          </div>
        </div>
      </section>

      {/* Cómo funciona */}
      <section
        id="como-funciona"
        className="relative flex scroll-mt-6 flex-col gap-[22px]"
        data-plx-scope
      >
        {/* Anillos tenues de fondo, derivando con el scroll. */}
        <div
          className="bg-rings pointer-events-none absolute -inset-x-16 -inset-y-24"
          data-plx="slow"
          aria-hidden
        />
        <h2
          className="relative text-[34px] font-medium tracking-[-0.025em]"
          data-reveal
        >
          {copy.steps.title}
        </h2>
        <div className="relative grid gap-3.5 md:grid-cols-3" data-reveal-stagger>
          {copy.steps.items.map((step, i) => (
            <div
              key={step.title}
              className={
                STEP_DARK[i]
                  ? "bg-foreground text-background bg-halftone shadow-lift flex flex-col gap-2.5 rounded-lg p-[22px]"
                  : "bg-card shadow-card flex flex-col gap-2.5 rounded-lg p-[22px]"
              }
            >
              <span className="bg-primary text-primary-foreground self-start rounded-full px-3 py-[3px] font-mono text-[11px]">
                {`0${i + 1}`}
              </span>
              <span className="font-medium">{step.title}</span>
              <span
                className={
                  STEP_DARK[i]
                    ? "text-background/60 text-[13.5px] leading-[1.5]"
                    : "text-muted-foreground text-[13.5px] leading-[1.5]"
                }
              >
                {step.body}
              </span>
            </div>
          ))}
        </div>
      </section>

      {/* Features */}
      <section
        id="mcp"
        className="relative scroll-mt-6"
        data-plx-scope
      >
        {/* Anillos tenues también aquí (posición espejada por el -inset mayor). */}
        <div
          className="bg-rings pointer-events-none absolute -inset-x-20 -inset-y-32 -scale-x-100"
          data-plx="slow"
          aria-hidden
        />
        <div
          className="relative grid gap-3.5 sm:grid-cols-2 lg:grid-cols-4"
          data-reveal-stagger
        >
          {copy.features.items.map((feature, i) => (
            <div
              key={feature.title}
              className={
                FEATURE_ICONS[i].accent
                  ? "bg-primary text-primary-foreground bg-halftone shadow-card flex flex-col gap-2.5 rounded-lg p-[18px]"
                  : "bg-card shadow-card flex flex-col gap-2.5 rounded-lg p-[18px]"
              }
            >
              <div
                className={
                  FEATURE_ICONS[i].accent
                    ? "bg-primary-foreground/10 text-primary-foreground flex size-[26px] items-center justify-center rounded-[9px]"
                    : "bg-foreground/10 text-foreground flex size-[26px] items-center justify-center rounded-[9px]"
                }
              >
                <LandingIcon
                  name={FEATURE_ICONS[i].icon}
                  size={14}
                  className="flex"
                />
              </div>
              <span className="text-sm font-medium">{feature.title}</span>
              <span
                className={
                  FEATURE_ICONS[i].accent
                    ? "text-primary-foreground/70 text-[12.5px] leading-[1.5]"
                    : "text-muted-foreground text-[12.5px] leading-[1.5]"
                }
              >
                {feature.body}
              </span>
            </div>
          ))}
        </div>
      </section>

      {/* Cierre */}
      <section
        className="bg-foreground shadow-rail relative flex flex-col items-start gap-8 overflow-hidden rounded-[26px] p-8 md:flex-row md:items-center md:justify-between md:p-14"
        data-reveal
      >
        <div className="bg-halftone text-background absolute inset-0" aria-hidden />
        <div
          className={`${HATCH_INVERT} absolute inset-y-0 right-0 w-[84px] opacity-55`}
          aria-hidden
        />
        <div className="relative flex max-w-[560px] flex-col gap-2.5">
          <h2 className="text-background text-[28px] font-medium tracking-[-0.025em] md:text-[34px]">
            {copy.closing.title}
          </h2>
          <p className="text-background/50 font-mono text-[11px] tracking-[0.14em]">
            {copy.closing.mono}
          </p>
        </div>
        <Link
          href="/login"
          className="bg-background text-foreground hover:bg-background/90 relative shrink-0 rounded-full px-[30px] py-4 text-[15px] font-medium transition-colors"
        >
          {copy.nav.start}
        </Link>
      </section>

      {/* Footer: banda oscura full-bleed (mismo breakout que la banda
          parallax) — el cambio de color marca el final de la página. -mb-24
          cancela el padding inferior del main para morir contra el borde. */}
      <footer className="bg-foreground text-background relative -mx-[calc((100vw-100%)/2)] -mb-24 w-screen max-w-none overflow-hidden">
        <div className="bg-halftone text-background absolute inset-0 opacity-60" aria-hidden />
        <div className="relative mx-auto flex w-full max-w-[1180px] flex-col items-center justify-between gap-7 px-5 py-12 sm:flex-row sm:gap-6">
          <div className="flex items-center gap-2.5">
            <div className="group bg-primary text-primary-foreground flex size-[26px] items-center justify-center rounded-[9px]">
              <BrandGlyph className="size-[14px]" />
            </div>
            <span className="text-[13px] font-medium">Reels Analytics</span>
          </div>
          <div className="flex flex-wrap items-center justify-center gap-x-6 gap-y-3 font-mono text-[11px] tracking-[0.12em]">
            <a
              href="#producto"
              className="text-background/60 hover:text-background whitespace-nowrap transition-colors"
            >
              {copy.footer.product}
            </a>
            <a
              href="#como-funciona"
              className="text-background/60 hover:text-background whitespace-nowrap transition-colors"
            >
              {copy.footer.how}
            </a>
            <a
              href="#mcp"
              className="text-background/60 hover:text-background whitespace-nowrap transition-colors"
            >
              {copy.footer.mcp}
            </a>
            <a
              href={GITHUB_URL}
              target="_blank"
              rel="noreferrer"
              className="text-background/60 hover:text-background whitespace-nowrap transition-colors"
            >
              {copy.footer.github}
            </a>
            <Link
              href={otherLang.href}
              hrefLang={otherLang.hreflang}
              className="text-background/60 hover:text-background whitespace-nowrap uppercase transition-colors"
            >
              {otherLang.full}
            </Link>
          </div>
          <span className="text-background/40 text-center font-mono text-[11px] tracking-[0.12em]">
            {copy.footer.rights}
          </span>
        </div>
      </footer>

      {/* Indicador de progreso de scroll: cápsula lima creciendo sobre un riel
          fino (eco de las barras de cápsula del dashboard). Decorativo puro:
          pointer-events-none + aria-hidden; solo desktop; sin JS o con
          reduced-motion queda el riel vacío casi invisible (motion-reduce lo
          oculta del todo). El fill lo anima LandingMotion vía
          [data-scroll-progress]. */}
      <div
        className="pointer-events-none fixed top-1/2 right-4 z-40 hidden h-44 w-[5px] -translate-y-1/2 overflow-hidden rounded-full bg-border motion-reduce:hidden lg:block"
        aria-hidden
      >
        <div
          className="bg-primary h-full w-full origin-top scale-y-0 rounded-full"
          data-scroll-progress
        />
      </div>

      <WebMcp />
      </main>
    </LandingMotion>
  );
}
