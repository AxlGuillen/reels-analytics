import { COPY } from "../../landing/content";
import {
  landingOgImage,
  OG_CONTENT_TYPE,
  OG_SIZE,
} from "../../landing/og-image";

/** Tarjeta social de /en/landing (convención de archivo de Next). */
export const size = OG_SIZE;
export const contentType = OG_CONTENT_TYPE;
export const alt = COPY.en.meta.title;

export default function Image() {
  return landingOgImage("en");
}
