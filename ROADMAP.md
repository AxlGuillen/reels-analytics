# Roadmap de desarrollo

Plan por fases para las mejoras de análisis. Diseñado alrededor de los límites del
plan **Hobby de Vercel**: máx. **2 crons** (1 disparo/día cada uno, hora imprecisa),
**60 s** de `maxDuration`, y el rate limit de Instagram (~200 llamadas/usuario/hora,
verificar). Regla general: ninguna corrida de ingesta debe exceder ~150 llamadas a IG.

## Fase 0 — Sanear la ingesta (URGENTE: hay pérdida de datos activa)

**Problema:** `captureInstagram()` hereda `MAX_REELS = 90` del read del dashboard;
los Reels fuera del top-90 dejaron de recibir snapshots (su curva se congela).

**Diseño — rotación en el cron diario (sin segundo cron):**
- TikTok: catálogo completo cada día (las métricas vienen inline en `/video/list`,
  ~10 llamadas; es barato).
- Instagram, cada corrida diaria:
  1. **Franja reciente**: Reels publicados en los últimos ~30 días (insights 1×Reel).
  2. **Lote rotatorio**: los K (~50–60) Reels viejos con snapshot más antiguo
     (query a `ra_video_snapshots` por `max(captured_at)` asc). Los viejos casi no
     cambian; resolución semanal les basta.
- Presupuesto por corrida: ~90 recientes + ~60 rotados + paginación ≈ **<160
  llamadas**, dentro del rate limit y de los 60 s (concurrencia 6 ≈ 10–15 s).
- Separar el límite de la **ingesta** del límite del **dashboard** (el read vivo
  conserva su tope de 90; la ingesta usa el suyo propio).

**También en esta fase:**
- Visibilidad: "última captura hace X horas" por plataforma en `/settings/connections`
  (query barata a `max(captured_at)`), con aviso si >36 h.
- Refresh de docs: CLAUDE.md (auto-refresh y snapshots ya existen; dashboard con
  sidebar) y README (env vars nuevas de Supabase).

## Fase 1 — Motor de "vistas a edad N" (la base analítica)

**Problema que resuelve:** todo el análisis actual (mejor día/hora, hashtags, meses)
usa vistas acumuladas de por vida → confunde rendimiento con antigüedad del video.

- `viewsAtAge(series, days)`: interpola la serie de snapshots de un video para
  estimar sus vistas a los N días de publicado (N=7 por defecto).
- `initialVelocity(series)`: vistas/día en las primeras 48–72 h.
- Lectura bulk de series por video (extensión de `history.ts`; acotar columnas y
  ventana para no traer filas de más).
- **Tests con `bun test`** para la interpolación (primer test del repo; funciones
  puras de `insights.ts` como objetivo).
- UI: toggle en `/growth` — "vistas totales" vs "vistas a 7 días" para las gráficas
  de día/hora/hashtags.
- Limitación honesta: solo aplica a videos publicados después de que arrancó la
  ingesta; el corpus crece solo.

## Fase 2 — Breakouts y benchmark por video

Se apoya en la Fase 1.
- Curva mediana por tipo de contenido (y por plataforma): "el video típico de
  este tipo lleva X vistas a los D días".
- **Badge de breakout** en tablas: video con >2× la mediana a su misma edad.
- **Benchmark en el detalle** (`VideoGrowth`): superponer la curva mediana de su
  tipo y mostrar el múltiplo ("va 2.3× arriba del ritmo típico").

## Fase 3 — Quick wins analíticos

Independientes entre sí; se pueden intercalar.
- **Vistas por duración** (solo TikTok; `duration_s` ya está persistido): buckets
  <20 s / 20–40 s / 40–60 s / 60 s+.
- **Momentum del catálogo**: vistas GANADAS por mes calendario (delta de snapshots),
  complementa el actual "vistas de lo publicado cada mes".
- **Engagement ponderado** además del promedio simple en `summarize`.
- **Features de caption**: longitud, ¿lleva pregunta?, ¿emoji? → vistas promedio.

## Fase 4 — Atribución de seguidores

- Deltas diarios de `ra_account_snapshots.followers` cruzados con fechas de
  publicación: qué videos coinciden con picos de seguidores.
- Panel en `/growth`: "videos que trajeron seguidores" (correlación, no causalidad —
  decirlo en la UI).

## Fase 5 — Digest semanal (usa el 2.º y último slot de cron)

- Cron semanal (p. ej. lunes) → endpoint que arma el resumen: crecimiento de la
  semana, breakout de la semana (Fase 2), recordatorio de mejor día/hora (Fase 1).
- Canal: **Telegram bot** (gratis, sin verificación de dominio) o Resend (email,
  100/día gratis). Decidir al llegar.
- Nota: si algún día se necesita un tercer cron, alternativa = plegar el digest al
  cron diario (enviar solo si es lunes) y liberar el slot.

## Futuro ya anotado (sin fase asignada)

- **Versus cross-platform**: match por el texto del caption antes del primer hashtag
  (el "código" del creador). Retroactivo: el caption ya se persiste completo.
  Tabla `video_links` + página de comparativa con curvas superpuestas.
- **OAuth de Instagram**: quitar el token manual de env; reconectar desde la UI.
- **Publicar/agendar**: pospuesto (requiere salir del sandbox de TikTok, verificación,
  storage de videos y scheduler de hora exacta — fuera del alcance del plan Hobby).

## Reglas transversales

- Cada fase termina con `build` + `lint` + tests verdes y commit por bloque.
- Ingesta: nunca superar ~150 llamadas IG/corrida ni acercarse a 60 s.
- Nada de métricas derivadas persistidas: Supabase guarda crudo, lo derivado se
  calcula al leer (regla existente del proyecto).
