# Singles Plans — API

API REST con Express, TypeScript y MongoDB/Mongoose.

## Puesta en marcha

1. Copia `.env.example` a `.env` y configura `MONGODB_URI` y un `JWT_SECRET` aleatorio de al menos 32 caracteres. El `.env.example` apunta a MongoDB local; adapta la URI si utilizas Atlas.
2. Ejecuta `npm install`.
3. Para promover una cuenta existente, define `ADMIN_EMAIL` y ejecuta `npm run seed:admin`. Para crear una cuenta nueva de administración, define también `ADMIN_PASSWORD` (mínimo 12 caracteres); `ADMIN_NAME` es opcional.
4. Ejecuta `npm run dev`. La API estará en `http://localhost:3000`.

## Colecciones

- `users`: perfil, email único, hash bcrypt de contraseña y rol (`user` o `admin`).
- `groups`: grupos creados por usuarios registrados, con nombre y descripción obligatorios, y ciudad, imagen, intereses y rango de edad opcionales.
- `groupinterests`: catálogo de intereses para los grupos, gestionado por administración; cada nombre es único sin distinguir mayúsculas.
- `groupmemberships`: uniones directas de usuarios a grupos, con índice único por grupo y usuario.
- `events`: excursiones, viajes y eventos asociados obligatoriamente a un grupo, además del punto de encuentro de Google Places, intereses, edad, horario, fechas, aforo, precio y estado.
- `enrollments`: plazas reservadas, con índice único por evento y usuario.

## Endpoints principales

- `POST /api/auth/register`, `POST /api/auth/login`, `GET /api/auth/me`, `PATCH /api/auth/me`
- `POST /api/auth/password/forgot`, `POST /api/auth/password/reset`
- `GET /api/groups` (público), `GET /api/groups/mine`, `GET /api/groups/interests`, `POST /api/groups/:id/join` y `POST /api/groups` (requieren sesión salvo el listado público)
- `GET /api/interests` (catálogo público para el formulario de grupos)
- `GET /api/events?section=events|trips`, `GET /api/events/mine`, `POST /api/events`, `POST /api/events/:id/enroll`
- `GET /api/admin/groups`, `POST /api/admin/groups`, `DELETE /api/admin/groups/:id`
- `GET /api/admin/interests`, `POST /api/admin/interests`
- `GET /api/admin/events`, `POST /api/admin/events`, `PATCH /api/admin/events/:id`, `DELETE /api/admin/events/:id`
- `GET /api/health`

## Inicio de sesión social

Los botones usan OAuth 2 en `GET /api/auth/oauth/:provider` y el callback `/api/auth/oauth/:provider/callback` (Apple usa `POST`). Al completar, la API devuelve al frontend un JWT en `/cuenta/oauth/callback`. Si el proveedor no tiene credenciales, la API responde `503 El acceso con ... aún no está configurado.`

### Modo demo local

Para probar el flujo sin credenciales reales, define `OAUTH_DEMO=1` en `.env` y reinicia la API. Los tres botones muestran una pantalla local de prueba donde se introduce un correo; no se contacta con Google, Apple ni Facebook. Se ignora automáticamente cuando `NODE_ENV=production`. Pon `OAUTH_DEMO=0` en cuanto configures credenciales reales.

### Google

1. En [Google Cloud Console](https://console.cloud.google.com/), crea o selecciona un proyecto y configura la pantalla de consentimiento OAuth (tipo externo; añade tu correo como usuario de prueba si la app está en publicación de prueba).
2. En **Credenciales**, crea un **ID de cliente OAuth** de tipo **Aplicación web**.
3. Añade como URI de redireccionamiento autorizada `http://localhost:3000/api/auth/oauth/google/callback` (y la URL pública equivalente en producción).
4. Copia el ID y el secreto en `GOOGLE_CLIENT_ID` y `GOOGLE_CLIENT_SECRET` de `.env`, y reinicia la API.

### Facebook

1. Crea una app en [Meta for Developers](https://developers.facebook.com/apps/) y añade el producto **Inicio de sesión con Facebook**.
2. En **Configuración → Básico** copia el App ID y el App Secret en `FACEBOOK_APP_ID` y `FACEBOOK_APP_SECRET`.
3. En **Inicio de sesión con Facebook → Configuración**, añade `http://localhost:3000/api/auth/oauth/facebook/callback` en **URI de redireccionamiento OAuth válidas**. Añade tus cuentas como probadoras si la app está en modo desarrollo.
4. Reinicia la API.

### Apple

1. En [Apple Developer](https://developer.apple.com/account/resources/identifiers/list), crea un **Services ID** (no un App ID) con la capacitación **Sign in with Apple**.
2. Configura ese Services ID con tu dominio, la URL de retorno HTTPS y la fuente de correo.
3. En **Keys**, crea una clave con **Sign in with Apple**, descarga el `.p8` y anota su Key ID. El Team ID está en la página de membresía de la cuenta.
4. Define `APPLE_CLIENT_ID` (el Services ID), `APPLE_TEAM_ID`, `APPLE_KEY_ID` y `APPLE_PRIVATE_KEY` con el contenido del `.p8` (se admiten `\n` literales). Reinicia la API.

Apple no acepta `localhost` ni IP: en local expón la API con un túnel HTTPS y define `APPLE_REDIRECT_URI=https://tu-tunnel/api/auth/oauth/apple/callback`. Además, pon esa misma URL pública en `apiOrigin` de `front/public/google-maps-config.js`; así la cookie de estado se crea en el mismo dominio al que Apple vuelve. En `back/.env`, `API_ORIGIN` debe ser también esa URL pública.

Puedes sobrescribir la URI de retorno de cualquier proveedor con `GOOGLE_REDIRECT_URI`, `FACEBOOK_REDIRECT_URI` o `APPLE_REDIRECT_URI`.

## Perfil de usuario

`GET /api/auth/me` devuelve `id`, `name`, `email`, `role`, `superusuario`, `location`, `avatarUrl`, `createdAt`, `aboutMe`, `showGroups`, `showMaritalStatus`, `birthDate` (`YYYY-MM-DD`), `gender`, `interests`, `maritalStatus`, `occupation` y `contactPermission`. `PATCH /api/auth/me` acepta `multipart/form-data` con `name`, `location`, `aboutMe`, `showGroups`, `showMaritalStatus`, `birthDate`, `gender`, `maritalStatus`, `occupation`, `contactPermission` e `interests` (array JSON, máximo 10 intereses de un catálogo cerrado), además del campo `avatar` (JPG, PNG o WebP de hasta 2 MB) o `removeAvatar=true` para borrar la imagen. Los campos opcionales ausentes conservan su valor anterior. Las opciones válidas de `gender`, `maritalStatus`, `occupation` y `contactPermission` se validan en el servidor; `birthDate` debe ser una fecha real de una persona mayor de 18 años o estar vacía. La imagen se guarda en `back/uploads/avatars/` y se sirve desde `/uploads/avatars/...`; esa carpeta está ignorada por Git. El frontend de desarrollo reenvía también `/uploads` a la API mediante `proxy.conf.json`.

El registro y la recuperación de contraseña exigen un token de Cloudflare Turnstile en `captchaToken`; el inicio de sesión no lo exige. La verificación se inicia solo después de que el usuario marque la casilla «Soy humano». Configura la clave secreta con `TURNSTILE_SECRET_KEY` en `.env`; la clave del sitio va en `front/public/google-maps-config.js`. Para enviar los correos de restablecimiento con Resend, usa `SMTP_HOST=smtp.resend.com`, `SMTP_PORT=587` y `SMTP_USER=resend`; define `SMTP_PASSWORD` con la API key de Resend (`re_...`). En local puedes usar `SMTP_FROM=onboarding@resend.dev`, pero Resend solo entrega esos correos a la dirección asociada a tu cuenta; para otros destinatarios necesitas un dominio verificado. Sin SMTP configurado la API responde 503 y no genera enlaces; el enlace enviado caduca en una hora.

Las vistas públicas de eventos (`section=events`) y viajes (`section=trips`) solo devuelven planes publicados; la segunda incluye viajes y excursiones. Los usuarios registrados pueden crear grupos y proponer eventos sociales (`type: "event"`) dentro de sus propios grupos; estas propuestas quedan pendientes de aprobación. Solo las rutas administrativas permiten crear viajes y excursiones (`type: "trip"` o `"excursion"`). Los eventos guardan la zona o ciudad y el punto de encuentro (nombre, dirección, ID y coordenadas de Google Places), intereses, edad mínima/máxima (o `null` para cualquier edad a partir de 18), franja horaria, fechas, aforo y precio. Los usuarios pueden reservar plazas iniciando sesión. El script `seed:admin` puede promover una cuenta existente sin cambiar su contraseña.

Un usuario registrado crea un grupo indicando nombre y descripción; la ciudad, una imagen JPG, PNG o WebP de hasta 2 MB y los intereses son opcionales. Administración añade los intereses desde su panel y el formulario los consulta desde MongoDB. La API solo permite asociar a un grupo intereses existentes. El usuario puede proponer eventos dentro de su grupo. Puede unirse a grupos directamente; además, reservar un evento cuenta como interés en el grupo que lo organiza. `GET /api/groups/interests` combina ambas fuentes. La descripción acepta HTML sencillo del editor enriquecido: se sanea antes de guardarse y el límite de caracteres se aplica al texto visible, no a las etiquetas. El administrador puede elegir cualquiera de los grupos al organizar viajes y excursiones oficiales. Al conectar, la API crea las colecciones `users`, `groups`, `groupmemberships`, `groupinterests`, `events` y `enrollments` si aún no existen, y asegura sus índices. MongoDB solo muestra la base de datos después de crear estas colecciones.

## Organización del código

- `routes/`: declara las URLs y aplica middleware de autenticación y permisos.
- `controllers/`: implementa los manejadores HTTP, validaciones de entrada y respuestas.
- `services/`: concentra lógica reutilizable de dominio, como la validación común de experiencias.
- `models/`: esquemas e índices de Mongoose.
- `middleware/`, `config/` y `scripts/`: autenticación, configuración de infraestructura y tareas operativas.
