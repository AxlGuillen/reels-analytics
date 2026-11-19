import { Suspense } from "react";
import { CaptureButton } from "@/components/dashboard/capture-button";
import { PlatformPanelSkeleton } from "@/components/dashboard/platform-panel-skeleton";
import { RangeSelect } from "@/components/dashboard/range-select";
import { PageTour } from "@/components/tour/page-tour";
import { TikTokPanel } from "@/components/tiktok-panel";
import { resolveTikTokAuth } from "@/modules/accounts/tokens";
import { readBreakoutIds } from "@/modules/analytics/breakouts";
import { getAccountScope } from "../account-scope";
import { readTikTokOverview } from "@/modules/tiktok/read";
import { resolveRange, sinceForRange } from "@/modules/tiktok/ranges";

export default async function TikTokPage({
  searchParams,
}: {
  searchParams: Promise<{ range?: string; connected?: string; error?: string }>;
}) {
  const { range: rangeParam, connected, error } = await searchParams;
  const range = resolveRange(rangeParam);
  // Esta vista es de UNA cuenta de TikTok: la elegida en el selector si es de
  // TikTok; si no ("todas" o Instagram), la principal.
  const { selected, accounts } = await getAccountScope();
  const account =
    selected?.platform === "tiktok"
      ? selected
      : (accounts.find((a) => a.platform === "tiktok" && a.isPrimary) ?? null);

  return (
    <div className="mx-auto w-full max-w-6xl space-y-6 px-4 py-8 md:px-8">
      <header
        data-tour="rango"
        className="flex flex-wrap items-end justify-between gap-4"
      >
        <div>
          <h1 className="text-[1.9rem] font-medium tracking-[-0.025em]">TikTok</h1>
          <p className="text-muted-foreground mt-1 text-sm">
            {account?.handle ? `@${account.handle} · ` : ""}Display API (Login
            Kit) · todos los videos del periodo.
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
      <Suspense
        key={`${account?.accountId ?? "none"}:${range}`}
        fallback={<PlatformPanelSkeleton />}
      >
        <TikTokBody range={range} accountId={account?.accountId} />
      </Suspense>
    </div>
  );
}

/**
 * Cuerpo con datos (API viva + breakouts); el tour viaja aquí. El token sale de
 * la conexión guardada de esa cuenta, no de una cookie: la vista funciona en
 * cualquier navegador y con el mismo token que usa el cron.
 */
async function TikTokBody({
  range,
  accountId,
}: {
  range: ReturnType<typeof resolveRange>;
  accountId?: string;
}) {
  const auth = await resolveTikTokAuth(accountId);
  const [result, breakouts] = await Promise.all([
    readTikTokOverview(auth, { since: sinceForRange(range) }),
    // Azúcar: si la DB falla o el cohorte es chico, la página sigue sin badges.
    // El cohorte es el de esta misma cuenta (ver breakouts.ts).
    readBreakoutIds(accountId ? [accountId] : []).catch(() => new Set<string>()),
  ]);

  return (
    <>
      <TikTokPanel result={result} breakouts={breakouts} />
      <PageTour route="/tiktok" />
    </>
  );
}
