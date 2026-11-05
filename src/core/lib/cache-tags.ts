/**
 * Tag del caché de analítica: todo lo derivado de los snapshots (catálogo,
 * línea de tiempo, agregados). Lo invalidan los ÚNICOS escritores de snapshots
 * — el cron de ingesta y la captura manual — así el caché nunca sirve un día
 * viejo después de capturar. Vive en `core` porque lo comparten `app/` (quien
 * invalida) y `modules/analytics` (quien cachea).
 */
export const ANALYTICS_TAG = "analytics";
