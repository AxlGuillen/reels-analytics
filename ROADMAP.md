# Roadmap de desarrollo

Plan por fases para las mejoras de análisis. Diseñado alrededor de los límites del
plan **Hobby de Vercel**: máx. **2 crons** (1 disparo/día cada uno, hora imprecisa),
**60 s** de `maxDuration`, y el rate limit de Instagram (~200 llamadas/usuario/hora,
verificar). Regla general: ninguna corrida de ingesta debe exceder ~150 llamadas a IG.

> **Estado (ago 2026): las fases 0–5 están implementadas.** Se conservan porque
> documentan POR QUÉ cada pieza es como es (presupuestos de llamadas, sesgos que
> se quisieron evitar, límites del plan Hobby) — eso sigue siendo la referencia al
> tocarlas. Lo único pendiente de la fase 3 son las *features de caption*.
>
> Este roadmap cubre **solo la analítica**. Lo construido fuera de ese eje (servidor
> MCP + OAuth 2.1, endpoints agent-ready, landing pública bilingüe, health check,
> tours guiados) se documenta en `CLAUDE.md`.

## Fase 0 — Sanear la ingesta ✅ HECHO

> Implementado: rotación en `modules/ingestion/capture.ts` y visibilidad de última
> captura vía `getCaptureStatus` (`modules/ingestion/status.ts`).

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

## Fase 1 — Motor de "vistas a edad N" ✅ HECHO

> Implementado en `modules/analytics/timeseries.ts` (`viewsAtAge`, `initialVelocity`),
> puro y con tests.

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

## Fase 2 — Breakouts y benchmark por video ✅ HECHO

> Implementado en `modules/analytics/breakouts.ts`. El benchmark acabó siendo por
> **cohorte semanal**, no por mediana global — ver CLAUDE.md.

Se apoya en la Fase 1.
- Curva mediana por tipo de contenido (y por plataforma): "el video típico de
  este tipo lleva X vistas a los D días".
- **Badge de breakout** en tablas: video con >2× la mediana a su misma edad.
- **Benchmark en el detalle** (`VideoGrowth`): superponer la curva mediana de su
  tipo y mostrar el múltiplo ("va 2.3× arriba del ritmo típico").

## Fase 3 — Quick wins analíticos ✅ HECHO (salvo caption)

> Hechos: buckets de duración (`viewsByDuration`), momentum (`gainedByMonth`) y
> engagement ponderado (`weightedEngagement` en `summarize`). **Pendiente: features
> de caption.**

Independientes entre sí; se pueden intercalar.
- **Vistas por duración** (solo TikTok; `duration_s` ya está persistido): buckets
  <20 s / 20–40 s / 40–60 s / 60 s+.
- **Momentum del catálogo**: vistas GANADAS por mes calendario (delta de snapshots),
  complementa el actual "vistas de lo publicado cada mes".
- **Engagement ponderado** además del promedio simple en `summarize`.
- **Features de caption**: longitud, ¿lleva pregunta?, ¿emoji? → vistas promedio.

## Fase 4 — Atribución de seguidores ✅ HECHO

> Implementado en `modules/analytics/attribution.ts` (`dailyFollowerDeltas`).

- Deltas diarios de `ra_account_snapshots.followers` cruzados con fechas de
  publicación: qué videos coinciden con picos de seguidores.
- Panel en `/growth`: "videos que trajeron seguidores" (correlación, no causalidad —
  decirlo en la UI).

## Fase 5 — Digest semanal ✅ HECHO

> Implementado en `modules/digest` + `core/lib/telegram.ts`, disparado por
> `/api/cron/digest` los lunes. Canal elegido: **Telegram**.

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
  (Sigue pendiente: `INSTAGRAM_ACCESS_TOKEN` continúa siendo un token de larga
  duración en env, auto-extendido antes de usarse.)
- **Publicar/agendar**: pospuesto (requiere salir del sandbox de TikTok, verificación,
  storage de videos y scheduler de hora exacta — fuera del alcance del plan Hobby).
- **Tope de 90 Reels de IG en la ingesta**: la rotación de la fase 0 cubre el catálogo,
  pero `MAX_REELS` sigue acotando cuántos Reels ve cada corrida. Subir el tope solo del
  cron, o hacer un backfill por lotes.

## Experimento abierto: retest de `audioviral` (desde 24 jul 2026)

**Contexto.** Con 16 videos, `audioviral` era el peor tipo por video: mediana 1,188
vistas a 7d vs 4,322 de `dui` (narración), y **techo duro** — en 16 intentos ninguno
pasó de 3,232 vistas, mientras `dui` llegó a 267k. Se descartó por eso.

**Por qué se retoma.** La razón principal que dio el creador es **variedad y
sostenibilidad de contenido**, no una expectativa de mejor rendimiento — un catálogo
monoformato desgasta a la audiencia y al creador. Además: (a) 16 es muestra chica;
(b) la audiencia creció fuerte desde
entonces (TikTok 2.2k → 3.5k en julio), así que el dato viejo puede no aplicar;
(c) **el costo de producción es muy distinto**: `audioviral` toma poco tiempo,
`dui` bastante más — y el creador está entrando en desgaste creativo. Un formato
barato que sostiene la cadencia puede valer más que su rendimiento por video.

**Diseño.** Publicar `audioviral` a **máximo 1/día** hasta acumular **50 videos**
del tipo (16 previos + ~34 nuevos). El sistema ya lo clasifica solo (`content-type.ts`),
así que no hay trabajo de tracking.

**Regla de decisión (pre-comprometida, para no mover la portería).** Al llegar a 50:

- **Se queda** si la mediana a 7d sube a **≥ 2,000** vistas, **o** si al menos un
  video supera **10,000** vistas (prueba de que el techo no es duro).
- **Se descarta** si la mediana sigue **< 2,000** *y* ningún video pasó de 10,000.
- **Criterio de costo (el que manda si el resultado queda en zona gris):** comparar
  **vistas por hora de producción**, no por video. Si `dui` cuesta N× el tiempo de
  `audioviral`, entonces `audioviral` solo necesita `mediana_dui / N` para empatar.
  Con la mediana actual (4,322 vs 1,188) el punto de equilibrio está en **N ≈ 3.6**:
  si narrar cuesta 3.6× o más que un audio viral, `audioviral` ya es competitivo
  por hora invertida. **Pendiente: medir el tiempo real de producción de cada tipo.**

**Nota de sostenibilidad.** La cadencia sostenida importa: publicar 2–3/día no
canibaliza (mediana por video incluso sube de 1 a 3 videos/día; cae en 4+). Un
formato de bajo costo tiene valor de portafolio si evita que la producción se
detenga por desgaste.

## Seguimiento abierto: ¿la audiencia de `audioviral` es de calidad? (desde 4 ago 2026)

**Contexto.** El retest de `audioviral` se resolvió a favor y por goleada: con audiencia
más grande el formato despegó (era vieja de 16 videos: 0 pasaron de 3.6k vistas; era nueva
de 18: **27.8% pasa de 20k**, máximo 149k). El mecanismo son los **compartidos** — dos
Reels acumularon ~11k cada uno — y los días con `audioviral` ganan **3.25× más seguidores**
(312/día vs 96/día). La tesis del creador (portafolio de apuestas baratas donde una paga
por todas) quedó confirmada, e incluso era conservadora.

**Lo que NO sabemos y hay que vigilar.** Que traiga seguidores no significa que traiga
seguidores *útiles*: alguien que llegó por un meme de audio puede no consumir las
narraciones (`dui`), que son el contenido caro y de marca. Hoy medimos **cantidad** de
audiencia, no **encaje**.

**Cómo medirlo (en ~3–4 semanas, cuando haya cohorte).** Cruzar el crecimiento de
seguidores contra el rendimiento de `dui`:

- **Señal buena**: suben los seguidores y las vistas/mediana de `dui` suben con ellos →
  la audiencia nueva sí consume el contenido de marca.
- **Señal de alarma**: los seguidores suben pero la **mediana de `dui` se estanca o cae**
  → estás inflando el número de seguidores con gente que no te ve; el alcance orgánico por
  seguidor se diluye.

Métricas concretas: mediana de vistas a 7d de `dui` por semana, y ratio
`vistas_dui / seguidores` a lo largo del tiempo (si cae de forma sostenida, es dilución).

**Riesgo colateral ya identificado.** Rendimientos decrecientes por selección: `audioviral`
pega porque el audio tiene tracción. Subir a 3/día obligaría a usar audios mediocres y la
tasa de pegue caería. Recomendación vigente: **1–2/día**, no más.

## Experimento abierto: formato "concepto → explicación → debate" (desde 17 ago 2026)

**Contexto.** Terminó el SoloQ Challenge, que ocupaba 1 de los 3 slots diarios y era
el motor de alcance (1.09M vistas). Su lección **no** fue "los eventos funcionan": fue
que **el gancho narrativo funciona y el parte diario cansa** — los que explotaron
fueron el de contexto (70k) y "Día 5 **y todos estancados**" (92k), mientras los
"Día N" a secas cayeron a 5.7k.

**El formato.** Un concepto del torneo (p. ej. *el mental*) → video de explicación
científica/psicológica con la sección Hal y Dui → cierre en debate con más voces.
Lo respalda la estructura: es serializado (la fuerza de SoloQ), trae gancho integrado
en cada entrega, empuja a formato largo, y **resuelve el cuello de botella real del
creador — idear, no editar** (una idea rinde 3 videos).

**Checklist de ejecución (todo medido, ver más abajo):**
- **Duración 2–3 min.** Mediana 23.2k vs 3.6k de los <1min: **6.4×**. Los comentarios
  NO caen con la duración (corrige una lectura previa hecha con muestra chica).
- **Título de 45+ caracteres y que prometa conflicto.** Largos 15.5k vs medios 8.3k de
  mediana, y el efecto gancho de SoloQ (92k vs 5.7k) es del mismo orden.
- **`#leagueoflegends` siempre** (mediana 8.4k, el mejor). **Fuera los de memes**
  (`gamingmemes`/`leagueoflegendsmemes`, 4.3k) del contenido serio; resérvalos para
  audioviral. `#humor` es lotería: promedio alto, mediana baja.
- **Cadencia: se mantienen 3 slots** (`dui` + arco nuevo + audioviral). Audioviral se
  queda pese a ser el peor en comunidad (8.0 comentarios/10k vs 20.8 de `dui`) porque
  **no consume ideación** — es el seguro contra el desgaste mientras el arco nuevo
  demanda cabeza. Si el arco satura, bajar audioviral a día por medio **antes** que
  tocar `dui`.

**Regla de decisión (pre-comprometida).** A los **15 videos** (~5 arcos):
- **Se queda** si la mediana supera **8,000** vistas a 7 días *o* si algún video pasa
  de **50k**.
- **Se descarta o se rehace** si no.
- Nunca decidir con menos de 10 videos: la varianza de esta cuenta ya engañó dos veces
  (el "mejor horario" resultó artefacto, y el "techo duro" de audioviral se rompió con
  un 149k).

**Cómo medirlo sin sesgo (importante).** La audiencia pasó de ~2.2k a ~7.7k seguidores
en seis semanas, así que **comparar contra datos de julio mezcla contenido con tamaño
de audiencia**. Evidencia: hasta el 20 jul las "vistas por seguidor" fueron planas
(1.35–1.72) — o sea, ese crecimiento fue casi todo audiencia. Dos consecuencias:

1. **Comparar en paralelo, no en secuencia.** Los 3 slots diarios ya son un experimento
   paralelo natural: mismo día, misma audiencia, mismo algoritmo. Ésa es la comparación
   limpia — no "arco nuevo en agosto vs SoloQ en julio".
2. **Usar el múltiplo vs. cohorte semanal**, no vistas crudas (ya implementado, ver
   `weeklyCohort`). Un "1.8× su semana" es comparable entre meses; "12k vistas" no.

> Corrección que este sesgo obliga: la mejora de la **mediana** de audioviral era
> ~1.3× normalizada, no 3.3×. Lo que sí cambió de verdad es la **cola** (techo de 3.6k
> → pico de 149k): audioviral no rinde mucho mejor de forma típica, pero ahora **puede
> explotar**. Sigue siendo lotería, con premios más grandes.

**Señal a vigilar.** Las vistas por seguidor vienen bajando (4.03 → 3.92 → 2.72) mientras
los seguidores suben: es la **dilución** que pre-registramos en el seguimiento de
audioviral. Confirmar con la siguiente semana antes de reaccionar (n=8 es ruidoso).

## Reglas transversales

- Cada fase termina con `build` + `lint` + tests verdes y commit por bloque.
- Ingesta: nunca superar ~150 llamadas IG/corrida ni acercarse a 60 s.
- Nada de métricas derivadas persistidas: Supabase guarda crudo, lo derivado se
  calcula al leer (regla existente del proyecto).
