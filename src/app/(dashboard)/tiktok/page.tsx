import { Suspense } from "react";
import { CaptureButton } from "@/components/dashboard/capture-button";
import { PlatformPanelSkeleton } from "@/components/dashboard/platform-panel-skeleton";
import { RangeSelect } from "@/components/dashboard/range-select";
import { PageTour } from "@/components/tour/page-tour";
import { TikTokPanel } from "@/components/tiktok-panel";
import { readBreakoutIds } from "@/modules/analytics/breakouts";
import { getSession } from "@/modules/tiktok/session";
import { readTikTokOverview } from "@/modules/tiktok/read";
import { resolveRange, sinceForRange } from "@/modules/tiktok/ranges";

export default async function TikTokPage({
  searchParams,
}: {
  searchParams: Promise<{ range?: string; connected?: string; error?: string }>;
}) {
  const { range: rangeParam, connected, error } = await searchParams;
  const range = resolveRange(rangeParam);

  return (
    <div className="mx-auto w-full max-w-6xl space-y-6 px-4 py-8 md:px-8">
      <header
        data-tour="rango"
        className="flex flex-wrap items-end justify-between gap-4"
      >
        <div>
          <h1 className="text-[1.9rem] font-medium tracking-[-0.025em]">TikTok</h1>
          <p className="text-muted-foreground mt-1 text-sm">
            Display API (Login Kit) · todos los videos del periodo.
          </p>
        </div>
        <div className="flex items-start gap-3">
          <CaptureButton platform="tiktok" />
          <RangeSelect active={range} />
        </div>
      </header>

      {connected && (
        <div className="border-success/30 bg-success/10 text-success rounded-md border px-4 py-3 text-sm">
          Cuenta de TikTok conectada correctamente.
        </div>
      )}
      {error && (
        <div className="border-destructive/30 bg-destructive/10 text-destructive rounded-md border px-4 py-3 text-sm">
          Error al conectar: {error}
        </div>
      )}

      {/* El cambio de rango no pasa por loading.tsx: el Suspense (key=range)
          muestra el skeleton mientras la Display API responde. */}
      <Suspense key={range} fallback={<PlatformPanelSkeleton />}>
        <TikTokBody range={range} />
      </Suspense>
    </div>
  );
}

/** Cuerpo con datos (API viva + breakouts); el tour viaja aquí. */
async function TikTokBody({ range }: { range: ReturnType<typeof resolveRange> }) {
  const session = await getSession();
  const [result, breakouts] = await Promise.all([
    readTikTokOverview(session, { since: sinceForRange(range) }),
    // Azúcar: si la DB falla o el cohorte es chico, la página sigue sin badges.
    readBreakoutIds("tiktok").catch(() => new Set<string>()),
  ]);

  return (
    <>
      <TikTokPanel result={result} breakouts={breakouts} />
      <PageTour route="/tiktok" />
    </>
  );
}
