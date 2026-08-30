import { ImageResponse } from "next/og";
import { COPY, type Lang } from "./content";

/**
 * Tarjeta social (Open Graph) de la landing, generada por código con
 * `ImageResponse` en vez de un PNG suelto: vive del mismo `COPY` que la página
 * (los dos idiomas salen solos) y no hay binario que se desincronice del copy.
 *
 * Los hex están fijados a mano porque satori no lee CSS vars; son los tokens
 * de la marca (tinta #111211, crema #f4f4f1, lima #d9f24a). La tarjeta es una
 * sola (no hay claro/oscuro en un PNG): va en tinta, que funciona sobre
 * cualquier fondo de preview.
 */

export const OG_SIZE = { width: 1200, height: 630 };
export const OG_CONTENT_TYPE = "image/png";

const INK = "#111211";
const CREAM = "#f4f4f1";
const LIME = "#d9f24a";

/** Cápsulas decorativas (eco del mini-chart del login); la 4.ª va en lima. */
const BARS = [38, 60, 48, 88, 68, 96, 74];

/**
 * Fuente de Google como ArrayBuffer para satori (patrón de la docs de Next):
 * el `text=` subsetea a los glifos usados y sin User-Agent moderno la CSS trae
 * URLs truetype, que es lo que satori acepta (woff2 no).
 */
async function loadGoogleFont(family: string, weight: number, text: string) {
  const url = `https://fonts.googleapis.com/css2?family=${encodeURIComponent(
    family,
  ).replace(/%20/g, "+")}:wght@${weight}&text=${encodeURIComponent(text)}`;
  const css = await (await fetch(url)).text();
  const resource = css.match(
    /src: url\((.+?)\) format\('(?:opentype|truetype)'\)/,
  );
  if (!resource) throw new Error(`No font URL for ${family}`);
  const response = await fetch(resource[1]);
  if (!response.ok) throw new Error(`Font fetch failed for ${family}`);
  return response.arrayBuffer();
}

export async function landingOgImage(lang: Lang) {
  const copy = COPY[lang];
  const title = `${copy.hero.h1a} ${copy.hero.h1accent} ${copy.hero.h1b}`;

  // Si Google Fonts no responde (raro), la tarjeta sale con la fuente default
  // de satori antes que romper el og:image con un 500.
  let fonts: NonNullable<ConstructorParameters<typeof ImageResponse>[1]>["fonts"];
  try {
    const [grotesk, mono] = await Promise.all([
      loadGoogleFont("Space Grotesk", 500, `${title} Reels Analytics`),
      loadGoogleFont("JetBrains Mono", 500, copy.hero.kicker),
    ]);
    fonts = [
      { name: "Space Grotesk", data: grotesk, weight: 500 as const },
      { name: "JetBrains Mono", data: mono, weight: 500 as const },
    ];
  } catch {
    fonts = undefined;
  }

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          padding: "64px 72px",
          backgroundColor: INK,
          // Eco del .bg-halftone del sistema: retícula de puntos tenue.
          backgroundImage:
            "radial-gradient(circle, rgba(244,244,241,0.07) 1.5px, transparent 1.5px)",
          backgroundSize: "26px 26px",
          fontFamily: "'Space Grotesk'",
          color: CREAM,
        }}
      >
        {/* Marca: tile lima + glifo 4XL + nombre */}
        <div style={{ display: "flex", alignItems: "center", gap: 20 }}>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              width: 76,
              height: 76,
              borderRadius: 26,
              backgroundColor: LIME,
            }}
          >
            <svg width={42} height={42} viewBox="0 0 120 120">
              <g transform="translate(8,14)">
                <path d="M0 52 H104 V66 H0 Z" fill={INK} />
                <path
                  d="M66 0 H80 V78 H104 V92 H66 V20 L26 60 H6 Z"
                  fill={INK}
                />
              </g>
            </svg>
          </div>
          <div style={{ display: "flex", fontSize: 34, letterSpacing: -0.5 }}>
            Reels Analytics
          </div>
        </div>

        {/* Titular con la píldora lima (mismo patrón que el hero) */}
        <div
          style={{
            display: "flex",
            flexWrap: "wrap",
            alignItems: "center",
            gap: "8px 20px",
            maxWidth: 1020,
            fontSize: 76,
            letterSpacing: -2,
            lineHeight: 1.12,
          }}
        >
          <span>{copy.hero.h1a}</span>
          <span
            style={{
              display: "flex",
              backgroundColor: LIME,
              color: INK,
              borderRadius: 999,
              padding: "2px 34px 10px",
            }}
          >
            {copy.hero.h1accent}
          </span>
          <span>{copy.hero.h1b}</span>
        </div>

        {/* Pie: kicker en mono lima + cápsulas decorativas */}
        <div
          style={{
            display: "flex",
            alignItems: "flex-end",
            justifyContent: "space-between",
          }}
        >
          <div
            style={{
              display: "flex",
              fontFamily: "'JetBrains Mono'",
              fontSize: 21,
              letterSpacing: 3,
              color: LIME,
            }}
          >
            {copy.hero.kicker}
          </div>
          <div style={{ display: "flex", alignItems: "flex-end", gap: 8 }}>
            {BARS.map((h, i) => (
              <div
                key={i}
                style={{
                  display: "flex",
                  width: 16,
                  height: h * 0.72,
                  borderRadius: 999,
                  backgroundColor: i === 3 ? LIME : "rgba(244,244,241,0.18)",
                }}
              />
            ))}
          </div>
        </div>
      </div>
    ),
    { ...OG_SIZE, fonts },
  );
}
