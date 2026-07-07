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
search_videos, get_video_stats con corte por edad, get_top_videos, get_growth_summary)
para consumirla desde Claude — p. ej. cruzar los guiones del vault de Obsidian con el
rendimiento real. Auth: `Authorization: Bearer MCP_SECRET` (excluido del middleware).

> Nota de UI: shadcn quedó sobre **Base UI** (`@base-ui/react`), no Radix. El `Button` NO
> soporta `asChild`; para un link con estilo de botón usar `buttonVariants()` en el
> `className` del `<Link>` (la polimorfía de Base UI es vía prop `render`, no `asChild`).

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

**Tipos de contenido (derivados al leer, NO persistidos):** el creador etiqueta cada video con un
hashtag identificador — **`#audioviral`**, **`#dui`**, **`#duiyhal`** (el `&` no es válido en
hashtags). Supabase guarda solo datos crudos; el tipo se deriva del `hashtags[]` ya guardado con
`classifyContentType` (`src/core/lib/content-type.ts`, precedencia `duiyhal > dui > audioviral`).
Cambiar reglas o sumar un tipo = editar ese diccionario, sin migración. Los tags reservados se
excluyen del ranking de hashtags temáticos (`topHashtags(rows, n, RESERVED_TAGS)`).

> Limitación conocida (IG): el cron persiste hasta 90 Reels (`MAX_REELS` en
> `modules/instagram/read.ts`). Con ~20 videos/semana, la historia **por video** de IG se congela
> para lo más viejo que ~4.5 semanas (el crecimiento de **cuenta** no se afecta). Follow-up: subir
> el tope solo del cron o backfill por lotes.

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

## Identidad visual — "Admin profesional" (índigo sobrio, claro + oscuro)

Estilo administrativo/dashboard, sobrio y neutral (migrado desde el antiguo "Arcane" gaming).
Soporta **tema claro y oscuro** con toggle.

- **Tokens** en `src/app/globals.css`: `:root` = **claro** (fondo `#f8fafc`, card `#ffffff`,
  texto `#0f172a`), `.dark` = **oscuro** (fondo slate desaturado `#0b0f1a`, card `#121826`,
  texto `#e2e8f0`). **Primario índigo** `#4f46e5` (claro) / `#6366f1` (oscuro); tenue `#64748b`
  / `#94a3b8`; borde `#e2e8f0` / `#1e293b`. Estados: `--success`, `--destructive` (con sus
  `-foreground`). Charts `--chart-1..5` (índigo/sky/teal/ámbar/slate). `--brand` alineado a
  índigo pero **sin uso** en componentes hoy.
- **Tema** vía `next-themes` (`src/components/theme-provider.tsx`, `attribute="class"`,
  `defaultTheme="system"`); `<html>` lleva `suppressHydrationWarning` (sin `class="dark"` fijo).
  El toggle vive en el footer del sidebar (`src/components/dashboard/theme-toggle.tsx`, cicla
  claro→oscuro→sistema).
- **Tipografía** (`layout.tsx`, next/font): `Inter` para todo (UI, números y titulares).
  `font-sans` y `font-display` apuntan a Inter; los `font-display` de los headings se conservan.
- Usar siempre **tokens semánticos** (`bg-primary`, `bg-card`, `text-muted-foreground`,
  `text-success`, `text-destructive`, `border`...) nunca hex crudo ni colores de Tailwind con
  número (`green-500`); así el componente se adapta a claro/oscuro solo.
- Reglas: 1 CTA primaria por vista, contraste WCAG AA, hover 150–300ms, sin emojis como iconos
  (usar Lucide/SVG).

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
