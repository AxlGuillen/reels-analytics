import Link from "next/link";
import { fetchUserInfo, fetchVideoList } from "@/modules/tiktok/api";
import { getSession, isExpired } from "@/modules/tiktok/session";

/**
 * Vista de inspección: vuelca la respuesta CRUDA de la Display API para ver
 * exactamente qué campos devuelve TikTok. Útil en desarrollo, no para usuarios.
 */
export default async function TikTokDebugPage() {
  const session = await getSession();

  let body: string;
  if (!session) {
    body = "Sin sesión de TikTok. Conéctate primero desde el inicio.";
  } else if (isExpired(session)) {
    body = "La sesión expiró. Vuelve a conectar tu cuenta.";
  } else {
    try {
      const [user, videoPage] = await Promise.all([
        fetchUserInfo(session.accessToken),
        fetchVideoList(session.accessToken),
      ]);
      body = JSON.stringify({ user, videoPage }, null, 2);
    } catch (err) {
      body = `Error: ${err instanceof Error ? err.message : "desconocido"}`;
    }
  }

  return (
    <main className="mx-auto w-full max-w-5xl flex-1 px-6 py-10">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold">TikTok — JSON crudo</h1>
        <Link href="/" className="text-sm underline">
          ← volver
        </Link>
      </div>
      <pre className="bg-muted overflow-auto rounded-lg p-4 text-xs">{body}</pre>
    </main>
  );
}
