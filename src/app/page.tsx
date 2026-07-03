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
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { getSession } from "@/modules/tiktok/session";

const MODULES = [
  {
    id: "tiktok",
    name: "TikTok",
    api: "Display API (Login Kit)",
    metrics: ["vistas", "likes", "comentarios", "compartidos", "guardados"],
  },
  {
    id: "instagram",
    name: "Instagram",
    api: "Graph API (Instagram Login)",
    metrics: ["vistas", "likes", "comentarios", "compartidos", "guardados", "reach"],
  },
] as const;

export default async function Home({
  searchParams,
}: {
  searchParams: Promise<{ connected?: string; error?: string }>;
}) {
  const { connected, error } = await searchParams;
  const tiktokSession = await getSession();

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
          {MODULES.map((m) => (
            <TabsTrigger key={m.id} value={m.id}>
              {m.name}
            </TabsTrigger>
          ))}
        </TabsList>

        {MODULES.map((m) => {
          const isTikTokConnected = m.id === "tiktok" && tiktokSession !== null;
          return (
            <TabsContent key={m.id} value={m.id} className="mt-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    {m.name}
                    {isTikTokConnected ? (
                      <Badge className="bg-green-600 hover:bg-green-600">
                        conectado
                      </Badge>
                    ) : (
                      <Badge variant="secondary">pendiente de conectar</Badge>
                    )}
                  </CardTitle>
                  <CardDescription>{m.api}</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  {m.id === "tiktok" ? (
                    isTikTokConnected ? (
                      <p className="text-muted-foreground text-sm">
                        Sesión activa (open_id{" "}
                        <code className="text-xs">
                          {tiktokSession.openId || "—"}
                        </code>
                        ). Siguiente paso: leer <code>user/info</code> y{" "}
                        <code>video/list</code> y mapear al modelo de dominio.
                      </p>
                    ) : (
                      <div className="space-y-3">
                        <p className="text-muted-foreground text-sm">
                          Conecta tu cuenta de TikTok para empezar a leer métricas.
                        </p>
                        <Link
                          href="/api/auth/tiktok/login"
                          className={buttonVariants()}
                        >
                          Conectar TikTok
                        </Link>
                      </div>
                    )
                  ) : (
                    <p className="text-muted-foreground text-sm">
                      Módulo listo en el core. Aún falta conectar OAuth, mapear
                      las respuestas de la API y persistir snapshots.
                    </p>
                  )}
                  <div className="flex flex-wrap gap-2">
                    {m.metrics.map((metric) => (
                      <Badge key={metric} variant="outline">
                        {metric}
                      </Badge>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          );
        })}
      </Tabs>
    </main>
  );
}
