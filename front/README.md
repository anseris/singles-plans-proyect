# SinglesPlans — Frontend

Interfaz pública y administrativa construida con Angular 21, PrimeNG, PrimeFlex y SCSS.

## Desarrollo

```powershell
npm install
npm start
```

La configuración local de Angular reenvía `/api` a `http://localhost:3000` mediante `proxy.conf.json`. Para conectar otro origen, configura el proxy de desarrollo o publica la API bajo el mismo origen.

## Áreas

- Público: catálogo de experiencias, búsqueda por destino, filtros por tipo, registro/inicio de sesión y reservas.
- Administración: creación, publicación, edición y eliminación de los eventos y viajes organizados por SinglesPlans; solo se muestra con una sesión de rol `admin` y la API vuelve a comprobar ese rol.
