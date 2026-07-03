import Link from "next/link";
import { buttonVariants } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export default function InstagramPage() {
  return (
    <div className="mx-auto w-full max-w-6xl space-y-6 px-4 py-8 md:px-8">
      <header>
        <h1 className="font-display text-2xl tracking-wide">Instagram</h1>
        <p className="text-muted-foreground mt-1 text-sm">
          Graph API (Instagram Login) · Reels.
        </p>
      </header>

      <Card>
        <CardHeader>
          <CardTitle>Pendiente de conectar</CardTitle>
          <CardDescription>
            El módulo está listo en el core. Falta conectar OAuth, mapear las
            respuestas de la API y persistir snapshots.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Link
            href="/settings/connections"
            className={buttonVariants({ variant: "outline" })}
          >
            Ir a conexiones
          </Link>
        </CardContent>
      </Card>
    </div>
  );
}
