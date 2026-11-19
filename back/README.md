# Singles Plans — API

API REST con Express, TypeScript y MongoDB/Mongoose.

## Puesta en marcha

1. Copia `.env.example` a `.env` y configura `MONGODB_URI` y un `JWT_SECRET` aleatorio de al menos 32 caracteres. El `.env.example` apunta a MongoDB local; adapta la URI si utilizas Atlas.
2. Ejecuta `npm install`.
3. Para promover una cuenta existente, define `ADMIN_EMAIL` y ejecuta `npm run seed:admin`. Para crear una cuenta nueva de administración, define también `ADMIN_PASSWORD` (mínimo 12 caracteres); `ADMIN_NAME` es opcional.
4. Ejecuta `npm run dev`. La API estará en `http://localhost:3000`.

## Colecciones

- `users`: perfil, email único, hash bcrypt de contraseña y rol (`user` o `admin`).
- `events`: excursiones, viajes y eventos, autor, fechas, aforo, precio y estado de moderación.
- `enrollments`: plazas reservadas, con índice único por evento y usuario.

## Endpoints principales

- `POST /api/auth/register`, `POST /api/auth/login`, `GET /api/auth/me`
- `GET /api/events`, `GET /api/events/mine`, `POST /api/events/:id/enroll`
- `GET /api/admin/events`, `POST /api/admin/events`, `PATCH /api/admin/events/:id`, `DELETE /api/admin/events/:id`
- `GET /api/health`

La creación y gestión de experiencias requiere un token de un usuario con rol `admin`; los usuarios registrados pueden consultar planes publicados y reservar plaza. El script `seed:admin` puede promover una cuenta existente sin cambiar su contraseña.

Al conectar, la API crea las colecciones `users`, `events` y `enrollments` si aún no existen, y asegura sus índices. MongoDB solo muestra la base de datos después de crear estas colecciones.
