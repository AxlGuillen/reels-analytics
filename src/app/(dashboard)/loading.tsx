import { Loader } from "@/components/ui/loader";

export default function Loading() {
  return (
    <div className="mx-auto w-full max-w-6xl space-y-6 px-4 py-8 md:px-8">
      <header>
        <h1 className="font-display text-2xl tracking-wide">Overview</h1>
        <p className="text-muted-foreground mt-1 text-sm">
          Rendimiento y crecimiento de tus videos.
        </p>
      </header>
      <Loader label="Cargando métricas…" />
    </div>
  );
}
