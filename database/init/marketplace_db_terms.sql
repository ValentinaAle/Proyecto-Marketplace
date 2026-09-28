CREATE DATABASE  IF NOT EXISTS `marketplace_db` /*!40100 DEFAULT CHARACTER SET utf8mb3 */ /*!80016 DEFAULT ENCRYPTION='N' */;
USE `marketplace_db`;
-- MySQL dump 10.13  Distrib 8.0.46, for Win64 (x86_64)
--
-- Host: 127.0.0.1    Database: marketplace_db
-- ------------------------------------------------------
-- Server version	8.0.46

/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!50503 SET NAMES utf8 */;
/*!40103 SET @OLD_TIME_ZONE=@@TIME_ZONE */;
/*!40103 SET TIME_ZONE='+00:00' */;
/*!40014 SET @OLD_UNIQUE_CHECKS=@@UNIQUE_CHECKS, UNIQUE_CHECKS=0 */;
/*!40014 SET @OLD_FOREIGN_KEY_CHECKS=@@FOREIGN_KEY_CHECKS, FOREIGN_KEY_CHECKS=0 */;
/*!40101 SET @OLD_SQL_MODE=@@SQL_MODE, SQL_MODE='NO_AUTO_VALUE_ON_ZERO' */;
/*!40111 SET @OLD_SQL_NOTES=@@SQL_NOTES, SQL_NOTES=0 */;

--
-- Table structure for table `terms`
--

DROP TABLE IF EXISTS `terms`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `terms` (
  `id_terms` int NOT NULL AUTO_INCREMENT,
  `content` text NOT NULL,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `id_user` int NOT NULL,
  PRIMARY KEY (`id_terms`),
  KEY `id_user` (`id_user`),
  CONSTRAINT `terms_ibfk_1` FOREIGN KEY (`id_user`) REFERENCES `users` (`id_user`)
) ENGINE=InnoDB AUTO_INCREMENT=3 DEFAULT CHARSET=utf8mb3;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `terms`
--

LOCK TABLES `terms` WRITE;
/*!40000 ALTER TABLE `terms` DISABLE KEYS */;
INSERT INTO `terms` VALUES (1,'1. Aceptación de los Términos\nAl registrarse, acceder o utilizar esta plataforma, el usuario acepta cumplir los presentes Términos y Condiciones.\n\n2. Descripción del Servicio\nLa plataforma permite crear cuentas, publicar servicios, comunicarse con administradores y gestionar perfiles.\n\n3. Registro y Autenticación\nCada cuenta es personal e intransferible. Las contraseñas se almacenan cifradas.\n\n4. Publicaciones de Contenido\nQueda prohibido publicar contenido ilegal, fraudulento u ofensivo.\n\n5. Sistema de Soporte\nLos usuarios pueden generar tickets de soporte que serán atendidos por administradores.\n\n6. Perfil de Usuario\nLos usuarios pueden modificar su nombre, foto, teléfono y contraseña.\n\n7. Protección de Datos\nLa plataforma implementa medidas de seguridad razonables.\n\n8. Disponibilidad del Servicio\nPueden producirse interrupciones por mantenimiento.\n\n9. Propiedad Intelectual\nEl software y diseño son propiedad de sus titulares.\n\n10. Limitación de Responsabilidad\nLa plataforma no es responsable por pérdida de datos ni contenido de usuarios.\n\n11. Modificaciones\nEstos Términos pueden modificarse en cualquier momento.\n\n12. Legislación Aplicable\nEstos Términos se rigen por la legislación de la República Argentina.\n\n13. Contacto\nPara consultas, usá el sistema de soporte dentro de la plataforma.','2026-08-27 21:39:33',1),(2,'1. Aceptación de los Términos\nAl registrarse, acceder o utilizar esta plataforma, el usuario acepta cumplir los presentes Términos y Condiciones.\n\n2. Descripción del Servicio\nLa plataforma permite crear cuentas, publicar servicios y gestionar perfiles.\n\n3. Registro y Autenticación\nCada cuenta es personal e intransferible.\n\n4. Publicaciones de Contenido\nQueda prohibido publicar contenido ilegal u ofensivo.\n\n5. Sistema de Soporte\nLos usuarios pueden generar tickets atendidos por administradores.\n\n6. Perfil de Usuario\nLos usuarios pueden modificar su nombre, foto, teléfono y contraseña.\n\n7. Protección de Datos\nLa plataforma implementa medidas de seguridad razonables.\n\n8. Modificaciones\nEstos Términos pueden modificarse en cualquier momento.\n\n9. Legislación Aplicable\nEstos Términos se rigen por la legislación de la República Argentina.','2026-08-27 21:41:21',1);
/*!40000 ALTER TABLE `terms` ENABLE KEYS */;
UNLOCK TABLES;
/*!40103 SET TIME_ZONE=@OLD_TIME_ZONE */;

/*!40101 SET SQL_MODE=@OLD_SQL_MODE */;
/*!40014 SET FOREIGN_KEY_CHECKS=@OLD_FOREIGN_KEY_CHECKS */;
/*!40014 SET UNIQUE_CHECKS=@OLD_UNIQUE_CHECKS */;
/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
/*!40111 SET SQL_NOTES=@OLD_SQL_NOTES */;

-- Dump completed on 2026-09-28 11:36:22


