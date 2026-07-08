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

// ------------------------------------------------------------- Cohortes

/** Mínimo de videos con dato a una edad para que la mediana sea representativa. */
export const MIN_COHORT = 4;

/** Umbral de breakout: cuántas veces la mediana hay que superar. */
export const BREAKOUT_FACTOR = 2;

/** Mediana simple; null para lista vacía. */
export function median(values: number[]): number | null {
  if (values.length === 0) return null;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 1
    ? sorted[mid]
    : (sorted[mid - 1] + sorted[mid]) / 2;
}

/**
 * Mediana de vistas del cohorte a una edad dada. Solo cuentan los videos cuya
 * serie realmente acota esa edad (`viewsAtAge` no-null); si son menos de
 * `minCohort`, no hay mediana honesta → null.
 */
export function medianViewsAt(
  cohort: AgePoint[][],
  ageDays: number,
  minCohort = MIN_COHORT,
): number | null {
  const values = cohort
    .map((points) => viewsAtAge(points, ageDays))
    .filter((v): v is number => v !== null);
  if (values.length < minCohort) return null;
  return median(values);
}

/**
 * Curva "típica" del cohorte: mediana de vistas a cada edad entera 1..maxAge.
 * Se corta donde el cohorte deja de ser suficiente (los videos más viejos son
 * pocos). Es el benchmark que se superpone a la curva de un video.
 */
export function medianCurve(
  cohort: AgePoint[][],
  maxAgeDays = 30,
  minCohort = MIN_COHORT,
): AgePoint[] {
  const curve: AgePoint[] = [];
  for (let age = 1; age <= maxAgeDays; age++) {
    const value = medianViewsAt(cohort, age, minCohort);
    if (value === null) break;
    curve.push({ ageDays: age, views: Math.round(value) });
  }
  return curve;
}

export interface BenchmarkResult {
  /** cuántas veces la mediana lleva el video (1 = igual al típico). */
  multiple: number;
  /** edad (días) a la que se comparó. */
  atAgeDays: number;
  /** vistas del video y de la mediana a esa edad. */
  videoViews: number;
  medianViews: number;
}

/**
 * Compara un video contra su cohorte a la mayor edad entera donde AMBOS tienen
 * dato (el video la acota con snapshots y el cohorte alcanza `minCohort`).
 * Null si nunca coinciden — p. ej. video sin historia temprana o cohorte chico.
 */
export function benchmarkAgainstCohort(
  points: AgePoint[],
  cohort: AgePoint[][],
  minCohort = MIN_COHORT,
): BenchmarkResult | null {
  const maxAge = points.length > 0 ? Math.floor(points[points.length - 1].ageDays) : 0;
  for (let age = maxAge; age >= 1; age--) {
    const videoViews = viewsAtAge(points, age);
    if (videoViews === null) continue;
    const medianViews = medianViewsAt(cohort, age, minCohort);
    if (medianViews === null || medianViews <= 0) continue;
    return {
      multiple: videoViews / medianViews,
      atAgeDays: age,
      videoViews,
      medianViews,
    };
  }
  return null;
}

/** Un video "despega" si supera `factor`× la mediana de su cohorte a su edad. */
export function isBreakout(
  points: AgePoint[],
  cohort: AgePoint[][],
  factor = BREAKOUT_FACTOR,
  minCohort = MIN_COHORT,
): boolean {
  const result = benchmarkAgainstCohort(points, cohort, minCohort);
  return result !== null && result.multiple >= factor;
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
