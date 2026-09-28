# Inicialización de MySQL

Falta agregar el SQL original de la aplicación a esta carpeta, por ejemplo
`01-fivox.sql`. Debe incluir las tablas, los procedimientos almacenados y los
datos iniciales necesarios (roles, categorías, etc.).

El backend llama a procedimientos como `sp_check_email_exists`, `sp_create_user`
y `sp_get_posts`. Una base vacía no permite usar la aplicación.

MySQL ejecuta los archivos `.sql` en orden alfabético al crear el volumen por
primera vez. El README se ignora. El script debe trabajar sobre la base indicada
en `DOCKER_DB_NAME`; si contiene `USE otra_base`, hay que hacer coincidir el nombre.

Al exportar desde MySQL, incluir las rutinas (opción `--routines` de mysqldump),
además de tablas y datos. Revisar cláusulas `DEFINER` que dependan de usuarios del
servidor original. No incluir datos personales ni credenciales reales en GitHub.

Si el volumen ya existe, agregar un SQL y reiniciar no lo ejecuta. Ver las
instrucciones de reinicialización en el README principal.
