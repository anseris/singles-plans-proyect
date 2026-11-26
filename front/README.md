# SinglesPlans — Frontend

Interfaz pública y administrativa construida con Angular 21, PrimeNG, PrimeFlex y SCSS.

## Desarrollo

```powershell
npm install
npm start
```

La configuración local de Angular reenvía `/api` a `http://localhost:3000` mediante `proxy.conf.json`. Para conectar otro origen, configura el proxy de desarrollo o publica la API bajo el mismo origen.

## Áreas

- Público: dos vistas de menú, **Eventos** y **Viajes**, con búsqueda. Cualquiera puede consultar y hace falta iniciar sesión para crear grupos, proponer eventos sociales o reservar plazas.
- Eventos: eventos de la comunidad; las propuestas quedan pendientes de aprobación administrativa. El listado de grupos es público; las personas con grupos propios pueden alternar entre **Mis grupos** y **Todos los grupos**, y las personas autenticadas también consultan **Grupos de interés**. Este listado incluye los grupos a los que se unieron directamente y los grupos de eventos que reservaron. Las tarjetas abren una vista con los datos del grupo. La creación de grupos se realiza en cinco pasos: nombre, zona o ciudad, imagen, intereses y descripción. Solo el nombre y la descripción son obligatorios; la imagen admite JPG, PNG o WebP de hasta 2 MB.
- Viajes: viajes y excursiones gestionados y publicados solo por administración.
- Administración: gestión del catálogo de intereses de grupos, moderación de eventos propuestos y creación, publicación, edición y eliminación de viajes y excursiones oficiales; solo se muestra con una sesión de rol `admin` y la API vuelve a comprobar ese rol.
- Eventos: el formulario de creación y edición tiene nueve pasos: nombre, zona o ciudad, punto de encuentro, imagen, intereses, edad, horario, plazas y precio, y descripción. Imagen e intereses son opcionales; el rango puede ser para personas adultas de cualquier edad (18+) y el precio puede marcarse como gratis. Si falta imagen, la tarjeta muestra la inicial del evento. El punto de encuentro usa Google Places si se configura la clave; en la tarjeta, el enlace abre la ubicación en Google Maps.

### Google Places

En `public/google-maps-config.js`, configura `googleMapsApiKey` con una clave de navegador de Google Maps Platform. Habilita Maps JavaScript API y Places API (New), configura facturación y restringe la clave por los dominios de la aplicación (HTTP referrers). La clave del navegador se entrega al cliente: no la reutilices como clave privada de servidor. Sin clave, el formulario permite introducir el lugar manualmente y crea un enlace de búsqueda en Google Maps. Con la clave configurada, las sugerencias se pueden seleccionar con ratón o teclado y rellenan el mismo campo de búsqueda.

### Autenticación

Los botones «Inicia sesión con Google/Apple/Facebook» redirigen a `/api/auth/oauth/<proveedor>`; el proveedor vuelve a `/cuenta/oauth/callback`, donde se guarda la sesión y se entra en `/eventos`. Por defecto se usa el proxy `/api` de desarrollo. Si la API está en otro origen público (necesario para Apple con túnel HTTPS), define `apiOrigin` en `public/google-maps-config.js` con esa URL, sin barra final. Con `OAUTH_DEMO=1` en la API, los botones abren una pantalla de prueba local; consulta el README de `back/` para las credenciales reales de cada proveedor.

El registro y la recuperación usan Cloudflare Turnstile: la clave pública del sitio se configura en `public/google-maps-config.js` como `turnstileSiteKey`. La verificación no se ejecuta automáticamente: el usuario debe marcar la casilla «Soy humano» para iniciarla. El inicio de sesión no muestra captcha. La clave secreta nunca se envía al cliente; vive únicamente en `back/.env` como `TURNSTILE_SECRET_KEY`. “Mantenerme conectado” conserva la sesión en `localStorage`. La recuperación envía el enlace al correo indicado; al abrirlo se accede a `/cuenta/restablecer` con el token ya aplicado, se elige la nueva contraseña y la aplicación redirige a `/eventos` con la sesión iniciada. Sin SMTP configurado en la API, el formulario devuelve un error en lugar de enviar el correo.

## Organización del código

- `core/`: autenticación y fachada de estado/acciones de la aplicación.
- `features/events/`, `features/groups/`, `features/admin/`: modelos, acceso a datos, páginas y componentes propios de cada dominio.
- `layout/`: cabecera y estructura de navegación.
- `shared/`: componentes reutilizables entre funcionalidades.
- `app.ts` y `app.html`: composición de alto nivel; la lógica de negocio y las vistas de dominio viven fuera del componente raíz.
