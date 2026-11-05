import Link from "next/link";
import { PageTour } from "@/components/tour/page-tour";
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
import { formatRelative } from "@/core/lib/format";
import { cn } from "@/lib/utils";
import {
  getAccountCaptureStatuses,
  type AccountCaptureStatus,
  type CaptureStatus,
} from "@/modules/ingestion/status";
import { getPrimaryConnectionState } from "@/modules/accounts/tokens";

type ConnState = Awaited<ReturnType<typeof getPrimaryConnectionState>>;

function StateBadge({ state }: { state: ConnState }) {
  if (state === "connected")
    return (
      <Badge className="bg-success hover:bg-success text-success-foreground">
        conectada
      </Badge>
    );
  if (state === "expired") return <Badge variant="secondary">conexión vencida</Badge>;
  return <Badge variant="secondary">sin conectar</Badge>;
}

/** Última captura de la ingesta; en rojo si excede el umbral de salud. */
function LastCapture({ status }: { status: CaptureStatus }) {
  if (!status.lastCaptureAt) {
    return (
      <p className="text-muted-foreground text-xs">
        Sin capturas todavía — el cron guarda un snapshot al día.
      </p>
    );
  }
  return (
    <p
      className={
        status.stale ? "text-destructive text-xs" : "text-muted-foreground text-xs"
      }
    >
      Última captura: {formatRelative(status.lastCaptureAt)}
      {status.stale && " — revisa el cron o la conexión"}
    </p>
  );
}

/**
 * Una fila por cuenta: la principal alimenta el panel; las secundarias se
 * capturan aparte y salen en el digest, sin mezclarse en los números.
 */
function AccountRow({ status }: { status: AccountCaptureStatus }) {
  const primary = status.account.isPrimary;
  return (
    <li className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1 py-2.5 first:pt-0 last:pb-0">
      <div className="flex min-w-0 items-center gap-2">
        <span className="truncate text-sm font-medium">{status.label}</span>
        <span
          className={cn(
            "rounded-full px-2 py-[2px] text-[10px] font-semibold tracking-wider uppercase",
            primary
              ? "bg-primary text-primary-foreground"
              : "bg-muted text-muted-foreground",
          )}
        >
          {primary ? "principal" : "secundaria"}
        </span>
      </div>
      <LastCapture status={status} />
    </li>
  );
}

export default async function ConnectionsPage({
  searchParams,
}: {
  searchParams: Promise<{ added?: string }>;
}) {
  const { added } = await searchParams;
  // Estado de la conexión GUARDADA de la cuenta principal: el mismo que usa el
  // cron. Antes salía de una cookie del navegador, así que en cualquier otro
  // navegador decía "sin conectar" aunque la ingesta estuviera capturando.
  const tiktokState: ConnState = await getPrimaryConnectionState("tiktok");
  const instagramConnected = !!env("INSTAGRAM_ACCESS_TOKEN");
  const [tiktokAccounts, instagramAccounts] = await Promise.all([
    getAccountCaptureStatuses("tiktok"),
    getAccountCaptureStatuses("instagram"),
  ]);

  return (
    <div className="mx-auto w-full max-w-3xl space-y-6 px-4 py-8 md:px-8">
      <header data-tour="conexiones-header">
        <h1 className="text-[1.9rem] font-medium tracking-[-0.025em]">Conexiones</h1>
        <p className="text-muted-foreground mt-1 text-sm">
          Vincula tus cuentas para leer y guardar métricas.
        </p>
      </header>

      {added === "tiktok" && (
        <div
          role="status"
          className="bg-card shadow-card rounded-lg px-[18px] py-4 text-sm"
        >
          <p className="font-medium">Cuenta secundaria de TikTok conectada.</p>
          <p className="text-muted-foreground mt-1">
            Se captura sola en el cron de las 08:00. Usa{" "}
            <span className="text-foreground font-medium">Capturar ahora</span>{" "}
            para guardar su primer snapshot hoy: así mañana ya tendrá deltas.
          </p>
        </div>
      )}

      <Card data-tour="conexiones-cuentas">
        <CardHeader className="flex items-center justify-between gap-3">
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
        <CardContent className="space-y-4">
          {tiktokAccounts.length > 0 ? (
            <ul className="divide-border divide-y">
              {tiktokAccounts.map((s) => (
                <AccountRow key={s.account.accountId} status={s} />
              ))}
            </ul>
          ) : (
            <p className="text-muted-foreground text-xs">
              Sin cuentas conectadas todavía.
            </p>
          )}
          <div className="border-border border-t pt-4">
            <Link
              href="/api/auth/tiktok/login"
              className={buttonVariants({ variant: "outline", size: "sm" })}
            >
              Agregar otra cuenta
            </Link>
            <p className="text-muted-foreground mt-2 text-xs">
              TikTok autoriza la cuenta con la que tengas sesión en tiktok.com:
              entra con la cuenta que quieres agregar antes de continuar. En
              Sandbox, primero regístrala como target user (ver
              docs/agregar-cuenta.md).
            </p>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              Instagram{" "}
              {instagramConnected ? (
                <Badge className="bg-success hover:bg-success text-success-foreground">
                  conectada
                </Badge>
              ) : (
                <Badge variant="secondary">sin conectar</Badge>
              )}
            </CardTitle>
            <CardDescription>Graph API (Instagram Login)</CardDescription>
          </div>
        </CardHeader>
        <CardContent className="space-y-2">
          <p className="text-muted-foreground text-sm">
            {instagramConnected
              ? "Conectada con token manual (INSTAGRAM_ACCESS_TOKEN). El flujo OAuth completo llegará con la capa de ingesta."
              : "Falta configurar INSTAGRAM_ACCESS_TOKEN en el entorno."}
          </p>
          {instagramAccounts.length > 0 && (
            <ul className="divide-border divide-y">
              {instagramAccounts.map((s) => (
                <AccountRow key={s.account.accountId} status={s} />
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
      <PageTour route="/settings/connections" />
    </div>
  );
}
