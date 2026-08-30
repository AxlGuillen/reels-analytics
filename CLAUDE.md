# CLAUDE.md

Guía para trabajar en este repositorio. Léela antes de hacer cambios.

## Qué es esto

**reels-analytics** es una app propia para un creador de contenido que publica videos
verticales en **TikTok** e **Instagram (Reels)**. El objetivo es **centralizar** las
métricas de ambas plataformas en una sola base de datos, guardar **snapshots históricos**
para medir crecimiento en el tiempo, y analizar el rendimiento por video (vistas, likes,
comentarios, compartidos, hashtags, horario/día de publicación, etc.).

> Facebook queda **fuera de alcance por ahora** (se descartó explícitamente). El diseño
> debe permitir sumarlo después sin reescribir el core.

Idea central del producto: las APIs oficiales devuelven el **estado actual** de una
métrica, no su historia. Por eso el valor de la app está en **ingerir snapshots
periódicos y persistirlos**; el crecimiento se calcula comparando snapshots.

## Estado actual

Core inicializado. **Ya hecho:** scaffold de Next 16 + Tailwind 4 + shadcn, estructura
modular (`core/` + `modules/tiktok` + `modules/instagram`), modelo de dominio normalizado,
contrato `PlatformProvider`, providers stub (lanzan `NotImplementedError`), registry,
utilidades (hashtags, fechas), config de env validada y shell del dashboard con las dos
secciones separadas. `build`, `lint` y `tsc` pasan limpios.

**TikTok (integración funcional):** OAuth Login Kit con PKCE + state
(`modules/tiktok/oauth.ts`); sesión interina en cookie httpOnly
(`modules/tiktok/session.ts`, se reemplazará por Supabase); rutas
`app/api/auth/tiktok/{login,callback}`. **Lectura de datos ya implementada:**
`api.ts` (cliente Display API: user/info, video/list, video/query), `mappers.ts`
(raw → dominio), `provider.ts` (contrato completo), `read.ts` (overview para la UI con
estados disconnected/expired/error/ok). Se paginan TODOS los videos (`read.ts`, tope 10 páginas).
El dashboard muestra header de perfil (avatar, @usuario, verificado, bio, seguidores/
siguiendo/likes/videos), **analítica derivada** (`modules/analytics/insights.ts`:
mejor día/hora, engagement rate, top hashtags, promedios) y tabla enriquecida (miniatura
clicable, duración, hashtags, vistas/likes/comentarios/compartidos/engagement). Cada video
tiene vista de detalle (`/video/{tiktok,instagram}/[id]`) con su curva de crecimiento.
Desplegado en Vercel (auto-deploy desde GitHub); se desarrolla contra el deploy porque
TikTok no acepta localhost como redirect URI.

> `insights.ts` agrega por día/hora usando `CREATOR_TIMEZONE` (default
> `America/Mexico_City`) porque el server corre en UTC; ajustar a la zona del público.

**Ingesta (funcional):** cron diario de Vercel (`/api/cron/ingest`, protegido con
`CRON_SECRET`, `maxDuration=60`) captura snapshots de ambas plataformas. Los tokens viven
en `ra_connections` y se **auto-refrescan antes de usar** (`modules/accounts/tokens.ts`).
Instagram usa **rotación**: franja reciente (30 días) + lote de ~50 Reels viejos con el
snapshot más antiguo por corrida — así todo el catálogo recibe snapshot al menos semanal
sin exceder el rate limit de IG (~200 llamadas/usuario/hora) ni los 60 s del plan Hobby
(máx. 2 crons, 1 disparo/día). El 2.º cron (`/api/cron/digest`, lunes) manda un **digest
semanal por Telegram** (`modules/digest`, `core/lib/telegram.ts`) que además hace de
watchdog de la ingesta. Ver `ROADMAP.md` para las fases de análisis planificadas.

**Servidor MCP** (`/api/mcp`, route en `app/api/[transport]/route.ts` con `mcp-handler`):
expone la analítica persistida como tools de solo lectura (`modules/mcp/tools.ts`:
search_videos, get_video_stats con corte por edad, get_top_videos, get_growth_summary,
get_activity_timeline día/semana/mes, get_hashtag_stats, compare_platforms,
get_breakouts, get_script_stats_block → YAML para el frontmatter de guiones)
para consumirla desde Claude — p. ej. cruzar los guiones del vault de Obsidian con el
rendimiento real.

> Los textos de las tools (nombre/título/descripción) viven en `modules/mcp/catalog.ts`
> (`MCP_TOOLS` + `TOOL_META`): los consumen el `registerTool` del route handler y la página
> `/settings/mcp`, para que no se desincronicen. Los esquemas zod siguen junto a cada tool.

**Benchmark por cohorte semanal (neutraliza el crecimiento de audiencia):** el múltiplo
"vs. lo típico" de un video (`modules/analytics/breakouts.ts`) NO se calcula contra todo el
catálogo sino contra **los videos publicados su misma semana** (`weeklyCohort` en
`timeseries.ts`, puro y testeado). Motivo: la audiencia creció ~3.5× en seis semanas, así
que comparar un video de julio contra uno de agosto mezcla "mejor contenido" con "más
seguidores" — un múltiplo contra cohorte semanal sí es comparable entre meses. Si una
semana no junta `MIN_COHORT` (4) miembros, cae al catálogo completo y lo reporta en
`scope: "week" | "all"`; la UI (`video-growth.tsx`) y el MCP (`cohortScope`) lo muestran en
vez de fingir precisión.

**Health check (`/api/health`, para monitoreo externo):** `modules/health/{status,checks}.ts`
(`status.ts` es la parte pura y testeada: tipos + `rollupStatus`; `checks.ts` toca BD/red).
Chequea: `database`, `page` (self-fetch a `/login`), `mcp` (self-fetch a `/api/mcp` sin token →
debe dar **401 con `WWW-Authenticate`**), `ingestion.*` (reusa `getCaptureStatus`), `tokens.*`
(solo FECHAS de `ra_connections`, nunca el token) y `mcp.connectors`. **Sin credencial** devuelve
solo `{status, checkedAt}`; con `Authorization: Bearer $HEALTH_SECRET`, el desglose. **503 solo si
algo está roto** (`down`); los avisos (ingesta >36 h, token a <7 días) son `degraded` con 200.
`HEALTH_SECRET` es aparte de `CRON_SECRET` a propósito: esa URL se le da a un monitor externo y
con el del cron podría disparar la ingesta. Excluido del proxy.

**Página MCP (`/settings/mcp`):** guía dentro de la app — la URL del servidor, cómo agregarlo
como conector remoto (OAuth, sin pegar tokens), el comando de Claude Code (con el secreto como
placeholder: nunca se renderiza), el listado de **conectores autorizados** (`listConnectedClients`,
marca "activo" vs "sin autorizar" según tenga tokens vigentes) y el catálogo de tools. Enlazada
en el footer del sidebar junto a Conexiones.

**Auth del MCP — OAuth 2.1 + Bearer estático (ambos vigentes):**
- **OAuth 2.1** (lo que exige el spec MCP para servidores remotos; es lo que usan los conectores
  de Claude/Cowork, cuyo diálogo solo acepta URL). La app es a la vez resource server y
  authorization server. Lógica en `modules/oauth/{config,tokens,store}.ts`:
  - Descubrimiento: `/.well-known/oauth-authorization-server` (RFC 8414, incluye
    `code_challenge_methods_supported:["S256"]` — sin eso los clientes abortan) y
    `/.well-known/oauth-protected-resource` (RFC 9728, catch-all para servir también la
    variante `/api/mcp`). El 401 del MCP lleva `WWW-Authenticate` con `resource_metadata`.
  - Endpoints: `POST /api/oauth/register` (DCR, RFC 7591), `GET /oauth/authorize` (**página**
    con pantalla de consentimiento; reusa el login de Supabase) y `POST /api/oauth/token`
    (`authorization_code` con PKCE S256 + `refresh_token` con **rotación**).
  - Tokens **opacos guardados hasheados** en `ra_oauth_{clients,codes,tokens}` (no JWT: da
    revocación real y evita firmar a mano). El `resource` de la fila es el *audience*: un token
    emitido para otro recurso se rechaza. Los codes son de un solo uso (un intento con PKCE
    incorrecto también los quema).
- **`Authorization: Bearer MCP_SECRET`** (legacy) sigue funcionando: es el que usa el cliente
  de Claude Code ya configurado.
- **MCP público informativo (`/api/public/mcp`, SIN auth):** 4 tools en inglés que no tocan
  datos del creador (`modules/mcp/public.ts`: get_project_info, get_connection_guide,
  list_analytics_tools, get_service_status). Endpoint SEPARADO de `/api/mcp` a propósito: el
  servidor de analítica debe seguir dando 401 a los anónimos porque ese 401 dispara el flujo
  OAuth de los conectores. El proxy excluye `api/public`; listado en `ai-catalog.json` y
  mencionado en `auth.md`. El inglés compartido (resumen + guía de conexión) vive en
  `modules/mcp/discovery.ts` (`PRODUCT_SUMMARY_EN`, `mcpConnectionInfo("en")`) y lo reusa
  `landing.md` — ya no hay cadenas inglesas mantenidas a mano ahí.
- `APP_URL` define issuer y `resource` (fijo por env, nunca del header Host). El proxy excluye
  `.well-known`, `api/oauth`, `api/mcp|sse|message`; `/oauth/authorize` sí pasa por el proxy
  porque necesita sesión (y este redirige a `/login?next=…` preservando la query).

> Nota de UI: shadcn quedó sobre **Base UI** (`@base-ui/react`), no Radix. El `Button` NO
> soporta `asChild`; para un link con estilo de botón usar `buttonVariants()` en el
> `className` del `<Link>` (la polimorfía de Base UI es vía prop `render`, no `asChild`).

**Tours guiados (`src/components/tour/`, Driver.js):** onboarding por pantalla — spotlight
paso a paso sobre los elementos reales para que alguien nuevo entienda cada página.
- `steps.ts`: registro **puro** de pasos por ruta (`target` = `[data-tour="..."]`, título,
  descripción, `version`). Regla editorial: **máx. 6 pasos** y el copy dice *para qué sirve*,
  no *qué es*. Subir `version` re-muestra el tour a quien ya lo vio. `tourRouteFor` (puro)
  mapea pathname → clave (los detalles de video comparten `/video`).
- `page-tour.tsx` (client, montado al final de cada página): **auto-start solo la primera
  visita** (`tour-seen:<ruta>:vN` en localStorage); cerrar a medias también marca visto.
  `run-tour.ts` es el arranque compartido (singleton: un tour a la vez; navegar destruye el
  activo). El JS de driver.js se importa dinámico al arrancar. El **botón ?** del rail
  relanza el tour de la ruta actual.
- Anclas `data-tour` en las páginas (mismo idioma que `data-slot`). Las ausentes se filtran
  en runtime (estados vacíos degradan en silencio). **Dos tests guardianes**: `steps.test.ts`
  (forma y reglas editoriales) y `anchors.test.ts` (escanea `src/` y falla si un target
  pierde su ancla en un refactor, o si hay anclas muertas sin paso).
- Skin del popover en `globals.css` (bloque "Tour guiado"): tokens semánticos, CTA
  "Siguiente" en tinta, contador como chip lima, overlay `var(--foreground)` (se invierte
  con el tema). Especificidad doblada a propósito para ganar a driver.css sin `!important`.

**Landing pública (`/landing` es + `/en/landing` en, grupo `(marketing)`):** puerta de entrada
de marketing en Acid Grid, portada del diseño elegido en Claude Design (hero + collage
texturizado, bento del producto, banda parallax "Cada día, una capa más de historia", cómo
funciona, features, cierre y footer). El proxy deja pasar ambas variantes sin sesión y manda
`/` anónimo → `/landing` (el resto sigue yendo a `/login?next=`). Server Component con datos
de muestra reales; el movimiento vive en
`src/components/landing/landing-motion.tsx` (client, **wrapper con `useGSAP` de
`@gsap/react`**): **único punto de entrada de GSAP en la app** — import estático en el chunk
de la ruta (verificado: solo el manifest de `/landing` lo referencia; el dashboard no lo
descarga). Envuelve el `<main>` como scope: selectores acotados y cleanup automático de
tweens/ScrollTriggers/splits al desmontar. La **intro del hero es CSS puro**
(`.hero-item`/`.hero-piece` en globals, cascada por `animation-delay` inline): el H1 es el
elemento LCP y esperar al chunk de GSAP lo retrasaba ~2,5 s en móvil (PageSpeed) — GSAP se
queda solo con lo ligado al scroll. Contrato por atributos en el markup del server:
`data-reveal` (fade-up),
`data-reveal-stagger` (hijos en cascada), `data-bars`/`data-bar` y `data-bars-x`/`data-bar-x`
(barras que crecen con scaleY/scaleX, nunca height/width), `data-split` (titular palabra por
palabra con SplitText) y `data-plx="slow|mid|fast"` dentro de `data-plx-scope` (parallax con
`scrub: 0.6`, ±60/±130/±220 px; la capa `slow` — fondos — viaja en sentido CONTRARIO al resto:
el movimiento relativo entre capas es lo que se lee como profundidad, y por eso las capas
`slow` llevan sobre-alto/-inset extra para no exponer bordes). Respeta
`prefers-reduced-motion` vía `gsap.matchMedia` y sin JS la
página queda en su composición estática (todo usa `gsap.from`: el SSR es el estado final).
Las skills oficiales de GSAP viven en `.agents/skills/gsap-*` (consultarlas al tocar
animaciones). **Regla: no importar `gsap` ni `@gsap/react` fuera de
`src/components/landing/`.**

Detalles de dinamismo de la landing: anclas con **scroll suave** (CSS `scroll-behavior: smooth`
en `globals.css`, solo bajo `prefers-reduced-motion: no-preference`); la **banda parallax es
full-bleed** (breakout `w-screen` + márgenes negativos, sin transform para no pelear con GSAP;
el `overflow-x-clip` del layout de marketing evita la scrollbar horizontal, y el contenido
vuelve a la retícula con un contenedor interno de 1180px); textura `.bg-rings` (anillos
concéntricos tenues, tokens + alpha) como capas `aria-hidden` con `data-plx="slow"` detrás de
"Cómo funciona" y features, y **`.bg-graph`** (papel milimétrico: cuadrícula fina + dos cruces
de acento, una lima) detrás del hero — con `mask-image` de desvanecido para morir antes del
bento y NO repetir los anillos de abajo; **indicador de scroll** en el borde derecho
(riel `bg-border` de 5px fijo y centrado, cápsula `bg-primary` que crece con el avance total de
la página vía `data-scroll-progress`, scaleY con scrub; decorativo puro: `aria-hidden` +
`pointer-events-none`, solo desktop, `motion-reduce:hidden`, y `scale-y-0` en CSS para que sin
JS quede el riel vacío, no lleno); e **iconos animados** vía `LandingIcon`
(`src/components/landing/landing-icon.tsx`, client, mapa nombre→icono de `@animateicons`):
animan una vez al entrar al viewport (IntersectionObserver, se salta con reduced-motion) y en
hover — no usa GSAP. Jerarquía por tono extrapolada del bento: card 02 de los pasos en oscuro y
la card MCP de features en lima (una card de acento por rejilla). La landing soporta **tema
oscuro**: `ThemeToggle` con variante `pill` en el nav (píldora de 38px, a juego con los CTAs);
los dos únicos usos de lima-sobre-superficie-invertida llevan su swap `dark:`.

**i18n de la landing (es/en, sin librería):** TODO el copy vive en
`(marketing)/landing/content.ts` (`LandingCopy` tipado, instancias `es`/`en` + helper
`landingMetadata`); el markup es UNO (`landing/landing-page.tsx`, recibe `lang`) y las rutas
quedan finas: `/landing` (español, canonical histórico y `x-default`) y `/en/landing`. Metadata
por idioma en cada `page.tsx` (título/descripción, `og:locale` es_MX/en_US, canonical propio y
`alternates.languages` con hreflang cruzado); el layout de marketing ya NO define metadata. El
root layout fija `lang="es"` y `/en/landing` lo corrige tras hidratar con `SetHtmlLang`
(client-effect mínimo; los crawlers leen el idioma por hreflang/og:locale del SSR). Toggle de
idioma: píldora EN/ES en el nav + link en el footer (links cruzados, server-safe). Los ids de
sección (`#producto`, `#como-funciona`, `#mcp`) son contrato con nav/WebMCP y NO se traducen.
`/landing.md` acepta `?lang=en` (y la negociación por `Accept` desde `/en/landing`; detecta el
idioma por query O pathname, porque el rewrite conserva la URL original) reusando el mismo
`COPY`. **Regla editorial: al tocar copy de la landing se tocan AMBOS idiomas de `content.ts`
y se revisa `landing.md`.** Pasos y features se derivan de `COPY`; resumen y
bloque de conexión (ambos idiomas) salen de `modules/mcp/discovery.ts`, que también alimenta
la skill — la variante `es` de `mcpConnectionInfo` está ligada al sha256 del índice de skills.

El idioma del contenido se marca con `lang` en el propio `<main>` (llega en el SSR, así que un
lector de pantalla no anuncia `/en/landing` en español antes de hidratar); `SetHtmlLang` solo
corrige el elemento raíz después, para las heurísticas de traducción del navegador. Sitemap con `alternates.languages`, robots permite `/en/landing` y
el header `Link` de next.config cubre las tres entradas públicas.

**Assets reales de la landing (`public/assets/`):** frame 9:16 de un Reel
(`video-single.png`, en el collage del hero vía `next/image` + `fill`) y capturas del Overview
(`dashboard-{light,dark}.webp`, cierre del bento `#producto`; la variante sigue al tema con
`dark:hidden`/`dark:block` y la oculta NO se descarga gracias a `loading="lazy"`).
`videos-collection.png` (tira de 3 frames con vistas) está en assets pero aún sin usar.
Nada de ilustraciones/fotos IA decorativas: solo producto y contenido reales.

**Performance (PageSpeed ~91 → objetivo 95+):** además de la intro CSS del hero (ver arriba),
`browserslist` en package.json fija Baseline (Chrome/Edge/Firefox 111+, Safari 16.4+) para no
transpilar ni polyfilear de más (~14 KiB), y `experimental.inlineCss` en next.config mete el
CSS global en el HTML (el único request que bloqueaba el primer render, ~300 ms). El resto de
avisos del reporte (reflow forzado de ScrollTrigger, chunk de gsap como "JS sin usar") son el
costo aceptado del motor de scroll.

**Favicon y metadatos:** el icono de la app es `src/app/icon.svg` (marca "4XL", lima sobre tinta;
Next lo inyecta por convención de archivo — no declarar `icons` a mano). El mismo trazo vive como
componente en `src/components/brand-mark.tsx` (`BrandGlyph`, SVG en `currentColor`): es la marca
de TODOS los tiles de brand (rail del sidebar, header/drawer móvil, login, nav/footer/collage de
la landing) — el contraste lo pone la zona (tile lima → glifo tinta; superficie oscura → glifo
lima con swap `dark:`). No volver a usar el icono `Activity` como marca. Los dos paths del
glifo llevan clases (`brand-glyph-bar`/`brand-glyph-four`) para su **micro-animación CSS pura**
(bloque "Marca 4XL" en globals.css, sin GSAP — el glifo también vive en el dashboard): al hover
del tile contenedor (clase `group` en los tiles de rail/nav/footer/login) la barra se desliza y
el "4" hace un pop de ~250 ms; el tile del nav de la landing añade `brand-glyph-intro` (entrada
única al cargar). Todo bajo `prefers-reduced-motion: no-preference`. El root layout define
`metadataBase` (desde `APP_URL`), `lang="es"`, `title.template` ("%s · Reels Analytics") y
`viewport.themeColor` por tema; la metadata de la landing es por idioma (ver i18n arriba) con
`title.absolute` para esquivar el template, porque su título ya lleva la marca. La **tarjeta
social (OG)** se genera por código, no como PNG suelto: `landing/og-image.tsx`
(`ImageResponse` de `next/og`, hexes de marca fijados a mano porque satori no lee CSS vars;
Space Grotesk/JetBrains Mono se bajan de Google Fonts en build con el patrón `loadGoogleFont`
de la docs de Next, con fallback a la fuente default si falla) + los dos
`opengraph-image.tsx` (convención de archivo, `/landing` y `/en/landing`, prerender estático).
El copy sale del mismo `COPY`, así que los dos idiomas se actualizan solos; `twitter.card` es
`summary_large_image`. El proxy deja pasar `/landing/opengraph-image*` (los scrapers no tienen
sesión). El login enlaza de vuelta a `/landing` (marca del panel oscuro + link bajo el form).

**Supabase (base de datos + ingesta + cron, funcionando):** proyecto **`Axl-Projects`** (id
`impscwgourdxhdejwkhe`, región us-east-1, org de axl13.dev; proyecto paraguas → las tablas se
namespacean con prefijo **`ra_`**). Esquema de 5 tablas + enum `ra_platform` (migraciones
`create_ra_analytics_schema`, `harden_ra_set_updated_at_search_path`) con **RLS activado sin
políticas** (acceso solo server-side vía service role). Tipos en
`src/core/supabase/database.types.ts`. Cliente admin (`src/core/supabase/admin.ts`, secret key,
ignora RLS). Capa de ingesta (`modules/ingestion/{persist,capture}.ts`) escribe snapshots;
tokens en `ra_connections` con refresh (`modules/accounts/tokens.ts`). **Cron diario** a las
08:00 CDMX (`app/api/cron/ingest`, `vercel.json`, protegido con `CRON_SECRET`).

**Auth (login single-user, implementado):** Supabase Auth email+password para el único usuario
(el creador); registros deshabilitados en el Dashboard. Clientes `@supabase/ssr`:
`src/core/supabase/server.ts` (publishable key, cookies vía `next/headers`). La compuerta vive
en `src/proxy.ts` (convención `proxy.ts` de Next 16, ex-`middleware.ts`): `getUser()` + redirect
a `/login`; excluye `/login`, estáticos y `api/cron` (el cron se autentica con `CRON_SECRET`).
Defensa en profundidad extra: guard en `(dashboard)/layout.tsx` y en el server action de captura.
Login en `src/app/login/*` (`signInAction`/`signOutAction`); logout en el footer del sidebar.

**Vista de Crecimiento (lee de Supabase, implementada):** `src/app/(dashboard)/growth`. Es el
primer consumidor de los snapshots persistidos (las páginas por plataforma siguen leyendo en vivo).
Capa de lectura `modules/analytics/history.ts` (`readGrowth`, admin client): serie de crecimiento
de cuenta (`ra_account_snapshots`) + métrica vigente por video (última captura, ventana de 7 días,
dedupe en TS) reconstruida como `VideoWithMetrics` para reusar `insights.ts`. La vista muestra
seguidores en el tiempo (chart de líneas por plataforma), rendimiento por tipo, tabla por mes de
publicación, espaciado entre publicaciones y hashtags/día/hora. Filtro por plataforma vía
`?platform=`.

**Overview (`/`, cross-platform por periodo, lee de Supabase):** ya NO lee TikTok en vivo. Usa
`readOverviewSummary` (`modules/analytics/overview.ts`) sobre ambas plataformas. Selector de periodo
**Semana/Mes** + navegación ◀▶ (`src/components/dashboard/period-nav.tsx`, solo query params
`?period=&anchor=`, sin JS de cliente). El modelo de periodo vive en `modules/analytics/period.ts`
(puro, testeado: `resolvePeriod` semana/mes + sub-buckets día/semana + `sumOverPeriod`, sin navegar
al futuro). KPIs del periodo — **Videos publicados** (conteo) + **Vistas/Likes/Comentarios ganados**
(deltas vía `buildTimeline`) — combinados y con split TikTok/Instagram, + seguidores ganados. Barras
de vistas apiladas por plataforma (por día en semana, por semana en mes) y tipos de contenido
publicados con link a `/content`.

**Tipos de contenido (derivados al leer, NO persistidos):** el creador etiqueta cada video con un
hashtag identificador. Tipos actuales: **`dui`**, **`news`**, **`duiyhal`**, **`audioviral`**,
**`mundial2026`**, **`cumpleaneros`** (canónico vigente `#cumplelolero`; las grafías viejas
`cumpleañeros/cumpleaños/cumpleanos` son alias), **`soloqchallenge2026`** (tipo de EVENTO, con
fecha de fin ~mediados de ago 2026) y **`debatelolero`** (cierre del formato
concepto → explicación → debate). Los tipos de evento van ANTES que los de formato en la
precedencia: si un video cubre el evento, esa es su identidad aunque además sea narración. Cada tipo puede matchear **varios hashtags (alias)**:
`ContentTypeDef.tags[]` (el primero es el canónico) — p. ej. `mundial2026` cuenta tanto `#mundial`
como `#mundial2026`. Supabase guarda solo datos crudos; el tipo se deriva del `hashtags[]` ya
guardado con `classifyContentType` (`src/core/lib/content-type.ts`, precedencia
`duiyhal > soloqchallenge2026 > dui > news > mundial2026 > cumpleaneros > audioviral`). Cambiar reglas, sumar un tipo o
un alias = editar ese diccionario, sin migración. Los tags reservados (todos los alias) se excluyen
del ranking de hashtags temáticos (`topHashtags(rows, n, RESERVED_TAGS)`). `#humor` es el más usado
(~294 videos) pero se trata como **temático**, no como tipo, por decisión del creador.

**Vista Contenido (`/content`, implementada):** catálogo dividido por tipo. Resumen = una card
por tipo (iterando `groupByContentType`, dinámico — tipos nuevos aparecen solos) y drill-down vía
`?type=<key|unclassified>` (+ `?platform=`): KPIs del grupo (`summarize`) + listado cross-platform
con `VideoListTable` (`src/components/dashboard/video-list-table.tsx`, cada fila enlaza a
`/video/{platform}/{id}`; badge con acento por plataforma). El filtro de plataforma es el
componente compartido `src/components/dashboard/platform-filter.tsx` (preserva query extra); lo
usan /growth y /content. La tabla "Rendimiento por tipo" de /growth enlaza al drill-down.

> Limitación conocida (IG): el cron persiste hasta 90 Reels (`MAX_REELS` en
> `modules/instagram/read.ts`). Con ~20 videos/semana, la historia **por video** de IG se congela
> para lo más viejo que ~4.5 semanas (el crecimiento de **cuenta** no se afecta). Follow-up: subir
> el tope solo del cron o backfill por lotes.

**Agent-ready (isitagentready.com, implementado):** endpoints públicos de descubrimiento para
agentes/crawlers, todos fuera del proxy (extensiones y `.well-known` ya excluidos del matcher) y
con `APP_URL` como base:
- `robots.txt` (route handler, no la convención tipada: lleva líneas `Content-Signal`) con
  reglas explícitas para crawlers IA. **Política del creador: `search=yes, ai-input=yes,
  ai-train=no`.** `sitemap.ts` lista `/landing` y `/en/landing` (con hreflang).
- Headers `Link` (RFC 8288) en `/`, `/landing` y `/en/landing` vía `next.config.ts`, y
  **Markdown para agentes**: `/landing` (y `/en/landing`) con `Accept: text/markdown`
  reescriben a `/landing.md` (rewrites `beforeFiles` con condición `has`). **`landing.md` es
  contenido curado (pasos/features salen de `content.ts`, en ambos idiomas): al cambiar la
  landing de fondo, revisarlo también.**
- `/.well-known/`: `api-catalog` (RFC 9727), `mcp/server-card.json` (SEP-1649, draft),
  `ai-catalog.json` (ARD — cada entrada usa `identifier` con su URN `urn:air:…`, NO `id`),
  `agent-card.json` (A2A — redactado honesto: somos un servicio de datos vía MCP, sin endpoint
  JSON-RPC A2A; publica `url`+`preferredTransport` **y** `supportedInterfaces`, que declaran lo
  mismo para clientes de dos épocas del spec), `agent-skills/index.json` + su `SKILL.md` (el
  sha256 se calcula del mismo módulo: `modules/mcp/discovery.ts`, que centraliza también el
  resumen del producto). `/auth.md` (workos/auth.md) + bloque `agent_auth` en el AS metadata.
- **La superficie de auth para agentes va en INGLÉS** (decisión del creador: es el idioma del
  ecosistema que la consume) — `auth.md`, cuyo H1 debe ser literalmente `# Auth.md — …` porque
  los validadores lo buscan como heading, y las descripciones de scope del agent card. La
  pantalla de consentimiento sigue en español: la ve el creador, no un agente.
- El **Protected Resource Metadata** (RFC 9728, `oauth-protected-resource/[[...path]]`) se
  redacta a mano en vez de usar `protectedResourceHandler` de mcp-handler: ese helper solo emite
  `resource` y `authorization_servers`, y sin `scopes_supported` el agente no sabe qué scope
  pedir. Si se toca, `resource` y `authorization_servers` deben conservar su valor exacto (los
  clientes ya autorizados dependen de ellos).
- WebMCP: `src/components/landing/web-mcp.tsx` (client, feature-detect de
  `navigator.modelContext`; no-op donde no existe) con 3 tools simples.
- **No cubiertos por hosting en Vercel:** DNS-AID (requiere zona DNS propia + DNSSEC para
  publicar los SVCB/HTTPS `_index._agents.…`; `*.vercel.app` no lo permite — solo se
  desbloquea comprando dominio propio, y eso arrastra migrar `APP_URL`, que es el issuer OAuth
  y la identidad de los conectores MCP ya autorizados) y Web Bot Auth (firmas a nivel CDN).

## Stack

| Capa | Tecnología |
|------|-----------|
| Framework | **Next.js 16** (App Router, Server Components) |
| Lenguaje | **TypeScript** (strict) |
| Estilos | **Tailwind CSS** |
| UI | **shadcn/ui** (Radix + Tailwind) |
| Backend / DB | **Supabase** (Postgres, Auth, RLS, Edge Functions) |
| Gestor de paquetes | **bun** (usar `bun`, NO npm/pnpm/yarn) |

## Comandos

```bash
bun install                 # instalar dependencias
bun dev                     # servidor de desarrollo
bun run build               # build de producción
bun run lint                # lint
bunx shadcn@latest add <c>  # agregar un componente de shadcn
# Tipos de Supabase (regenerar tras cada migración de esquema):
bunx supabase gen types typescript --project-id <id> > src/core/supabase/database.types.ts
```

> Regla: **siempre usar `bun` / `bunx`**. No introducir `package-lock.json` ni
> `pnpm-lock.yaml`; el lockfile del proyecto es `bun.lock`.

## Identidad visual — "Acid Grid" (bento monocromo con acento ácido)

Dashboard bento: casi-blanco frío, tinta casi-negra y **un solo color**, el lima ácido.
Importado de un diseño de Claude Design (`Dashboard Rediseño`). Sustituye por completo a
la identidad anterior "Ledger" (papel cálido + teal + serif Spectral). Soporta **tema claro
y oscuro** con toggle.

### Contrato de estilo (la constitución; los PRs se revisan contra esto)

- **Dirección**: bento monocromo. Cards blancas de esquinas muy redondeadas flotando sobre
  un lienzo casi-blanco con grano de papel. La jerarquía la hacen el TAMAÑO y el PESO, no
  el color.
- **El lima es superficie, no texto (regla central)**: `--primary` (`#d9f24a`) se usa como
  **fondo** con tinta encima (`text-primary-foreground`). **Nunca** lima sobre blanco:
  no cumple AA. Marca lo destacado — el KPI hero, el segmento vivo de una gráfica, el tile
  del brand, el borde del avatar.
- **La CTA primaria es tinta**: el `Button` variante `default` es `bg-foreground
  text-background` (se invierte en oscuro). Pintar un CTA de lima es un error de sistema.
- **Jerarquía por tono (regla de rejilla)**: una rejilla de KPIs **nunca** va toda del
  mismo tono. La métrica principal se destaca en `accent` (lima) o `dark`; el resto queda
  en `plain`. Se implementa con `StatCard` (`src/components/dashboard/stat-card.tsx`,
  prop `tone: "plain" | "accent" | "dark"`), que ya resuelve el semitono y los colores de
  texto sobre fondo de color. **No dupliques cards de métrica a mano**: si necesitas una,
  usa `StatCard`.
- **Forma**: cards con `rounded-lg` (= `--radius`, 22px) y **solo sombra, sin borde**.
  Todo control (botón, chip, filtro, barra de gráfica) es **píldora** (`rounded-full`).
  Los tiles de icono son cuadrados de 26px con `rounded-[9px]`; los del rail, 38px con
  `rounded-[14px]`.
- **Tipografía**: **Space Grotesk** para todo — UI y titulares (`--font-sans`, y
  `--font-display`/`--font-heading` apuntan a la misma familia). **JetBrains Mono**
  (`--font-mono`) para unidades, porcentajes, ejes y cifras tabulares. Los números
  protagonistas van en grotesca con `font-medium` y `tracking-[-0.03em]`; los titulares con
  `tracking-[-0.025em]`. **Nada de serif.**
- **Texturas**: `.bg-grain` (ruido fractal, el lienzo de la app), `.bg-halftone` (retícula
  de puntos para cards de acento y oscuras) y `.bg-hatch` (rayado diagonal para
  placeholders 9:16 y avatares). Se aplican por clase, nunca inline.
- **Navegación**: **rail flotante** oscuro y redondeado (`rounded-[26px]`) con dos estados —
  **colapsado** (62px, icon-only, el canon del canvas y el default) y **expandido** (218px,
  filas con etiqueta). El toggle vive al pie del rail (chevron, decisión del creador) y la
  preferencia persiste en localStorage (`rail-collapsed`, external store sin flash de
  hidratación). En móvil se degrada a barra + drawer con etiquetas.
- **Plataformas**: el sistema es monocromo, así que TikTok/Instagram se distinguen por el
  contraste propio (tinta vs. lima), no por colores de marca. `--platform-tiktok` /
  `--platform-instagram` existen para eso y SOLO se usan en contextos comparativos.
- **Oscuro — separación por luz, no por sombra**: en oscuro card vs fondo ronda 1.2:1 y
  la sombra negra no separa; el límite lo dibuja un **anillo luminoso** de 1px (~7% de
  blanco, primera capa de `--elev-card/lift/rail`). Las superficies `bg-foreground` se
  **invierten a crema** en oscuro: sobre ellas el lima como TEXTO deja de leerse — usa un
  chip lima (`bg-primary text-primary-foreground`) o el swap `dark:text-primary-foreground`
  / `dark:bg-background` (ver login y la gráfica del Overview).
- **Contraste como test**: `src/app/theme-contrast.test.ts` parsea los tokens y falla si
  un par texto/fondo baja de AA (4.5:1) en cualquiera de los dos temas, o si el anillo
  luminoso desaparece de las elevaciones oscuras. Cambiar la paleta = pasar ese test.
- **Restricción**: 1 CTA primaria por vista; contraste AA en ambos temas; movimiento
  150–300 ms con significado y `prefers-reduced-motion` siempre; sin emojis como iconos
  (Lucide/AnimateIcons outline).

- **Tokens** en `src/app/globals.css`: `:root` = **claro** (fondo `#f1f1ee`, card `#ffffff`,
  tinta `#111211`), `.dark` = **oscuro** (fondo `#111211`, card `#1a1b19`, texto `#f4f4f1`).
  **Lima** `#d9f24a` en ambos temas. Tenue `#54564f` / `#a8a99f`; borde `#e8e9e3` /
  `#2b2c29`. `--success` es el propio acento (los positivos no son verdes);
  `--destructive` = rojo ladrillo. Charts `--chart-1..5` = escala tinta→lima→grises.
  El `--sidebar` es **oscuro también en tema claro** (el rail siempre contrasta).
- **Tema** vía `next-themes` (`src/components/theme-provider.tsx`, `attribute="class"`,
  **solo claro/oscuro**: `defaultTheme="light"` + `enableSystem={false}`, sin opción
  "system"); `<html>` lleva `suppressHydrationWarning`. El toggle vive en el rail
  (`src/components/dashboard/theme-toggle.tsx`, variantes `row` / `icon` / `rail`) y
  **alterna solo claro ↔ oscuro** (usa `resolvedTheme`). Anima un **circular reveal**
  (View Transitions API + `flushSync`, 300 ms) y degrada a cambio instantáneo sin soporte
  o con `prefers-reduced-motion`.
- **Nota**: `lucide-react` v1 **ya no trae iconos de marca**; el de Instagram se importa de
  `@animateicons/react/lucide`.
- Usar siempre **tokens semánticos** (`bg-primary`, `bg-card`, `text-muted-foreground`,
  `text-destructive`, `border`, `bg-foreground`...) nunca hex crudo ni colores de Tailwind
  con número (`green-500`); así el componente se adapta a claro/oscuro solo.

## Arquitectura

Estilo **modular / puertos y adaptadores (ports & adapters)**. Cada plataforma es un
**módulo aislado** que implementa un **contrato común**, de modo que la capa de analítica
y la UI no dependen de los detalles de cada API.

```
Plataforma (TikTok / Instagram)
        │  adapter implementa PlatformProvider
        ▼
  Normalización (mappers → modelo de dominio único)
        ▼
  Persistencia (Supabase: snapshots con timestamp)
        ▼
  Capa de lectura / analítica (agrega, compara en el tiempo)
        ▼
  UI (dashboard, App Router)
```

### Contrato común de plataforma

Todos los módulos exponen el mismo puerto. Agregar una plataforma nueva = crear un módulo
que implemente esta interfaz, sin tocar el core:

```ts
type Platform = "tiktok" | "instagram";

interface PlatformProvider {
  readonly platform: Platform;
  getAccountStats(conn: Connection): Promise<AccountStats>;   // seguidores, views, likes
  listVideos(conn: Connection, cursor?: string): Promise<VideoPage>;
  getVideoMetrics(conn: Connection, externalIds: string[]): Promise<VideoMetrics[]>;
}
```

Los adapters devuelven **modelo de dominio normalizado**, nunca la forma cruda de la API.
La forma cruda se convierte en `mappers/`.

### Estructura de carpetas (objetivo)

```
src/
  app/                      # App Router: rutas finas, sin lógica de negocio
    (dashboard)/            #   pantallas del dashboard
    api/                    #   route handlers (webhooks, jobs de ingesta)
    layout.tsx
  modules/                  # dominios de negocio, aislados entre sí
    tiktok/
      api/                  #   llamadas HTTP a TikTok Display API
      mappers/              #   raw API -> modelo de dominio
      provider.ts           #   implementa PlatformProvider
      types.ts
    instagram/
      api/                  #   llamadas a Instagram Graph API
      mappers/
      provider.ts
      types.ts
    accounts/               # gestión de conexiones OAuth / cuentas
    analytics/              # agregación cross-platform y cálculo de crecimiento
  core/                     # infraestructura compartida (sin lógica de dominio)
    supabase/               #   clients: server.ts, browser.ts, admin.ts + database.types.ts
    domain/                 #   modelos normalizados y el contrato PlatformProvider
    config/                 #   env vars validadas
    lib/                    #   utilidades (parseo de hashtags, fechas, etc.)
  components/
    ui/                     # componentes de shadcn
```

**Reglas de dependencia:**
- `modules/*` puede importar de `core/`, nunca de otro `modules/*` hermano.
- `app/` orquesta módulos pero no contiene lógica de negocio.
- Cross-platform vive en `modules/analytics`, que consume el modelo normalizado, no adapters concretos.

## Modelo de datos (Supabase / Postgres) — CREADO (prefijo `ra_`)

> Ya aplicado en el proyecto `Axl-Projects`. Los tipos en `src/core/domain/models.ts` son la
> fuente de verdad; el esquema los refleja. Todas las tablas llevan prefijo `ra_` (Postgres:
> snake_case, sin guiones ni mayúsculas). Enum `ra_platform` = `'tiktok' | 'instagram'`.

Snapshots inmutables con timestamp; el histórico se construye acumulando filas.

| Tabla | Propósito | Campos clave |
|-------|-----------|--------------|
| `ra_social_accounts` | cuenta del creador por plataforma | `platform`, `external_id`, `handle` |
| `ra_connections` | tokens OAuth (sensible, solo service role) | `account_id`, `access_token`, `refresh_token`, `expires_at` |
| `ra_account_snapshots` | métricas de cuenta en el tiempo | `account_id`, `captured_at`, `followers`, `total_views`, `total_likes` |
| `ra_videos` | un video por plataforma | `account_id`, `platform`, `external_id`, `caption`, `hashtags text[]`, `published_at`, `url`, `duration_s` |
| `ra_video_snapshots` | métricas de video en el tiempo | `video_id`, `captured_at`, `views`, `likes`, `comments`, `shares`, `saved` |

- **Hashtags, horario y día**: no existen como campos de API; se **derivan** al ingerir
  (parseo de `#\w+` desde el caption/description; `published_at` viene del `timestamp` /
  `create_time` de la plataforma).
- **RLS activado** en todas las tablas. `connections` nunca se expone al cliente.
- Regenerar `database.types.ts` tras cada migración.

## Integración de plataformas (a futuro)

Ambas requieren: cuenta profesional/creador, app de desarrollador registrada, OAuth y
**App Review** para desbloquear scopes de datos. Los tokens caducan → implementar refresh.

### TikTok — Display API (Login Kit)
- **NO** confundir con Marketing API (ads) ni Research API (académica).
- Cuenta: `GET /v2/user/info/` con scope `user.info.stats` → `follower_count`,
  `following_count`, `likes_count`, `video_count`.
- Videos: `POST /v2/video/list/` con scope `video.list` → `view_count`, `like_count`,
  `comment_count`, `share_count`, `collect_count` (a veces), `create_time`,
  `video_description` (de aquí se parsean hashtags), `share_url`, duración.
- Las métricas son **snapshots puntuales** (no series). El scope `video.list` exige App
  Review y TikTok es estricto (requiere política de privacidad publicada, etc.).

### Instagram — Graph API (Instagram API with Instagram Login)
- Requiere cuenta **Professional** (Business/Creator). Ya no exige Página de Facebook.
- Cuenta: campos `followers_count`, `follows_count`, `media_count`; insights de cuenta vía
  `GET /{ig-user-id}/insights` (`reach`, `views`, `profile_views`, ...).
- Videos (filtrar `media_product_type = REELS`): campos `caption`, `timestamp`,
  `like_count`, `comments_count`, `permalink`; insights vía `GET /{media-id}/insights`
  (`views`, `reach`, `likes`, `comments`, `shares`, `saved`, watch time de Reels).
- Ojo con deprecaciones por versión de Graph API (fijar versión en las llamadas).

### Límites conocidos (no disponibles por API oficial)
- Métrica de **"enviados" (sends/DMs)** por separado: no se expone (IG da `shares` global).
- Demografía de audiencia: parcial/limitada en IG, casi nula en TikTok Display API.

## Convenciones

- TypeScript `strict`. Nada de `any` salvo justificación.
- Validar variables de entorno en `core/config` (fallar en arranque si faltan).
- Server Components por defecto; `"use client"` solo cuando haga falta interactividad.
- No poner secretos en el cliente; toda llamada a APIs de plataforma ocurre en el servidor.
- Commits: en inglés, imperativo, scope por módulo cuando aplique (`tiktok:`, `instagram:`).
