import Link from "next/link";
import {
  Activity,
  ArrowUpRight,
  Bot,
  Eye,
  LayoutGrid,
  MessageCircle,
  Sparkles,
  TrendingUp,
  UserPlus,
} from "lucide-react";
import { LandingMotion } from "@/components/landing/landing-motion";

/**
 * Landing pública (Acid Grid). Server Component: todo el contenido llega en el
 * SSR; el movimiento (reveals + parallax) lo agrega `LandingMotion` vía los
 * atributos `data-reveal` / `data-plx` — sin JS la página queda estática.
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

const CTA_PRIMARY =
  "bg-foreground text-background hover:bg-foreground/90 inline-flex items-center justify-center rounded-full font-medium transition-colors";
const CTA_OUTLINE =
  "border-border bg-card hover:bg-muted inline-flex items-center justify-center gap-1.5 rounded-full border transition-colors";

/** Semana de muestra para la gráfica de cápsulas (alto total y segmento IG en %). */
const WEEK_BARS = [
  { day: "Lun", h: 32, ig: 31 },
  { day: "Mar", h: 47, ig: 31 },
  { day: "Mié", h: 83, ig: 29, leader: "160,8 mil" },
  { day: "Jue", h: 53, ig: 31 },
  { day: "Vie", h: 39, ig: 31 },
  { day: "Sáb", h: 33, ig: 33 },
  { day: "Dom", h: 26, ig: 33 },
] as const;

const SECTION_BARS = [
  { label: "Narración", w: "100%", fill: "bg-foreground" },
  { label: "SoloQ", w: "78%", fill: "bg-primary" },
  { label: "Noticias", w: "46%", fill: "bg-muted-foreground" },
  { label: "Audio viral", w: "30%", fill: "bg-muted-foreground/50" },
] as const;

const STEPS = [
  {
    n: "01",
    title: "Conecta tus cuentas",
    body: "OAuth con TikTok e Instagram. Los tokens se refrescan solos antes de usarse.",
  },
  {
    n: "02",
    title: "El cron captura a diario",
    body: "Un snapshot por video cada 24 h. La historia se acumula aunque no abras el panel.",
  },
  {
    n: "03",
    title: "Decide con evidencia",
    body: "Curvas por video, benchmark contra su semana y un digest cada lunes por Telegram.",
  },
] as const;

const FEATURES = [
  {
    icon: TrendingUp,
    title: "Curva por video",
    body: "Vistas a los 7 días, velocidad inicial y el momento exacto del despegue.",
  },
  {
    icon: LayoutGrid,
    title: "Cohorte semanal",
    body: "Cada video se compara contra los de su misma semana — el crecimiento de audiencia no infla el veredicto.",
  },
  {
    icon: MessageCircle,
    title: "Digest por Telegram",
    body: "Cada lunes: vistas, seguidores, secciones y mejor video. Además vigila que la ingesta no se caiga.",
  },
  {
    icon: Bot,
    title: "Habla con tus datos",
    body: "Servidor MCP con 9 tools de solo lectura: pregúntale a Claude por tu analítica desde donde escribes.",
  },
] as const;

/** Filas fantasma de la banda parallax (la capa lenta del fondo). */
const GHOST_ROWS = Array.from({ length: 9 }, (_, i) => {
  const day = 24 + i;
  const date = day <= 31 ? `2026-08-${day}` : `2026-09-0${day - 31}`;
  return `${date} · 08:35 · ${413 + i * 3} videos`;
});

export default function LandingPage() {
  return (
    <LandingMotion>
      <main className="mx-auto flex max-w-[1180px] flex-col gap-16 px-5 pt-7 pb-24 md:gap-[88px]">
      {/* Nav */}
      <nav className="bg-card shadow-card flex items-center justify-between rounded-full py-2.5 pr-2.5 pl-3">
        <div className="flex items-center gap-2.5">
          <div className="bg-primary text-primary-foreground flex size-[38px] items-center justify-center rounded-[14px]">
            <Activity className="size-[18px]" strokeWidth={1.9} />
          </div>
          <span className="text-sm font-medium tracking-[-0.01em]">
            Reels Analytics
          </span>
        </div>
        <div className="text-muted-foreground hidden items-center gap-6 text-[13px] md:flex">
          <a href="#producto" className="hover:text-foreground transition-colors">
            Producto
          </a>
          <a
            href="#como-funciona"
            className="hover:text-foreground transition-colors"
          >
            Cómo funciona
          </a>
          <a href="#mcp" className="hover:text-foreground transition-colors">
            MCP
          </a>
        </div>
        <div className="flex items-center gap-2">
          <a
            href={GITHUB_URL}
            target="_blank"
            rel="noreferrer"
            className={`${CTA_OUTLINE} hidden px-4 py-2 text-[13px] sm:inline-flex`}
          >
            Ver el código
            <ArrowUpRight className="size-[13px]" strokeWidth={2} />
          </a>
          <Link
            href="/login"
            className={`${CTA_PRIMARY} px-[18px] py-2.5 text-[13px]`}
          >
            Empieza a medir
          </Link>
        </div>
      </nav>

      {/* Hero */}
      <section className="flex items-center gap-14">
        <div className="flex max-w-[760px] flex-1 flex-col gap-6">
          <p
            className="text-muted-foreground font-mono text-[11px] tracking-[0.16em]"
            data-hero-item
          >
            TIKTOK · INSTAGRAM — SNAPSHOTS DIARIOS DESDE EL DÍA CERO
          </p>
          <h1
            className="text-[42px] leading-[1.06] font-medium tracking-[-0.025em] md:text-[64px]"
            data-hero-item
          >
            Mide lo que publicas.{" "}
            <span className="bg-primary text-primary-foreground inline-flex items-center gap-2 rounded-full px-4 pt-0.5 pb-1.5 md:px-5">
              <Sparkles className="size-[0.55em]" strokeWidth={1.9} />
              Entiende
            </span>{" "}
            lo que crece.
          </h1>
          <p
            className="text-muted-foreground max-w-[620px] text-lg leading-[1.55]"
            data-hero-item
          >
            Las APIs de TikTok e Instagram solo devuelven el presente. Reels
            Analytics guarda un snapshot diario de cada video y convierte esa
            historia en decisiones: qué formato rinde, qué día despegó y contra
            qué compararte.
          </p>
          <div className="flex flex-wrap items-center gap-3" data-hero-item>
            <Link
              href="/login"
              className={`${CTA_PRIMARY} shadow-lift px-[26px] py-3.5 text-[15px]`}
            >
              Empieza a medir
            </Link>
            <a
              href={GITHUB_URL}
              target="_blank"
              rel="noreferrer"
              className={`${CTA_OUTLINE} px-6 py-[13px] text-[15px]`}
            >
              Ver el código
              <ArrowUpRight className="size-[13px]" strokeWidth={2} />
            </a>
          </div>
        </div>

        {/* Collage texturizado */}
        <div className="relative hidden h-[360px] w-[300px] shrink-0 lg:block">
          <div
            className="bg-muted bg-hatch shadow-card absolute top-0 left-5 flex h-[284px] w-[200px] -rotate-3 items-end rounded-lg p-3"
            data-hero-piece
          >
            <span className="bg-foreground text-background rotate-3 rounded-full px-3 py-1 font-mono text-[10px] tracking-[0.1em]">
              9:16 · 0:47
            </span>
          </div>
          <div
            className="bg-primary text-primary-foreground bg-halftone shadow-lift absolute right-0 bottom-6 flex w-[176px] rotate-3 flex-col gap-1.5 rounded-[18px] p-4"
            data-hero-piece
          >
            <span className="text-primary-foreground/60 font-mono text-[9.5px] tracking-[0.14em]">
              SNAPSHOT DIARIO
            </span>
            <span className="text-[26px] leading-none font-medium tracking-[-0.03em]">
              08:35
            </span>
            <span className="text-primary-foreground/60 font-mono text-[10px]">
              captura #417 · 2 plataformas
            </span>
          </div>
          <div
            className="bg-foreground absolute -top-4 right-6 flex size-16 rotate-6 items-center justify-center rounded-full"
            data-hero-piece
          >
            <Activity
              className="text-primary dark:text-background size-[26px]"
              strokeWidth={1.9}
            />
          </div>
        </div>
      </section>

      {/* Bento del producto */}
      <section id="producto" className="flex scroll-mt-6 flex-col gap-3.5">
        <div className="grid gap-3.5 md:grid-cols-3" data-reveal-stagger>
          <div className="bg-card shadow-card flex flex-col gap-3.5 rounded-lg p-5">
            <div className="flex items-center gap-2.5">
              <div className="bg-foreground/10 text-foreground flex size-[26px] items-center justify-center rounded-[9px]">
                <Eye className="size-3.5" strokeWidth={1.9} />
              </div>
              <span className="text-[13px] font-medium">Vistas de la semana</span>
            </div>
            <div className="flex items-baseline gap-2">
              <span className="text-[44px] leading-none font-medium tracking-[-0.03em]">
                683,5
              </span>
              <span className="text-muted-foreground font-mono text-xs">
                mil · 57% TT
              </span>
            </div>
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
          </div>

          <div className="bg-primary text-primary-foreground bg-halftone shadow-card flex flex-col gap-3.5 rounded-lg p-5">
            <div className="flex items-center gap-2.5">
              <div className="bg-primary-foreground/10 flex size-[26px] items-center justify-center rounded-[9px]">
                <UserPlus className="size-3.5" strokeWidth={1.9} />
              </div>
              <span className="text-[13px] font-medium">Seguidores nuevos</span>
            </div>
            <div className="flex items-baseline gap-2">
              <span className="text-[44px] leading-none font-medium tracking-[-0.03em]">
                +1.951
              </span>
              <span className="text-primary-foreground/60 font-mono text-xs">
                en 7 días
              </span>
            </div>
            <p className="text-primary-foreground/60 text-[12.5px] leading-[1.45]">
              Cada delta se atribuye al día en que ocurrió, no al día en que el
              cron lo capturó.
            </p>
          </div>

          <div className="bg-foreground text-background shadow-lift relative flex flex-col gap-2.5 overflow-hidden rounded-lg p-5">
            <div
              className={`${HATCH_INVERT} absolute inset-y-0 right-0 w-14 opacity-50`}
              aria-hidden
            />
            <span className="bg-primary text-primary-foreground relative self-start rounded-full px-2.5 py-[3px] font-mono text-[9.5px] tracking-[0.14em]">
              MEJOR VIDEO
            </span>
            <p className="relative pr-12 text-xl leading-[1.2] font-medium tracking-[-0.015em]">
              Día 5 del SoloQ Challenge y todos estancados
            </p>
            <div className="bg-background text-foreground relative flex w-fit items-center gap-2.5 rounded-full py-2 pr-1.5 pl-[15px] text-[12.5px] font-medium">
              92,4 mil vistas
              <span className="bg-primary text-primary-foreground flex size-[22px] items-center justify-center rounded-full">
                <ArrowUpRight className="size-3" strokeWidth={2} />
              </span>
            </div>
          </div>
        </div>

        <div className="grid gap-3.5 lg:grid-cols-[2fr_1fr]" data-reveal-stagger>
          <div className="bg-card shadow-card flex flex-col gap-4 rounded-lg p-[22px]">
            <div className="flex items-center justify-between">
              <span className="text-[17px] font-medium tracking-[-0.02em]">
                La curva que las APIs no te dan
              </span>
              <div className="text-muted-foreground hidden gap-3.5 text-[11.5px] sm:flex">
                <span className="flex items-center gap-1.5">
                  <span className="bg-foreground size-[7px] rounded-full" />
                  TikTok
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="bg-primary ring-foreground/15 size-[7px] rounded-full ring-1" />
                  Instagram
                </span>
              </div>
            </div>
            <div className="flex h-[180px] items-end gap-2 sm:gap-3.5" data-bars>
              {WEEK_BARS.map((bar) => (
                <div
                  key={bar.day}
                  className="relative flex h-full flex-1 flex-col items-center justify-end gap-2"
                >
                  {"leader" in bar && (
                    <div className="bg-foreground text-background absolute -top-1.5 right-1 rounded-full px-2 py-[3px] font-mono text-[10px]">
                      {bar.leader}
                    </div>
                  )}
                  <div
                    className={
                      "leader" in bar
                        ? "bg-foreground outline-muted-foreground/40 flex w-[26px] flex-col justify-end rounded-full p-[3px] outline-1 outline-offset-[5px] outline-dashed"
                        : "bg-foreground flex w-[26px] flex-col justify-end rounded-full p-[3px]"
                    }
                    style={{ height: `${bar.h}%` }}
                    data-bar
                  >
                    <div
                      className="bg-primary dark:bg-background w-full rounded-full"
                      style={{ height: `${bar.ig}%` }}
                    />
                  </div>
                  <span
                    className={
                      "leader" in bar
                        ? "text-foreground font-mono text-[10px] font-medium"
                        : "text-muted-foreground font-mono text-[10px]"
                    }
                  >
                    {bar.day}
                  </span>
                </div>
              ))}
            </div>
          </div>

          <div className="bg-card shadow-card flex flex-col gap-3 rounded-lg p-[22px]">
            <span className="text-[15px] font-medium tracking-[-0.01em]">
              Secciones por hashtag
            </span>
            <div className="flex flex-col gap-2.5" data-bars-x>
              {SECTION_BARS.map((row) => (
                <div key={row.label} className="flex items-center gap-2.5">
                  <span className="text-muted-foreground w-[84px] text-xs">
                    {row.label}
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
              Etiqueta con un hashtag y cada sección se mide sola — sin
              migraciones, sin hojas de cálculo.
            </p>
          </div>
        </div>
      </section>

      {/* Parallax: la historia como capas */}
      <section
        className="bg-foreground shadow-rail relative h-[420px] overflow-hidden rounded-[26px] md:h-[520px]"
        data-plx-scope
        data-reveal
      >
        <div className="bg-halftone text-background absolute inset-0" aria-hidden />
        <div
          className="text-background/[0.07] absolute top-[-10px] left-6 flex flex-col gap-2.5 font-mono text-[42px] tracking-[-0.02em] whitespace-nowrap md:left-12"
          data-plx="slow"
          aria-hidden
        >
          {GHOST_ROWS.map((row) => (
            <span key={row}>{row}</span>
          ))}
        </div>

        <div className="relative flex h-full max-w-[620px] flex-col justify-center gap-4 px-8 md:px-16">
          <span className="bg-primary text-primary-foreground self-start rounded-full px-3 py-1 font-mono text-[10px] tracking-[0.14em]">
            PROFUNDIDAD
          </span>
          <h2
            className="text-background text-[32px] leading-[1.08] font-medium tracking-[-0.03em] md:text-[44px]"
            data-split
          >
            Cada día, una capa más de historia.
          </h2>
          <p className="text-background/60 max-w-[480px] leading-[1.55]">
            Los snapshots se apilan en silencio, hoy encima de ayer. Cuando
            necesitas la curva de un video, ya lleva semanas escribiéndose.
          </p>
        </div>

        <div className="absolute top-[66px] right-[200px] hidden lg:block" data-plx="mid">
          <div className="bg-background/10 text-background ring-background/15 shadow-lift flex -rotate-3 flex-col gap-1 rounded-[18px] px-4 py-3.5 ring-1">
            <span className="text-background/50 font-mono text-[9.5px] tracking-[0.12em]">
              HACE 14 DÍAS
            </span>
            <span className="text-2xl font-medium tracking-[-0.03em]">
              1.220 vistas
            </span>
          </div>
        </div>
        <div className="absolute right-[72px] bottom-[150px] hidden lg:block" data-plx="mid">
          <div className="bg-background/10 text-background ring-background/15 shadow-lift flex rotate-2 flex-col gap-1 rounded-[18px] px-4 py-3.5 ring-1">
            <span className="text-background/50 font-mono text-[9.5px] tracking-[0.12em]">
              HACE 7 DÍAS
            </span>
            <span className="text-2xl font-medium tracking-[-0.03em]">
              8.427 vistas
            </span>
          </div>
        </div>
        <div className="absolute right-[148px] bottom-11 hidden lg:block" data-plx="fast">
          <div className="bg-primary text-primary-foreground bg-halftone shadow-lift flex -rotate-2 flex-col gap-1 rounded-[18px] px-[18px] py-4">
            <span className="text-primary-foreground/60 font-mono text-[9.5px] tracking-[0.12em]">
              HOY
            </span>
            <span className="text-[30px] font-medium tracking-[-0.03em]">
              92.453 vistas
            </span>
          </div>
        </div>
      </section>

      {/* Cómo funciona */}
      <section
        id="como-funciona"
        className="flex scroll-mt-6 flex-col gap-[22px]"
      >
        <h2
          className="text-[34px] font-medium tracking-[-0.025em]"
          data-reveal
        >
          Tres pasos, cero mantenimiento
        </h2>
        <div className="grid gap-3.5 md:grid-cols-3" data-reveal-stagger>
          {STEPS.map((step) => (
            <div
              key={step.n}
              className="bg-card shadow-card flex flex-col gap-2.5 rounded-lg p-[22px]"
            >
              <span className="bg-primary text-primary-foreground self-start rounded-full px-3 py-[3px] font-mono text-[11px]">
                {step.n}
              </span>
              <span className="font-medium">{step.title}</span>
              <span className="text-muted-foreground text-[13.5px] leading-[1.5]">
                {step.body}
              </span>
            </div>
          ))}
        </div>
      </section>

      {/* Features */}
      <section
        id="mcp"
        className="grid scroll-mt-6 gap-3.5 sm:grid-cols-2 lg:grid-cols-4"
        data-reveal-stagger
      >
        {FEATURES.map((feature) => (
          <div
            key={feature.title}
            className="bg-card shadow-card flex flex-col gap-2.5 rounded-lg p-[18px]"
          >
            <div className="bg-foreground/10 text-foreground flex size-[26px] items-center justify-center rounded-[9px]">
              <feature.icon className="size-3.5" strokeWidth={1.9} />
            </div>
            <span className="text-sm font-medium">{feature.title}</span>
            <span className="text-muted-foreground text-[12.5px] leading-[1.5]">
              {feature.body}
            </span>
          </div>
        ))}
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
            Tu historia empieza el día que empiezas a guardarla.
          </h2>
          <p className="text-background/50 font-mono text-[11px] tracking-[0.14em]">
            SELF-HOSTED · NEXT.JS + SUPABASE · TUS DATOS SON TUYOS
          </p>
        </div>
        <Link
          href="/login"
          className="bg-background text-foreground hover:bg-background/90 relative shrink-0 rounded-full px-[30px] py-4 text-[15px] font-medium transition-colors"
        >
          Empieza a medir
        </Link>
      </section>

      {/* Footer */}
      <footer className="-mt-8 flex flex-col items-center justify-between gap-5 border-t pt-6 sm:flex-row">
        <div className="flex items-center gap-2.5">
          <div className="bg-primary text-primary-foreground flex size-[26px] items-center justify-center rounded-[9px]">
            <Activity className="size-[13px]" strokeWidth={1.9} />
          </div>
          <span className="text-[13px] font-medium">Reels Analytics</span>
        </div>
        <div className="text-muted-foreground flex items-center gap-6 font-mono text-[11px] tracking-[0.12em]">
          <a href="#producto" className="hover:text-foreground transition-colors">
            PRODUCTO
          </a>
          <a
            href="#como-funciona"
            className="hover:text-foreground transition-colors"
          >
            CÓMO FUNCIONA
          </a>
          <a href="#mcp" className="hover:text-foreground transition-colors">
            MCP
          </a>
          <a
            href={GITHUB_URL}
            target="_blank"
            rel="noreferrer"
            className="hover:text-foreground transition-colors"
          >
            GITHUB
          </a>
        </div>
        <span className="text-muted-foreground font-mono text-[11px] tracking-[0.12em]">
          © 2026 — HECHO PARA MEDIR
        </span>
      </footer>

      </main>
    </LandingMotion>
  );
}
