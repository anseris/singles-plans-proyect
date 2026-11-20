# Singles Plans — API

API REST con Express, TypeScript y MongoDB/Mongoose.

## Puesta en marcha

1. Copia `.env.example` a `.env` y configura `MONGODB_URI` y un `JWT_SECRET` aleatorio de al menos 32 caracteres. El `.env.example` apunta a MongoDB local; adapta la URI si utilizas Atlas.
2. Ejecuta `npm install`.
3. Para promover una cuenta existente, define `ADMIN_EMAIL` y ejecuta `npm run seed:admin`. Para crear una cuenta nueva de administración, define también `ADMIN_PASSWORD` (mínimo 12 caracteres); `ADMIN_NAME` es opcional.
4. Ejecuta `npm run dev`. La API estará en `http://localhost:3000`.

## Colecciones

- `users`: perfil, email único, hash bcrypt de contraseña y rol (`user` o `admin`).
- `groups`: grupos creados por usuarios registrados, con nombre, descripción, ciudad, rango de edad (18–100 años) e imagen opcional.
- `events`: excursiones, viajes y eventos asociados obligatoriamente a un grupo, además de fechas, aforo, precio y estado.
- `enrollments`: plazas reservadas, con índice único por evento y usuario.

## Endpoints principales

- `POST /api/auth/register`, `POST /api/auth/login`, `GET /api/auth/me`
- `GET /api/groups/mine`, `POST /api/groups` (requieren sesión)
- `GET /api/events?section=events|trips`, `GET /api/events/mine`, `POST /api/events`, `POST /api/events/:id/enroll`
- `GET /api/admin/groups`, `POST /api/admin/groups`, `DELETE /api/admin/groups/:id`
- `GET /api/admin/events`, `POST /api/admin/events`, `PATCH /api/admin/events/:id`, `DELETE /api/admin/events/:id`
- `GET /api/health`

Las vistas públicas de eventos (`section=events`) y viajes (`section=trips`) solo devuelven planes publicados; la segunda incluye viajes y excursiones. Los usuarios registrados pueden crear grupos y proponer eventos sociales (`type: "event"`) dentro de sus propios grupos; estas propuestas quedan pendientes de aprobación. Solo las rutas administrativas permiten crear viajes y excursiones (`type: "trip"` o `"excursion"`). Los usuarios pueden reservar plazas iniciando sesión. El script `seed:admin` puede promover una cuenta existente sin cambiar su contraseña.

Un usuario registrado crea un grupo indicando un rango de edad y, opcionalmente, una imagen JPG, PNG o WebP de hasta 2 MB; puede proponer eventos dentro de ese grupo. El administrador puede elegir cualquiera de los grupos al organizar viajes y excursiones oficiales. Al conectar, la API crea las colecciones `users`, `groups`, `events` y `enrollments` si aún no existen, y asegura sus índices. MongoDB solo muestra la base de datos después de crear estas colecciones.

## Organización del código

- `routes/`: declara las URLs y aplica middleware de autenticación y permisos.
- `controllers/`: implementa los manejadores HTTP, validaciones de entrada y respuestas.
- `services/`: concentra lógica reutilizable de dominio, como la validación común de experiencias.
- `models/`: esquemas e índices de Mongoose.
- `middleware/`, `config/` y `scripts/`: autenticación, configuración de infraestructura y tareas operativas.
