# FIVOX — Marketplace

Proyecto con frontend React/TypeScript, backend Node.js/Express y MySQL.

## Frontend React

El frontend vive en `frontend/`. Login, registro, recuperación, home, perfil, publicaciones, soporte y herramientas administrativas ya usan React. La ruta principal es `/home`; durante la transición, la versión estática anterior queda disponible en `/home-legacy`.

```powershell
npm --prefix frontend install
npm run frontend:dev
```

Vite abre el frontend en `http://localhost:5173` y reenvía `/api` al backend de Express en `http://localhost:3000`.

Para validar o generar el bundle de producción:

```powershell
npm run frontend:typecheck
npm run frontend:build
```

## Ejecutar con Docker

Se necesita Docker Desktop iniciado, con contenedores Linux y Docker Compose.
No hace falta instalar Node.js ni MySQL en la computadora.

El export de MySQL está incluido en `database/init/`. Contiene tablas, datos de
prueba y procedimientos almacenados. La inicialización también agrega las
columnas que ya necesita el backend para recuperación de contraseña y tickets.

Desde una terminal PowerShell en la carpeta del proyecto:

```powershell
Copy-Item .env.docker.example .env.docker
docker compose --env-file .env.docker up --build -d
```

Copiar el archivo de configuración solo la primera vez. Los valores de ejemplo
son para uso local. `.env.docker` está excluido de Git; el `.env` que ya usabas
para ejecutar con Node no necesita modificarse.

Abrir **http://localhost:8080**. Para cambiar el puerto, editar `FRONTEND_PORT`
en `.env.docker` y ejecutar nuevamente el comando de inicio.

### Qué se ejecuta

| Servicio | Función | Puerto dentro de Docker |
| --- | --- | --- |
| `frontend` | Nginx sirve las páginas y envía `/api/` al backend | 80 |
| `backend` | Node.js ejecuta la API Express | 3000 |
| `database` | MySQL 8.4 guarda los datos | 3306 |

Solo el frontend se publica en la computadora, en `localhost:8080`. El backend
se conecta a MySQL usando el nombre `database`. Los datos se conservan en el
volumen `mysql_data` al detener los contenedores.

Compose espera a que MySQL acepte conexiones antes de iniciar el backend, y a
que el backend responda antes de iniciar el frontend.

### Comprobar el funcionamiento

```powershell
docker compose --env-file .env.docker ps
docker compose --env-file .env.docker logs --tail=100
Invoke-RestMethod http://localhost:8080/api/health
```

El endpoint de salud comprueba la conexión a MySQL. No comprueba que estén
importadas todas las tablas y rutinas. Con el SQL importado, verificar también
el registro de una cuenta, el login y la carga de categorías/publicaciones.

### Detener y volver a iniciar

```powershell
docker compose --env-file .env.docker down
docker compose --env-file .env.docker up -d
```

Después de modificar código, reconstruir las imágenes:

```powershell
docker compose --env-file .env.docker up --build -d
```

### Importar el SQL desde cero

MySQL carga `database/init/*.sql` únicamente cuando el volumen está vacío.
Si ya iniciaste los servicios antes de agregar o modificar el SQL, **solo si
podés borrar los datos de esa base local**, ejecutar:

```powershell
docker compose --env-file .env.docker down -v
docker compose --env-file .env.docker up --build -d
```

`down -v` elimina todos los datos del volumen de este proyecto. Para conservar
datos existentes, realizar un respaldo e importar el SQL manualmente en lugar
de eliminar el volumen. Cambiar las credenciales en `.env.docker` tampoco cambia
los usuarios de una base que ya fue inicializada.

### Recuperación por correo

Configurar `EMAIL_USER` y `EMAIL_PASS` en `.env.docker` para usar la recuperación
de contraseña. El código actual utiliza Gmail; `EMAIL_PASS` debe ser la
contraseña de aplicación de esa cuenta. El resto de la app puede usarse sin
configurar correo. Las fuentes, Bootstrap y otros recursos CDN del frontend
requieren conexión a Internet.

## Ejecución sin Docker

Se conserva la ejecución original con `npm install` y `npm start`, usando las
variables de conexión y JWT de `.env` y una base MySQL ya configurada.

## Integración continua con Jenkins

El `Jenkinsfile` de la raíz instala las dependencias con `npm ci`, valida la
sintaxis del backend, ejecuta el chequeo de tipos del frontend, genera el bundle
de Vite y publica el contenido de `artifacts/` como artefacto de Jenkins. El
pipeline funciona en agentes Linux y Windows que tengan Node.js 22 o posterior,
Git y npm disponibles en el `PATH`.

Para crear el job:

1. Crear un **Pipeline** (o **Multibranch Pipeline**) y seleccionar
   **Pipeline script from SCM**.
2. Configurar el repositorio y las credenciales de GitHub, con `Jenkinsfile`
   como **Script Path**.
3. Instalar los plugins Pipeline, Git y GitHub. El trigger `githubPush()` espera
   un webhook de GitHub dirigido a `https://SERVIDOR/github-webhook/`.
4. Ejecutar una primera compilación manual para comprobar el agente y luego
   hacer un push para verificar el webhook.

Las mismas validaciones pueden ejecutarse localmente con:

```powershell
npm ci
npm --prefix frontend ci
npm test
npm run frontend:build
npm run package:ci
```

Actualmente `npm test` cubre la validación sintáctica del backend y el chequeo
de tipos del frontend. Cuando se agregue una suite de pruebas unitarias o de
integración, debe incorporarse a ese script para que Jenkins corte el pipeline
ante cualquier prueba fallida. El despliegue no se automatiza todavía porque el
repositorio no define un servidor o ambiente de destino.
