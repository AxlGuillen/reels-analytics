import { COPY } from "./content";
import { landingOgImage, OG_CONTENT_TYPE, OG_SIZE } from "./og-image";

/** Tarjeta social de /landing (convención de archivo de Next). */
export const size = OG_SIZE;
export const contentType = OG_CONTENT_TYPE;
export const alt = COPY.es.meta.title;

export default function Image() {
  return landingOgImage("es");
}
