# FIVOX — Marketplace

Proyecto con frontend HTML/CSS/JavaScript, backend Node.js/Express con TypeScript y MySQL.

## Desarrollo del backend

Se requiere Node.js 24 y npm. Instalar dependencias una vez con `npm install`.

```bash
npm run dev       # servidor de desarrollo con recarga automática
npm run typecheck # valida los tipos sin generar archivos
npm test          # ejecuta las pruebas automatizadas
npm run build     # compila TypeScript dentro de dist/
npm start         # ejecuta el backend compilado
```

`npm start` requiere haber ejecutado antes `npm run build`. Las variables de
entorno siguen siendo las mismas que se documentan en `.env.example`; la
ejecución con Docker compila el backend automáticamente en una etapa separada.

### Asistente de ayuda

El chatbot reconoce preguntas con variantes de mayúsculas, acentos y sinónimos.
Sus temas cubren búsqueda y contacto de prestadores, publicación y estado de
servicios, perfil y contraseñas, soporte y tickets, reseñas, reportes, términos,
roles y problemas técnicos. Cuando corresponde, muestra un botón que abre la
sección de la aplicación relacionada; para temas desconocidos deriva a soporte.

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

### Segunda capa local de IA del chatbot (opcional)

El chatbot responde primero mediante sus reglas locales. Si no reconoce una
consulta, puede pedir una respuesta al modelo local de Ollama. No requiere una
clave ni genera cargos por consulta. Instalar Ollama, descargar el modelo con
`ollama pull llama3.2:3b` y configurar estas variables en `.env.docker`:

```text
OLLAMA_BASE_URL=http://host.docker.internal:11434
OLLAMA_MODEL=llama3.2:3b
```

Ollama debe estar ejecutándose en la computadora antes de iniciar la aplicación.
Si el servicio local o el modelo no están disponibles, el chatbot conserva su
respuesta de respaldo y deriva a soporte. La IA sólo responde y orienta; no
ejecuta acciones como publicar, eliminar, cerrar tickets ni cambiar contraseñas.

No se deben incluir contraseñas, códigos de recuperación, tokens u otros datos
sensibles en las consultas del chatbot.

## Ejecución sin Docker

Se conserva la ejecución original con `npm install` y `npm start`, usando las
variables de conexión y JWT de `.env` y una base MySQL ya configurada.
