import Link from "next/link";
import { BrandGlyph } from "@/components/brand-mark";

/**
 * 404 global (Acid Grid). Nota de alcance: un visitante anónimo casi nunca lo
 * ve — el proxy manda toda ruta sin sesión a /login, lo que además evita
 * enumerar qué paths existen. Este page sirve al creador logueado (URLs rotas,
 * videos que ya no existen vía `notFound()`) y a cualquier ruta pública mal
 * escrita que Next resuelva como 404.
 */
export default function NotFound() {
  return (
    <main className="bg-background bg-grain text-foreground flex min-h-dvh items-center justify-center p-4">
      <div className="bg-card shadow-lift w-full max-w-md rounded-[26px] p-10 text-center">
        <div className="bg-primary text-primary-foreground mx-auto flex size-[52px] items-center justify-center rounded-[18px]">
          <BrandGlyph className="size-[26px]" />
        </div>
        <p className="text-muted-foreground mt-6 font-mono text-[11px] tracking-[0.16em]">
          ERROR 404
        </p>
        <h1 className="mt-2 text-[2.6rem] leading-none font-medium tracking-[-0.03em]">
          Aquí no hay nada
        </h1>
        <p className="text-muted-foreground mx-auto mt-3 max-w-[36ch] text-sm leading-[1.55]">
          La página que buscas no existe o cambió de lugar. Los snapshots, en
          cambio, siguen donde siempre.
        </p>
        <div className="mt-7 flex flex-wrap items-center justify-center gap-3">
          <Link
            href="/"
            className="bg-foreground text-background hover:bg-foreground/90 rounded-full px-6 py-3 text-sm font-medium transition-colors"
          >
            Ir al panel
          </Link>
          <Link
            href="/landing"
            className="border-border bg-card hover:bg-muted rounded-full border px-6 py-3 text-sm transition-colors"
          >
            Ver la landing
          </Link>
        </div>
      </div>
    </main>
  );
}
