import type { PostgrestError } from "@supabase/supabase-js";
import { supabaseError } from "./errors";

/**
 * Lecturas `.in(columna, ids)` que escalan con el catálogo.
 *
 * PostgREST recibe el filtro `in` en la URL: pasado cierto largo el gateway la
 * rechaza con un 400 "Bad Request" SIN cuerpo. Umbral medido por bisección
 * contra este proyecto: 636 ids pasan (~28.8 KB de URL) y 637 fallan. Además
 * cada request devuelve como máximo 1000 filas. Este helper parte los ids en
 * lotes y pagina cada lote hasta agotarlo.
 *
 * Contrato con `page`: la consulta DEBE tener un orden total (desempatar por
 * `id`): el cron escribe cada lote con el mismo `captured_at`, y paginar con un
 * orden con empates repite o salta filas entre páginas. El orden global entre
 * lotes no se conserva; dentro de un lote sí.
 */

/** Ids por request: ~6 KB de URL, holgado frente al límite observado. */
export const ID_CHUNK = 150;
/** Tope de filas por request de PostgREST (default de Supabase). */
export const PAGE_SIZE = 1000;

type PageResult<T> = PromiseLike<{
  data: T[] | null;
  error: PostgrestError | null;
}>;

/** Pagina una consulta (con orden total) hasta agotarla. */
export async function fetchAllPages<T>(
  label: string,
  page: (from: number, to: number) => PageResult<T>,
): Promise<T[]> {
  const rows: T[] = [];
  for (let from = 0; ; from += PAGE_SIZE) {
    const to = from + PAGE_SIZE - 1;
    const { data, error } = await page(from, to);
    if (error) throw supabaseError(label, error, { from, to });
    rows.push(...(data ?? []));
    if (!data || data.length < PAGE_SIZE) break;
  }
  return rows;
}

/**
 * `fetchAllPages` por cada lote de `ID_CHUNK` ids. Los lotes corren en
 * paralelo (las páginas de un mismo lote no pueden: cada una depende de si la
 * anterior vino llena); el resultado conserva el orden de los lotes.
 */
export async function fetchByIds<T>(
  label: string,
  ids: readonly string[],
  page: (chunk: string[], from: number, to: number) => PageResult<T>,
): Promise<T[]> {
  const chunks: string[][] = [];
  for (let i = 0; i < ids.length; i += ID_CHUNK) {
    chunks.push(ids.slice(i, i + ID_CHUNK));
  }
  const perChunk = await Promise.all(
    chunks.map((chunk) =>
      fetchAllPages(label, (from, to) => page(chunk, from, to)),
    ),
  );
  return perChunk.flat();
}
