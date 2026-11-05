import { describe, expect, test } from "bun:test";
import {
  avgViewsOfPublished,
  publishedInWeek,
  summarizeAccountWeek,
} from "./account-week";

/**
 * Semana Lun 2 – Dom 8 de noviembre de 2026, calendario de Ciudad de México
 * (UTC-6, sin horario de verano). El cron captura a las 14:00 UTC = 08:00 CDMX.
 */
const WEEK = new Set([
  "2026-11-02",
  "2026-11-03",
  "2026-11-04",
  "2026-11-05",
  "2026-11-06",
  "2026-11-07",
  "2026-11-08",
]);
const TZ = "America/Mexico_City";

const video = (externalId: string, publishedIso: string, views: number) => ({
  video: {
    platform: "tiktok" as const,
    externalId,
    caption: `video ${externalId}`,
    hashtags: [],
    publishedAt: new Date(publishedIso),
    url: null,
    durationSeconds: null,
    thumbnailUrl: null,
  },
  metrics: {
    platform: "tiktok" as const,
    externalId,
    views,
    likes: 0,
    comments: 0,
    shares: 0,
    saved: null,
    capturedAt: new Date("2026-11-04T14:00:00Z"),
  },
});

const snap = (iso: string, views: number) => ({
  capturedAt: new Date(iso),
  views,
  likes: 0,
  comments: 0,
  shares: 0,
});

const series = (points: { iso: string; followers: number }[]) => [
  {
    accountId: "acc",
    platform: "tiktok" as const,
    handle: "axelsine",
    isPrimary: false,
    points: points.map((p) => ({
      capturedAt: p.iso,
      followers: p.followers,
      totalViews: null,
      totalLikes: null,
    })),
  },
];

describe("summarizeAccountWeek", () => {
  const input = {
    videos: [
      video("A", "2026-11-02T20:00:00Z", 1500), // lun 14:00 CDMX → en la semana
      video("B", "2026-10-20T20:00:00Z", 5200), // viejo: solo aporta deltas
      video("C", "2026-11-05T20:00:00Z", 300), // jue → en la semana
    ],
    snapshotSeries: [
      [snap("2026-11-03T14:00:00Z", 1000), snap("2026-11-04T14:00:00Z", 1500)],
      [snap("2026-11-02T14:00:00Z", 5000), snap("2026-11-03T14:00:00Z", 5200)],
    ],
    accountSeries: series([
      { iso: "2026-11-02T14:00:00Z", followers: 100 },
      { iso: "2026-11-03T14:00:00Z", followers: 110 },
      { iso: "2026-11-04T14:00:00Z", followers: 125 },
    ]),
  };

  test("vistas ganadas = deltas de TODO el catálogo dentro de la semana", () => {
    // A +500 (ventana que inicia el 3) y B +200 (ventana que inicia el 2): B es
    // viejo pero sus vistas de esta semana sí cuentan, igual que en el Overview.
    expect(summarizeAccountWeek(input, WEEK, TZ).viewsGained).toBe(700);
  });

  test("seguidores: última lectura y lo ganado en la semana", () => {
    const week = summarizeAccountWeek(input, WEEK, TZ);
    expect(week.followers).toBe(125);
    expect(week.followersGained).toBe(25);
  });

  test("publicados, promedio y mejor video solo de lo publicado en la semana", () => {
    const week = summarizeAccountWeek(input, WEEK, TZ);
    expect(week.published).toBe(2);
    expect(week.avgViewsPublished).toBe(900); // (1500 + 300) / 2; B no entra
    expect(week.best?.externalId).toBe("A");
    expect(week.best?.views).toBe(1500);
  });

  test("con una sola captura no inventa seguidores ganados", () => {
    const week = summarizeAccountWeek(
      {
        videos: [],
        snapshotSeries: [],
        accountSeries: series([{ iso: "2026-11-05T14:00:00Z", followers: 40 }]),
      },
      WEEK,
      TZ,
    );
    expect(week.followers).toBe(40);
    expect(week.followersGained).toBeNull();
    expect(week.viewsGained).toBe(0);
  });

  test("una cuenta nunca capturada no tiene seguidores", () => {
    const week = summarizeAccountWeek(
      { videos: [], snapshotSeries: [], accountSeries: series([]) },
      WEEK,
      TZ,
    );
    expect(week.followers).toBeNull();
    expect(week.best).toBeNull();
    expect(week.avgViewsPublished).toBeNull();
  });
});

describe("publishedInWeek / avgViewsOfPublished", () => {
  test("usa el día calendario del creador, no el de UTC", () => {
    // 03:00 UTC del lunes 2 = 21:00 del DOMINGO 1 en CDMX → semana anterior.
    const videos = [video("D", "2026-11-02T03:00:00Z", 999)];
    expect(publishedInWeek(videos, WEEK, TZ)).toHaveLength(0);
    expect(avgViewsOfPublished(videos, WEEK, TZ)).toBeNull();
  });

  test("redondea el promedio", () => {
    const videos = [
      video("E", "2026-11-03T20:00:00Z", 100),
      video("F", "2026-11-03T20:00:00Z", 101),
    ];
    expect(avgViewsOfPublished(videos, WEEK, TZ)).toBe(101);
  });
});
