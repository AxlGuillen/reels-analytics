import { Loader } from "@/components/ui/loader";

export default function Loading() {
  return (
    <div className="mx-auto w-full max-w-6xl space-y-6 px-4 py-8 md:px-8">
      <header>
        <h1 className="font-display text-2xl tracking-wide">Instagram</h1>
        <p className="text-muted-foreground mt-1 text-sm">
          Graph API (Instagram Login) · Reels del periodo.
        </p>
      </header>
      <Loader label="Cargando Reels e insights de Instagram…" />
    </div>
  );
}
