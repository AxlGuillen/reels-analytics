import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { TikTokPanel } from "@/components/tiktok-panel";
import { getSession } from "@/modules/tiktok/session";
import { readTikTokOverview } from "@/modules/tiktok/read";
import { resolveRange, sinceForRange } from "@/modules/tiktok/ranges";

export default async function Home({
  searchParams,
}: {
  searchParams: Promise<{ connected?: string; error?: string; range?: string }>;
}) {
  const { connected, error, range: rangeParam } = await searchParams;
  const range = resolveRange(rangeParam);
  const tiktokSession = await getSession();
  const tiktok = await readTikTokOverview(tiktokSession, {
    since: sinceForRange(range),
  });

  return (
    <main className="mx-auto w-full max-w-5xl flex-1 px-6 py-10">
      <header className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight">Reels Analytics</h1>
        <p className="text-muted-foreground mt-2">
          Centraliza y mide el crecimiento de tus videos en TikTok e Instagram.
        </p>
      </header>

      {connected && (
        <div className="mb-6 rounded-md border border-green-500/30 bg-green-500/10 px-4 py-3 text-sm text-green-700 dark:text-green-400">
          ✓ Cuenta de {connected} conectada correctamente.
        </div>
      )}
      {error && (
        <div className="mb-6 rounded-md border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-700 dark:text-red-400">
          Error al conectar: {error}
        </div>
      )}

      <Separator className="mb-8" />

      <Tabs defaultValue="tiktok" className="w-full">
        <TabsList>
          <TabsTrigger value="tiktok">TikTok</TabsTrigger>
          <TabsTrigger value="instagram">Instagram</TabsTrigger>
        </TabsList>

        <TabsContent value="tiktok" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                TikTok
                {tiktok.status === "ok" ? (
                  <Badge className="bg-green-600 hover:bg-green-600">
                    conectado
                  </Badge>
                ) : (
                  <Badge variant="secondary">pendiente de conectar</Badge>
                )}
              </CardTitle>
              <CardDescription>Display API (Login Kit)</CardDescription>
            </CardHeader>
            <CardContent>
              <TikTokPanel result={tiktok} range={range} />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="instagram" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                Instagram
                <Badge variant="secondary">pendiente de conectar</Badge>
              </CardTitle>
              <CardDescription>Graph API (Instagram Login)</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground text-sm">
                Módulo listo en el core. Aún falta conectar OAuth, mapear las
                respuestas de la API y persistir snapshots.
              </p>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </main>
  );
}
