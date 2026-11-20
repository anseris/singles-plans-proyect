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
- Eventos: eventos de la comunidad; las propuestas quedan pendientes de aprobación administrativa. Las tarjetas de grupo muestran su imagen y ubicación, y abren una vista con todos sus datos. Al crear un grupo, se indica el rango de edad y se puede adjuntar una imagen JPG, PNG o WebP de hasta 2 MB.
- Viajes: viajes y excursiones gestionados y publicados solo por administración.
- Administración: moderación de eventos propuestos y creación, publicación, edición y eliminación de viajes y excursiones oficiales; solo se muestra con una sesión de rol `admin` y la API vuelve a comprobar ese rol.

## Organización del código

- `core/`: autenticación y fachada de estado/acciones de la aplicación.
- `features/events/`, `features/groups/`, `features/admin/`: modelos, acceso a datos, páginas y componentes propios de cada dominio.
- `layout/`: cabecera y estructura de navegación.
- `shared/`: componentes reutilizables entre funcionalidades.
- `app.ts` y `app.html`: composición de alto nivel; la lógica de negocio y las vistas de dominio viven fuera del componente raíz.
