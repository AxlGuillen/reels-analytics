# Agregar una cuenta nueva a reels-analytics

Runbook para sumar otra cuenta de TikTok (o Instagram) a la ingesta. Escrito al
agregar la 2.ª cuenta de TikTok (nov 2026) y pensado para repetirse tal cual con
la 3.ª, la 4.ª, etc.

> **Orden obligatorio.** Los pasos del portal (Parte 1) son seguros hoy. La
> autorización OAuth de la cuenta nueva (Parte 2) **NO debe hacerse hasta que el
> código soporte varias cuentas**: hasta entonces, la resolución de token hace
> `.eq("platform", …).limit(1)` **sin `order by`**, así que con dos cuentas de
> TikTok Postgres puede devolver cualquiera de las dos — y cambiar de una corrida
> a otra. El riesgo no es solo que no se capture la nueva: es que **deje de
> capturarse la vieja**, la que tiene toda la historia.

---

## Parte 1 — TikTok for Developers (lo haces tú en el portal)

Requiere iniciar sesión con credenciales de las cuentas, así que es trabajo
manual: Claude puede leer las pantallas contigo, pero no escribe contraseñas.

### Paso 0 — Averiguar en qué modo está la app

`developers.tiktok.com` → **Manage apps** → tu app. Junto al nombre hay un
**toggle Production / Sandbox**.

Anota dos cosas:

1. En qué modo estás parado.
2. Qué estado tiene **Production**: `Draft`, `In review`, `Live` o `Not approved`.

Esto decide la ruta:

| Situación | Qué sigue |
|---|---|
| Production = **Live** | No hacen falta cuentas de prueba: la cuenta nueva autoriza por el flujo normal. Salta al Paso 2. |
| Estás en **Sandbox** | Haz el Paso 1. La cuenta nueva **tiene que** registrarse como target user o el OAuth la rechaza. |

Pista de dónde estamos: el `TIKTOK_CLIENT_KEY` del `.env` empieza con `sbaw`,
que apunta a Sandbox. **Ojo que TikTok no documenta ese prefijo**, así que el
portal es la única confirmación real.

### Paso 1 — Registrar la cuenta como target user (solo Sandbox)

1. **Sandbox settings** en la página de la app.
2. En **Target users**, clic en **Add account**. Te manda a iniciar sesión en TikTok.
3. Inicia sesión **con la cuenta nueva** y acepta los *TikTok Developer Terms of Service*.

Detalles que importan:

- **Tope: 10 cuentas** por sandbox (y 5 sandboxes por app). Margen de sobra por ahora.
- **Tarda hasta una hora** en aparecer en la lista aunque refresques. No lo repitas pensando que falló.
- Solo se pueden registrar cuentas **propias**: el portal pide las credenciales de esa cuenta.
- TikTok lista «acceso a un *URL decoder*» como prerequisito para autorizar target users, pero **no explica para qué**. Si el portal te lo pide en algún momento, pásame la pantalla y lo resolvemos.

### Paso 2 — Comprobar credenciales y redirect URI

Mientras estés dentro, verifica dos cosas en el entorno que de verdad usa la app:

- **Credentials**: que el client key coincida con el del `.env` (`sbawbx090i0851665b`).
- **Login Kit → redirect URI**: que esté registrado **exacto**
  `https://reels-analytics.vercel.app/api/auth/tiktok/callback`.
  Si no coincide carácter por carácter, el OAuth de la cuenta nueva falla con un
  error poco descriptivo.

**Y de paso, una pregunta que vale oro para el futuro:** cambia el toggle a
Production y compara el client key con el de Sandbox. TikTok **no documenta** si
son distintos. Si lo son, significa que pasar a Live algún día obliga a cambiar
credenciales y **volver a autorizar todas las cuentas conectadas** — justo lo que
hay que saber antes de acumular cuentas. Anótalo.

---

## Parte 2 — Conectar la cuenta en la app

> Pendiente hasta que el código soporte varias cuentas por plataforma (ver el
> aviso del inicio). Se documenta aquí cuando esté.

El orden de conexión importa por un detalle: la sesión de TikTok vive en **una
sola cookie**, así que conectar la cuenta B sobrescribe la de A y la pantalla
`/tiktok` (que lee en vivo) pasaría a mostrar B. Los tokens persistentes de ambas
sí conviven, porque van por cuenta en `ra_connections`.

---

## Límites que aplican a toda cuenta nueva

- **`/v2/video/list/` solo devuelve videos públicos.** Lo que esté en privado o
  en «solo amigos» no entra en la analítica, ni en esta cuenta ni en las demás.
- **Sandbox no limita el Display API.** Lo único que bloquea es Content Posting
  API para videos públicos y Data Portability API, que no usamos.
- La cuenta nueva **empieza sin historia**: los snapshots no se rellenan hacia
  atrás. Cada día que pasa sin capturarla es crecimiento perdido para siempre, y
  los primeros días de una cuenta nueva son justo los más interesantes.
