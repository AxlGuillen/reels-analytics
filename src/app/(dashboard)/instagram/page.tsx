import { CaptureButton } from "@/components/dashboard/capture-button";
import { RangeSelect } from "@/components/dashboard/range-select";
import { InstagramPanel } from "@/components/instagram-panel";
import { readBreakoutIds } from "@/modules/analytics/breakouts";
import { readInstagramOverview } from "@/modules/instagram/read";
import { resolveRange, sinceForRange } from "@/modules/tiktok/ranges";

export default async function InstagramPage({
  searchParams,
}: {
  searchParams: Promise<{ range?: string }>;
}) {
  const { range: rangeParam } = await searchParams;
  const range = resolveRange(rangeParam);
  const [result, breakouts] = await Promise.all([
    readInstagramOverview({ since: sinceForRange(range) }),
    // Azúcar: si la DB falla o el cohorte es chico, la página sigue sin badges.
    readBreakoutIds("instagram").catch(() => new Set<string>()),
  ]);

  return (
    <div className="mx-auto w-full max-w-6xl space-y-6 px-4 py-8 md:px-8">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl tracking-wide">Instagram</h1>
          <p className="text-muted-foreground mt-1 text-sm">
            Graph API (Instagram Login) · Reels del periodo.
          </p>
        </div>
        <div className="flex items-start gap-3">
          <CaptureButton platform="instagram" />
          <RangeSelect active={range} />
        </div>
      </header>

      <InstagramPanel result={result} breakouts={breakouts} />
    </div>
  );
}
