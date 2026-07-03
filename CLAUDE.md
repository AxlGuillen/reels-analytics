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
clicable, duración, hashtags, vistas/likes/comentarios/compartidos/engagement). Hay una
vista debug en `/debug/tiktok` que vuelca el JSON crudo.
Desplegado en Vercel (auto-deploy desde GitHub); se desarrolla contra el deploy porque
TikTok no acepta localhost como redirect URI.

> `insights.ts` agrega por día/hora usando `CREATOR_TIMEZONE` (default
> `America/Mexico_City`) porque el server corre en UTC; ajustar a la zona del público.

Pendiente: auto-refresh del token (hoy si expira se pide reconectar; el refresh irá en la
capa de ingesta con Supabase) y persistir snapshots.

> Nota de UI: shadcn quedó sobre **Base UI** (`@base-ui/react`), no Radix. El `Button` NO
> soporta `asChild`; para un link con estilo de botón usar `buttonVariants()` en el
> `className` del `<Link>` (la polimorfía de Base UI es vía prop `render`, no `asChild`).

**Orden de trabajo acordado (importante):** primero el core → luego resolver la conexión
real a TikTok/Instagram (OAuth) → mapear las respuestas crudas al modelo de dominio → y
**recién entonces** definir tipos y rutinas para crear/configurar Supabase. Es decir,
**Supabase está pospuesto a propósito**: el esquema de abajo es el diseño objetivo, aún no
existe migración ni conexión.

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

## Identidad visual — "Arcane" (dark neón morado)

Identidad definida con la skill `ui-ux-pro-max` (estilo *Data-Dense Dashboard*), tema
**dark-first** ligado a la marca de contenido del creador (persona gaming/League).

- **Tokens** en `src/app/globals.css` (`:root, .dark` comparten palette; `<html class="dark">`):
  fondo `#0f0f23`, card `#1e1c35`, **primario `#7c3aed`** (morado neón), acento de marca
  `--brand #f43f5e` (rosa-coral), texto `#e2e8f0` / tenue `#94a3b8`, borde `#302b57`.
  Los charts usan `--chart-1..5` (morado/rosa/cyan/violeta/ámbar).
- **Tipografía** (`layout.tsx`, next/font): `Russo One` = `font-display` (marca/titulares,
  úsala con moderación en textos grandes), `Chakra Petch` = `font-sans` (UI, números).
- No hay tema claro por ahora. Al agregar componentes, usar **tokens semánticos**
  (`bg-primary`, `text-muted-foreground`, `border`, `bg-brand`...) nunca hex crudo.
- Regla de la skill: 1 CTA primaria por vista, contraste WCAG AA, estados hover 150–300ms,
  sin emojis como iconos (usar SVG/Lucide).

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

## Modelo de datos (Supabase / Postgres) — PLANIFICADO, aún no implementado

> Diseño objetivo. Se materializará **después** de mapear las respuestas reales de las
> APIs (ver "Estado actual"). Los tipos en `src/core/domain/models.ts` son la fuente de
> verdad de la que se derivará este esquema.

Snapshots inmutables con timestamp; el histórico se construye acumulando filas.

| Tabla | Propósito | Campos clave |
|-------|-----------|--------------|
| `social_accounts` | cuenta del creador por plataforma | `platform`, `external_id`, `handle` |
| `connections` | tokens OAuth (sensible, solo service role) | `account_id`, `access_token`, `refresh_token`, `expires_at` |
| `account_snapshots` | métricas de cuenta en el tiempo | `account_id`, `captured_at`, `followers`, `total_views`, `total_likes` |
| `videos` | un video por plataforma | `account_id`, `platform`, `external_id`, `caption`, `hashtags text[]`, `published_at`, `url`, `duration_s` |
| `video_snapshots` | métricas de video en el tiempo | `video_id`, `captured_at`, `views`, `likes`, `comments`, `shares`, `saved` |

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
