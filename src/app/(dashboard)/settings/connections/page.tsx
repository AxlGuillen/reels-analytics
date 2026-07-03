import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { env } from "@/core/config/env";
import { getSession, isExpired } from "@/modules/tiktok/session";

type ConnState = "connected" | "expired" | "disconnected";

function StateBadge({ state }: { state: ConnState }) {
  if (state === "connected")
    return <Badge className="bg-green-600 hover:bg-green-600">conectada</Badge>;
  if (state === "expired") return <Badge variant="secondary">sesión expirada</Badge>;
  return <Badge variant="secondary">sin conectar</Badge>;
}

export default async function ConnectionsPage() {
  const session = await getSession();
  const tiktokState: ConnState = !session
    ? "disconnected"
    : isExpired(session)
      ? "expired"
      : "connected";
  const instagramConnected = !!env("INSTAGRAM_ACCESS_TOKEN");

  return (
    <div className="mx-auto w-full max-w-3xl space-y-6 px-4 py-8 md:px-8">
      <header>
        <h1 className="font-display text-2xl tracking-wide">Conexiones</h1>
        <p className="text-muted-foreground mt-1 text-sm">
          Vincula tus cuentas para leer y guardar métricas.
        </p>
      </header>

      <Card>
        <CardHeader className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              TikTok <StateBadge state={tiktokState} />
            </CardTitle>
            <CardDescription>Display API (Login Kit)</CardDescription>
          </div>
          <Link href="/api/auth/tiktok/login" className={buttonVariants()}>
            {tiktokState === "disconnected" ? "Conectar" : "Reconectar"}
          </Link>
        </CardHeader>
      </Card>

      <Card>
        <CardHeader className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              Instagram{" "}
              {instagramConnected ? (
                <Badge className="bg-green-600 hover:bg-green-600">conectada</Badge>
              ) : (
                <Badge variant="secondary">sin conectar</Badge>
              )}
            </CardTitle>
            <CardDescription>Graph API (Instagram Login)</CardDescription>
          </div>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground text-sm">
            {instagramConnected
              ? "Conectada con token manual (INSTAGRAM_ACCESS_TOKEN). El flujo OAuth completo llegará con la capa de ingesta."
              : "Falta configurar INSTAGRAM_ACCESS_TOKEN en el entorno."}
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
