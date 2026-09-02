import { PlatformPanelSkeleton } from "@/components/dashboard/platform-panel-skeleton";

export default function Loading() {
  return (
    <div className="mx-auto w-full max-w-6xl space-y-6 px-4 py-8 md:px-8">
      <header>
        <h1 className="text-[1.9rem] font-medium tracking-[-0.025em]">TikTok</h1>
        <p className="text-muted-foreground mt-1 text-sm">
          Display API (Login Kit) · todos los videos del periodo.
        </p>
      </header>
      <PlatformPanelSkeleton />
    </div>
  );
}
