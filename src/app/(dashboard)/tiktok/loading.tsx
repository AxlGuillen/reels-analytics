import { Loader } from "@/components/ui/loader";

export default function Loading() {
  return (
    <div className="mx-auto w-full max-w-6xl space-y-6 px-4 py-8 md:px-8">
      <header>
        <h1 className="font-display text-2xl tracking-wide">TikTok</h1>
        <p className="text-muted-foreground mt-1 text-sm">
          Display API (Login Kit) · todos los videos del periodo.
        </p>
      </header>
      <Loader label="Cargando videos de TikTok…" />
    </div>
  );
}
