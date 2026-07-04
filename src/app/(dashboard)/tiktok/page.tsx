import { CaptureButton } from "@/components/dashboard/capture-button";
import { RangeSelect } from "@/components/dashboard/range-select";
import { TikTokPanel } from "@/components/tiktok-panel";
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
  const session = await getSession();
  const result = await readTikTokOverview(session, {
    since: sinceForRange(range),
  });

  return (
    <div className="mx-auto w-full max-w-6xl space-y-6 px-4 py-8 md:px-8">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl tracking-wide">TikTok</h1>
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

      <TikTokPanel result={result} />
    </div>
  );
}
