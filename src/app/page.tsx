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

export default function Home() {
  return (
    <main className="mx-auto w-full max-w-5xl flex-1 px-6 py-10">
      <header className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight">Reels Analytics</h1>
        <p className="text-muted-foreground mt-2">
          Centraliza y mide el crecimiento de tus videos en TikTok e Instagram.
        </p>
      </header>

      <Separator className="mb-8" />

      <Tabs defaultValue="tiktok" className="w-full">
        <TabsList>
          {MODULES.map((m) => (
            <TabsTrigger key={m.id} value={m.id}>
              {m.name}
            </TabsTrigger>
          ))}
        </TabsList>

        {MODULES.map((m) => (
          <TabsContent key={m.id} value={m.id} className="mt-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  {m.name}
                  <Badge variant="secondary">pendiente de conectar</Badge>
                </CardTitle>
                <CardDescription>{m.api}</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-muted-foreground text-sm">
                  Módulo listo en el core. Aún falta conectar OAuth, mapear las
                  respuestas de la API y persistir snapshots.
                </p>
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
        ))}
      </Tabs>
    </main>
  );
}
