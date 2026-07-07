/**
 * Matemática de series de snapshots — pura y sin dependencias (testeable con
 * `bun test`). Corrige el sesgo de antigüedad del análisis: en vez de usar las
 * vistas acumuladas de por vida (que favorecen a los videos viejos), estima las
 * vistas que un video tenía **a los N días de publicado**, comparables entre sí.
 */

const DAY_MS = 86_400_000;

/** Edad por defecto (días) para normalizar rendimiento entre videos. */
export const DEFAULT_AGE_DAYS = 7;

/** Un snapshot situado por su edad (días desde la publicación) y vistas acumuladas. */
export interface AgePoint {
  ageDays: number;
  views: number;
}

/**
 * Convierte snapshots crudos a puntos por edad, ordenados asc. Descarta capturas
 * anteriores a la publicación (edad negativa; no debería pasar, defensa).
 */
export function toAgePoints(
  publishedAt: Date,
  snapshots: { capturedAt: Date; views: number }[],
): AgePoint[] {
  const published = publishedAt.getTime();
  return snapshots
    .map((s) => ({
      ageDays: (s.capturedAt.getTime() - published) / DAY_MS,
      views: s.views,
    }))
    .filter((p) => p.ageDays >= 0)
    .sort((a, b) => a.ageDays - b.ageDays);
}

/**
 * Estima las vistas acumuladas a `targetDays` de publicado, interpolando
 * linealmente entre los dos snapshots reales que rodean esa edad.
 *
 * Devuelve `null` si la edad no está **acotada por snapshots reales**: o el video
 * es más joven que `targetDays`, o empezamos a capturarlo cuando ya era más viejo
 * (no reconstruimos la curva temprana que no vimos). Así el estimado solo existe
 * cuando es honesto — los videos publicados antes de arrancar la ingesta se
 * excluyen solos. Espera `points` ordenados asc (como los da `toAgePoints`).
 */
export function viewsAtAge(
  points: AgePoint[],
  targetDays: number = DEFAULT_AGE_DAYS,
): number | null {
  let lower: AgePoint | undefined;
  let upper: AgePoint | undefined;
  for (const p of points) {
    if (p.ageDays <= targetDays) lower = p; // el último en/por debajo
    if (p.ageDays >= targetDays && upper === undefined) upper = p; // el primero en/por encima
  }
  if (!lower || !upper) return null;
  if (upper.ageDays === lower.ageDays) return lower.views;
  const t = (targetDays - lower.ageDays) / (upper.ageDays - lower.ageDays);
  return Math.round(lower.views + t * (upper.views - lower.views));
}

/** Ventana (días) para medir el arranque de un video. */
const INITIAL_WINDOW_DAYS = 3;

/**
 * Velocidad inicial: vistas por día durante los primeros ~3 días (el mejor
 * predictor de si un video "pegó"). Asume ~0 vistas al publicar. Devuelve `null`
 * si no capturamos ese arranque (primer snapshot ya fuera de la ventana).
 */
export function initialVelocity(points: AgePoint[]): number | null {
  const positive = points.filter((p) => p.ageDays > 0);
  const first = positive[0];
  if (!first || first.ageDays > INITIAL_WINDOW_DAYS) return null;
  const within = positive.filter((p) => p.ageDays <= INITIAL_WINDOW_DAYS);
  const last = within[within.length - 1];
  return Math.round(last.views / last.ageDays);
}
