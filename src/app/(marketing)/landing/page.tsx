import type { Metadata } from "next";
import { LandingPage } from "./landing-page";
import { landingMetadata } from "./content";

/** Landing pública en español (la ruta histórica y el `x-default`). El markup
 *  y el copy viven en `landing-page.tsx` / `content.ts`. */

export const metadata: Metadata = landingMetadata("es");

export default function LandingEs() {
  return <LandingPage lang="es" />;
}
