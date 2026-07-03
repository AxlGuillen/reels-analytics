import { RangeSelect } from "@/components/dashboard/range-select";
import { TikTokPanel } from "@/components/tiktok-panel";
import { getSession } from "@/modules/tiktok/session";
import { readTikTokOverview } from "@/modules/tiktok/read";
import { resolveRange, sinceForRange } from "@/modules/tiktok/ranges";

export default async function TikTokPage({
  searchParams,
}: {
  searchParams: Promise<{ range?: string }>;
}) {
  const { range: rangeParam } = await searchParams;
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
        <RangeSelect active={range} />
      </header>

      <TikTokPanel result={result} />
    </div>
  );
}
