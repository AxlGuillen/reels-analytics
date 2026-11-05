# Agregar una cuenta nueva a reels-analytics

Runbook para sumar otra cuenta de TikTok (o Instagram) a la ingesta. Escrito al
agregar la 2.ª cuenta de TikTok (nov 2026) y pensado para repetirse tal cual con
la 3.ª, la 4.ª, etc.

> **Orden obligatorio: portal → despliegue → conexión.** El código multi-cuenta
> tiene que estar **desplegado en producción** (merge de `stg` a `main`) antes
> de autorizar la cuenta nueva. El código anterior resolvía el token con
> `.eq("platform", …).limit(1)` **sin `order by`**: con dos cuentas de TikTok,
> Postgres podía devolver cualquiera — y cambiar de una corrida a otra. El riesgo
> no era solo que no se capturara la nueva: era que **dejara de capturarse la
> vieja**, la que tiene toda la historia. Ya está resuelto en código, pero solo
> protege una vez desplegado.

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

### Paso 3 — Iniciar sesión en tiktok.com con la cuenta nueva

TikTok autoriza **la cuenta con la que tengas sesión activa en tiktok.com**, no
deja elegirla en la pantalla de permiso. Antes de seguir, entra a tiktok.com con
la cuenta que vas a agregar (o cierra sesión de la principal).

### Paso 4 — Autorizarla desde Conexiones

En **producción** (`reels-analytics.vercel.app`, el único redirect URI
registrado), ve a **Conexiones → Agregar otra cuenta** y acepta los permisos.

Te devuelve a Conexiones con el aviso *Cuenta secundaria de TikTok conectada*.

- **La pantalla `/tiktok` sigue mostrando la principal.** Esa pantalla lee en
  vivo de una sola cookie; el callback solo la actualiza cuando la cuenta
  autorizada es la principal, así que agregar una secundaria no la secuestra.
- **Si por error autorizas la principal otra vez, no pasa nada**: la cuenta se
  identifica por su `open_id` y solo se refrescan sus tokens.

### Paso 5 — Primer snapshot hoy

Pulsa **Capturar ahora** (rail o barra superior). Guarda la primera lectura de la
cuenta hoy, así la captura del cron de mañana a las 08:00 ya produce deltas. Sin
esto, el primer delta llega pasado mañana.

### Paso 6 — Comprobar

En Conexiones debe aparecer la fila **`@cuenta · secundaria`** con *Última
captura: hace un momento*. Si ves *Sin token válido*, repite el Paso 4.

Después puedes volver a iniciar sesión en tiktok.com con tu cuenta principal.

---

## Qué hace la app con una cuenta secundaria

| Dónde | Comportamiento |
|---|---|
| Cron 08:00 y **Capturar ahora** | Captura **todas** las cuentas en paralelo. La falla de una no frena a las demás, y la respuesta se reporta por cuenta. |
| Overview, /growth, /content, MCP, benchmarks | **Solo la principal.** La secundaria nunca se suma: mezclaría audiencias incomparables y rompería el benchmark por cohorte (ver CLAUDE.md, "Varias cuentas por plataforma"). |
| Digest semanal de Telegram | Una sección propia por secundaria: seguidores, publicados, vistas ganadas, **promedio por video publicado contra el de la principal** y su mejor video. |
| Watchdog del digest y `/api/health` | **Por cuenta.** La principal conserva los nombres de check de siempre (`ingestion.tiktok`, `tokens.tiktok`); cada secundaria lleva su @handle (`ingestion.tiktok:@cuenta`). |
| Conexiones | Una fila por cuenta con su rol y su última captura. |

Una vista comparativa dentro del panel (selector de cuenta) queda para cuando la
secundaria tenga semanas de historia: antes no habría nada que comparar.

### Instagram

Instagram sigue siendo de **una sola cuenta**: su token viene de la variable de
entorno `INSTAGRAM_ACCESS_TOKEN`, no de un OAuth por cuenta. Sumar una 2.ª cuenta
de Instagram exige primero implementar el flujo OAuth de Instagram.

---

## Límites que aplican a toda cuenta nueva

- **`/v2/video/list/` solo devuelve videos públicos.** Lo que esté en privado o
  en «solo amigos» no entra en la analítica, ni en esta cuenta ni en las demás.
- **Sandbox no limita el Display API.** Lo único que bloquea es Content Posting
  API para videos públicos y Data Portability API, que no usamos.
- La cuenta nueva **empieza sin historia**: los snapshots no se rellenan hacia
  atrás. Cada día que pasa sin capturarla es crecimiento perdido para siempre, y
  los primeros días de una cuenta nueva son justo los más interesantes.
