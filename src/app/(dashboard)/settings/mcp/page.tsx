import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { formatRelative } from "@/core/lib/format";
import { MCP_TOOLS } from "@/modules/mcp/catalog";
import { SCOPE, resourceUrl } from "@/modules/oauth/config";
import { listConnectedClients } from "@/modules/oauth/store";

export const runtime = "nodejs";

/** Bloque monoespaciado para URLs y comandos (seleccionable para copiar). */
function Code({ children }: { children: React.ReactNode }) {
  return (
    <pre className="bg-muted/50 overflow-x-auto rounded-md border px-3 py-2 font-mono text-xs break-all whitespace-pre-wrap select-all">
      {children}
    </pre>
  );
}

function Step({ n, children }: { n: number; children: React.ReactNode }) {
  return (
    <li className="flex gap-3">
      <span className="text-primary mt-0.5 font-mono text-xs">
        {String(n).padStart(2, "0")}
      </span>
      <span className="text-sm leading-snug">{children}</span>
    </li>
  );
}

export default async function McpPage() {
  const url = resourceUrl();
  // El listado es azúcar: si falla (p. ej. sin BD), la guía sigue sirviendo.
  const clients = await listConnectedClients().catch(() => []);

  return (
    <div className="mx-auto w-full max-w-3xl space-y-6 px-4 py-8 md:px-8">
      <header>
        <h1 className="font-display text-2xl tracking-wide">MCP</h1>
        <p className="text-muted-foreground mt-1 text-sm">
          Conecta Claude a tus métricas ya guardadas. Es de{" "}
          <strong>solo lectura</strong>: consulta datos, no publica ni modifica nada.
        </p>
      </header>

      <Card>
        <CardHeader>
          <CardTitle className="text-sm">Dirección del servidor</CardTitle>
          <CardDescription>
            Es lo único que necesitas pegar en un conector remoto.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Code>{url}</Code>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-sm">
            Conector remoto (Cowork, Claude web/escritorio)
          </CardTitle>
          <CardDescription>
            Usa OAuth: no hay que pegar ningún token a mano.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ol className="flex flex-col gap-3">
            <Step n={1}>
              Ajustes → Conectores → <strong>Agregar conector personalizado</strong>.
            </Step>
            <Step n={2}>
              Pega la dirección de arriba y deja <strong>vacíos</strong> los campos de
              OAuth Client ID y Secret: el conector se registra solo.
            </Step>
            <Step n={3}>
              Te mandará a iniciar sesión aquí y luego a una pantalla para{" "}
              <strong>autorizar</strong>. Revisa que el destino sea el esperado y acepta.
            </Step>
            <Step n={4}>
              Listo: aparecerá abajo en “Conectores autorizados” y las tools quedan
              disponibles en el chat.
            </Step>
          </ol>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-sm">Claude Code (terminal)</CardTitle>
          <CardDescription>
            Alternativa con token estático, sin pasar por OAuth.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-2">
          <Code>{`claude mcp add --transport http reels-analytics ${url} \\
  --header "Authorization: Bearer <TU_MCP_SECRET>" --scope user`}</Code>
          <p className="text-muted-foreground text-xs">
            Sustituye <span className="font-mono">&lt;TU_MCP_SECRET&gt;</span> por el
            valor de esa variable en Vercel. No se muestra aquí a propósito.
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-sm">Conectores autorizados</CardTitle>
          <CardDescription>
            Aplicaciones que completaron el registro OAuth.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {clients.length === 0 ? (
            <p className="text-muted-foreground text-sm">
              Ninguno todavía. Al agregar el conector aparecerá aquí.
            </p>
          ) : (
            <ul className="flex flex-col">
              {clients.map((client) => (
                <li
                  key={client.clientId}
                  className="flex items-center justify-between gap-3 py-2 not-last:border-b"
                >
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium">
                      {client.clientName ?? "Aplicación sin nombre"}
                    </p>
                    <p className="text-muted-foreground text-xs">
                      Registrado {formatRelative(new Date(client.createdAt))}
                    </p>
                  </div>
                  {client.activeTokens > 0 ? (
                    <Badge className="bg-success hover:bg-success text-success-foreground">
                      activo
                    </Badge>
                  ) : (
                    <Badge variant="secondary">sin autorizar</Badge>
                  )}
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-sm">
            Tools disponibles ({MCP_TOOLS.length})
          </CardTitle>
          <CardDescription>
            Permiso concedido: <span className="font-mono">{SCOPE}</span>
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ul className="flex flex-col">
            {MCP_TOOLS.map((tool) => (
              <li key={tool.name} className="py-3 not-last:border-b">
                <div className="flex flex-wrap items-baseline gap-x-2">
                  <span className="text-sm font-medium">{tool.title}</span>
                  <span className="text-muted-foreground font-mono text-xs">
                    {tool.name}
                  </span>
                </div>
                <p className="text-muted-foreground mt-1 text-sm leading-snug">
                  {tool.description}
                </p>
              </li>
            ))}
          </ul>
        </CardContent>
      </Card>
    </div>
  );
}
