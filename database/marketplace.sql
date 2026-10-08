-- MySQL dump 10.13  Distrib 8.0.46, for Win64 (x86_64)
--
-- Host: hayabusa.proxy.rlwy.net    Database: marketplace_db
-- ------------------------------------------------------
-- Server version	9.4.0

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
-- Table structure for table `categories`
--

DROP TABLE IF EXISTS `categories`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `categories` (
  `id_category` int NOT NULL AUTO_INCREMENT,
  `name` varchar(45) NOT NULL,
  PRIMARY KEY (`id_category`)
) ENGINE=InnoDB AUTO_INCREMENT=7 DEFAULT CHARSET=utf8mb3;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `categories`
--

LOCK TABLES `categories` WRITE;
/*!40000 ALTER TABLE `categories` DISABLE KEYS */;
INSERT INTO `categories` VALUES (1,'Técnicos'),(2,'Docentes'),(3,'Freelancers'),(4,'Salud'),(5,'Diseño'),(6,'Fotografía');
/*!40000 ALTER TABLE `categories` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `posts`
--

DROP TABLE IF EXISTS `posts`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `posts` (
  `id_post` int NOT NULL AUTO_INCREMENT,
  `title` varchar(45) NOT NULL,
  `description` text NOT NULL,
  `image_url` varchar(500) DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT NULL,
  `is_active` tinyint DEFAULT NULL,
  `id_user` int NOT NULL,
  `id_category` int DEFAULT NULL,
  PRIMARY KEY (`id_post`,`id_user`),
  KEY `fk_POSTS_USERS1_idx` (`id_user`),
  KEY `fk_posts_category` (`id_category`),
  CONSTRAINT `fk_posts_category` FOREIGN KEY (`id_category`) REFERENCES `categories` (`id_category`),
  CONSTRAINT `fk_POSTS_USERS1` FOREIGN KEY (`id_user`) REFERENCES `users` (`id_user`)
) ENGINE=InnoDB AUTO_INCREMENT=12 DEFAULT CHARSET=utf8mb3;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `posts`
--

LOCK TABLES `posts` WRITE;
/*!40000 ALTER TABLE `posts` DISABLE KEYS */;
INSERT INTO `posts` VALUES (1,'Programador','Excellent condition','https://images.com/iphone14.jpg','2026-05-11 23:30:08',0,2,NULL),(2,'Gaming Laptop','RTX 4060, 16GB RAM, Ryzen 7.','https://images.com/laptop.jpg','2026-05-11 23:30:08',0,2,NULL),(3,'Desarrollo de software','Desarrollador web fullstack','https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcSSCwCqRGMfQUWePoAJ6P-5zBjxqDWrSS4X273Mso9diWWTx8Zm9SdE-iJT&s=10','2026-07-02 18:15:29',0,5,3),(4,'Clases de Guitarra para Principiantes','Aprendé acordes, ritmos y canciones desde cero con clases personalizadas para todas las edades.','https://images.unsplash.com/photo-1510915361894-db8b60106cb1','2026-07-05 23:05:49',1,5,2),(5,'Reparación de Computadoras','Diagnóstico, mantenimiento, eliminación de virus y actualización de equipos de escritorio y notebooks.','https://images.unsplash.com/photo-1518770660439-4636190af475','2026-07-05 23:06:20',1,5,1),(6,'Plomería a Domicilio','Reparación de pérdidas de agua, destape de cañerías, instalación de griferías y sanitarios.','https://images.unsplash.com/photo-1581578731548-c64695cc6952','2026-07-05 23:06:48',0,5,1),(7,'Servicio de Electricista Matriculado','Instalaciones eléctricas, colocación de luminarias, tableros y solución de cortocircuitos.','https://images.unsplash.com/photo-1621905252507-b35492cc74b4','2026-07-05 23:07:25',1,5,1),(8,'Costurera','Realizo servicios de reparación de prendas o confección completa.','https://img.freepik.com/fotos-premium/profesional-exitosa-mujer-costurera-mujer-negocios-cosiendo-ropa-su-maquina-taller-sastre-disenador-textil-alcantarillado-haciendo-vestido-nueva-coleccion_176532-25299.jpg?w=996','2026-07-06 21:57:50',0,6,5),(9,'Clases de canto','Clases de canto para principiantes.','https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcRXPeRmyi7vDXpxvtmAxufaS36vouJWRtbJsReHQbm6zxLZDmrXP6hxdUJD&s=10','2026-07-07 00:01:41',0,5,2),(10,'Prueba de caracteresss s','Instalaciones eléctricas, colocación de luminarias, tableros y solución de cortocircuitos.Instalaciones eléctricas, colocación de luminarias, tableros y solución de cortocircuitos.Instalaciones eléctricas, colocación de luminarias, tableros y solución de cortocircuitos.','https://i.blogs.es/a19bfc/testing/450_1000.webp','2026-07-13 13:06:17',0,5,1),(11,'Diseño de indumentararia a','oDiseños para indumentaria para cualquier tipo de ropaa a la moda. ESTO ES UNA PRUEBA DE CARACTERESDiseños para indumentaria para cualquier tipo de ropaa a la moda. ESTO ES UNA PRUEBA DE CARACTERESDiseños para indumentaria para cualquier tipo de ropaa a la moda. ESTO ES UNA PRUEBA DE CARACTERESDiseñ',NULL,'2026-07-13 13:54:54',0,5,5);
/*!40000 ALTER TABLE `posts` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `profiles`
--

DROP TABLE IF EXISTS `profiles`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `profiles` (
  `id_profile` int NOT NULL AUTO_INCREMENT,
  `name` varchar(45) DEFAULT NULL,
  `avatar_url` varchar(500) DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  `id_user` int NOT NULL,
  PRIMARY KEY (`id_profile`,`id_user`),
  UNIQUE KEY `id_user_UNIQUE` (`id_user`),
  UNIQUE KEY `id_profile_UNIQUE` (`id_profile`),
  KEY `fk_PROFILES_USERS_idx` (`id_user`),
  CONSTRAINT `fk_PROFILES_USERS` FOREIGN KEY (`id_user`) REFERENCES `users` (`id_user`)
) ENGINE=InnoDB AUTO_INCREMENT=5 DEFAULT CHARSET=utf8mb3;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `profiles`
--

LOCK TABLES `profiles` WRITE;
/*!40000 ALTER TABLE `profiles` DISABLE KEYS */;
INSERT INTO `profiles` VALUES (1,'Admin User','https://avatar.com/admin.png','2026-05-11 23:27:45','2026-05-11 23:27:45',1),(2,'Seller User','https://avatar.com/seller.png','2026-05-11 23:27:45','2026-05-11 23:27:45',2),(3,'Juan Alvarez','https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcSXiVCIAo-5Y96qCMXbM3xaBxQ97uFZqrpNMo43fI7k6emh5c2aM3QPKE38&s=10','2026-07-02 17:42:18','2026-07-06 23:58:45',5),(4,'Ludmi',NULL,'2026-07-06 21:53:00','2026-07-06 21:53:00',6);
/*!40000 ALTER TABLE `profiles` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `roles`
--

DROP TABLE IF EXISTS `roles`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `roles` (
  `id_role` int NOT NULL,
  `name` varchar(45) DEFAULT NULL,
  PRIMARY KEY (`id_role`),
  UNIQUE KEY `name_UNIQUE` (`name`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb3;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `roles`
--

LOCK TABLES `roles` WRITE;
/*!40000 ALTER TABLE `roles` DISABLE KEYS */;
INSERT INTO `roles` VALUES (1,'ADMIN'),(2,'USER');
/*!40000 ALTER TABLE `roles` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `support_messages`
--

DROP TABLE IF EXISTS `support_messages`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `support_messages` (
  `id_message` int NOT NULL AUTO_INCREMENT,
  `message` text NOT NULL,
  `created_at` timestamp NULL DEFAULT NULL,
  `id_ticket` int NOT NULL,
  `id_user` int NOT NULL,
  PRIMARY KEY (`id_message`),
  KEY `fk_SUPPORT_MESSAGES_SUPPORT_TICKETS1_idx` (`id_ticket`),
  CONSTRAINT `fk_SUPPORT_MESSAGES_SUPPORT_TICKETS1` FOREIGN KEY (`id_ticket`) REFERENCES `support_tickets` (`id_ticket`)
) ENGINE=InnoDB AUTO_INCREMENT=50 DEFAULT CHARSET=utf8mb3;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `support_messages`
--

LOCK TABLES `support_messages` WRITE;
/*!40000 ALTER TABLE `support_messages` DISABLE KEYS */;
INSERT INTO `support_messages` VALUES (1,'I have a problem with my purchase.','2026-05-11 23:31:28',1,2),(2,'Your issue has been received.','2026-05-11 23:31:28',2,2),(3,'Tengo un post duplicado y no me deja eliminarlo','2026-07-03 19:24:20',3,5),(4,'No puedo editar mi email','2026-07-03 19:25:27',4,5),(5,'Ya me anda','2026-07-03 19:27:59',3,5),(6,'Hola! esto es una prueba','2026-07-03 19:37:23',5,5),(7,'fsdf','2026-07-03 19:37:27',5,5),(8,'gjhgj','2026-07-04 01:41:04',5,5),(9,'Esto es una prueba de mensaje predeterminado','2026-07-04 01:41:25',6,5),(10,'Mensaje arriba','2026-07-04 01:45:26',7,5),(11,'¡Hola! Gracias por elegir FIVOX. A la brevedad un administrador estará respondiendo tu consulta.','2026-07-04 01:47:03',7,1),(12,'¡Hola! Gracias por elegir FIVOX. A la brevedad un administrador estará respondiendo tu consulta.','2026-07-04 01:50:06',8,1),(13,'Prueba de mensaje 4','2026-07-04 01:50:06',8,5),(14,'Muchas gracias!','2026-07-04 02:01:02',8,5),(15,'hk','2026-07-04 02:01:17',8,5),(16,'khk','2026-07-04 02:01:18',8,5),(17,'hkghkgkghkh','2026-07-04 02:01:21',8,5),(18,'hgkghk','2026-07-04 02:01:22',8,5),(19,'khkghk','2026-07-04 02:01:23',8,5),(20,'khgkghkgh','2026-07-04 02:01:25',8,5),(21,'kkhk','2026-07-04 02:01:27',8,5),(22,'kghkgk','2026-07-04 02:01:29',8,5),(23,'¡Hola! Gracias por elegir FIVOX. A la brevedad un administrador estará respondiendo tu consulta.','2026-07-05 23:12:29',9,1),(24,'Me da error al modificar la contraseña','2026-07-05 23:12:30',9,5),(25,'¡Hola! Gracias por elegir FIVOX. A la brevedad un administrador estará respondiendo tu consulta.','2026-07-06 21:59:25',10,1),(26,'No puedo visualizar mi publicación en la página.','2026-07-06 21:59:25',10,6),(27,'¡Hola! Gracias por elegir FIVOX. A la brevedad un administrador estará respondiendo tu consulta.','2026-07-06 22:00:29',11,1),(28,'No puedo editar el número de teléfono de mi publicación.','2026-07-06 22:00:29',11,6),(29,'hola','2026-07-06 22:00:43',11,6),(30,'¡Hola! Gracias por elegir FIVOX. A la brevedad un administrador estará respondiendo tu consulta.','2026-07-07 00:02:42',12,1),(31,'Mi imagen no carga','2026-07-07 00:02:43',12,5),(32,'¡Hola! Gracias por elegir FIVOX. A la brevedad un administrador estará respondiendo tu consulta.','2026-07-08 20:35:45',13,1),(33,'PRUEBA','2026-07-08 20:35:45',13,5),(34,'No puedo editar el título de mi publicación','2026-07-08 20:43:17',14,5),(35,'Me dice credenciales incorrectas pero la contraseña es correcta','2026-07-08 20:43:18',15,5),(36,'¿Puedo publicar servicios de fotografía?','2026-07-08 20:43:19',16,5),(37,'??????????','2026-07-09 02:15:16',16,5),(38,'¡Hola! Gracias por elegir FIVOX. A la brevedad un administrador estará respondiendo tu consulta.','2026-07-09 02:23:50',17,1),(39,'Prueba de mensaje predefinido','2026-07-09 02:23:50',17,5),(40,'x','2026-07-09 02:45:06',16,5),(41,'HOLAAAAAAAAAAAAAAAAAAAAAA','2026-07-09 02:46:22',8,1),(42,'¡Hola! Gracias por elegir FIVOX. A la brevedad un administrador estará respondiendo tu consulta.','2026-07-09 03:07:20',18,1),(43,'Cuál es el problema?','2026-07-09 03:07:53',18,1),(44,'Hola','2026-07-09 03:28:27',18,5),(45,'Hola','2026-07-09 03:28:28',18,5),(46,'Duplci','2026-07-09 03:28:57',18,5),(47,'dime','2026-07-09 03:29:23',18,1),(48,'Hola','2026-07-09 03:35:34',15,1),(49,'que','2026-07-09 03:35:58',15,1);
/*!40000 ALTER TABLE `support_messages` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `support_tickets`
--

DROP TABLE IF EXISTS `support_tickets`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `support_tickets` (
  `id_ticket` int NOT NULL AUTO_INCREMENT,
  `status` varchar(45) DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT NULL,
  `closed_at` timestamp NULL DEFAULT NULL,
  `id_user` int NOT NULL,
  `subject` varchar(100) DEFAULT NULL,
  `last_message_at` timestamp NULL DEFAULT NULL,
  `last_read_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id_ticket`),
  KEY `fk_SUPPORT_TICKETS_USERS1_idx` (`id_user`),
  CONSTRAINT `fk_SUPPORT_TICKETS_USERS1` FOREIGN KEY (`id_user`) REFERENCES `users` (`id_user`)
) ENGINE=InnoDB AUTO_INCREMENT=19 DEFAULT CHARSET=utf8mb3;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `support_tickets`
--

LOCK TABLES `support_tickets` WRITE;
/*!40000 ALTER TABLE `support_tickets` DISABLE KEYS */;
INSERT INTO `support_tickets` VALUES (1,'OPEN','2026-05-11 23:30:46',NULL,2,NULL,NULL,NULL),(2,'CLOSED','2026-05-11 23:30:46','2026-05-11 23:30:46',2,NULL,NULL,NULL),(3,'OPEN','2026-07-03 19:24:20',NULL,5,'Problema con Post duplicado',NULL,NULL),(4,'OPEN','2026-07-03 19:25:27',NULL,5,'Error al editar email',NULL,NULL),(5,'OPEN','2026-07-03 19:37:23',NULL,5,'PRUEBA DE CONSULTA',NULL,NULL),(6,'OPEN','2026-07-04 01:41:25',NULL,5,'Prueba2.2',NULL,NULL),(7,'OPEN','2026-07-04 01:45:26',NULL,5,'Prueba 3 de mensaje',NULL,NULL),(8,'OPEN','2026-07-04 01:50:06',NULL,5,'Prueba 4',NULL,NULL),(9,'OPEN','2026-07-05 23:12:29',NULL,5,'Error al cambiar la contraseña',NULL,NULL),(10,'CLOSED','2026-07-06 21:59:24','2026-07-09 02:47:57',6,'Publicaciones',NULL,NULL),(11,'OPEN','2026-07-06 22:00:29',NULL,6,'Edición',NULL,NULL),(12,'CLOSED','2026-07-07 00:02:42','2026-07-09 03:35:09',5,'Mi imagen no aparece',NULL,NULL),(13,'OPEN','2026-07-08 20:35:45',NULL,5,'PRUEBA',NULL,NULL),(14,'OPEN','2026-07-08 20:43:17',NULL,5,'Problema con mi publicación',NULL,NULL),(15,'OPEN','2026-07-08 20:43:17',NULL,5,'Error al iniciar sesión',NULL,NULL),(16,'CLOSED','2026-07-08 20:43:18','2026-07-09 02:15:35',5,'Consulta sobre términos y condiciones',NULL,NULL),(17,'OPEN','2026-07-09 02:23:50',NULL,5,'Prueba 2.0',NULL,NULL),(18,'CLOSED','2026-07-09 03:07:20','2026-07-09 03:29:29',5,'Prueba columna',NULL,NULL);
/*!40000 ALTER TABLE `support_tickets` ENABLE KEYS */;
UNLOCK TABLES;

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
) ENGINE=InnoDB AUTO_INCREMENT=2 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `terms`
--

LOCK TABLES `terms` WRITE;
/*!40000 ALTER TABLE `terms` DISABLE KEYS */;
INSERT INTO `terms` VALUES (1,'1. Aceptación de los Términos\nAl registrarse, acceder o utilizar esta plataforma, el usuario acepta cumplir los presentes Términos y Condiciones.\n\n2. Descripción del Servicio\nLa plataforma permite crear cuentas, publicar servicios, comunicarse con administradores y gestionar perfiles.\n\n3. Registro y Autenticación\nCada cuenta es personal e intransferible. Las contraseñas se almacenan cifradas. La plataforma puede suspender cuentas que incumplan estos términos.\n\n4. Publicaciones de Contenido\nQueda prohibido publicar contenido ilegal, fraudulento, ofensivo o que infrinja derechos de propiedad intelectual.\n\n5. Sistema de Soporte\nLos usuarios pueden generar tickets de soporte. Los administradores pueden cerrarlos cuando la consulta esté resuelta.\n\n6. Perfil de Usuario\nLos usuarios pueden modificar su nombre, foto de perfil, teléfono y contraseña.\n\n7. Protección de Datos\nLa plataforma implementa medidas de seguridad razonables pero no garantiza seguridad absoluta.\n\n8. Disponibilidad del Servicio\nPueden producirse interrupciones por mantenimiento o problemas técnicos.\n\n9. Propiedad Intelectual\nEl software y diseño de la plataforma son propiedad de sus titulares.\n\n10. Limitación de Responsabilidad\nLa plataforma no es responsable por pérdida de datos, interrupciones ni contenido de usuarios.\n\n11. Modificaciones\nEstos Términos pueden modificarse en cualquier momento. El uso continuado implica aceptación.\n\n12. Legislación Aplicable\nEstos Términos se rigen por la legislación de la República Argentina.\n\n13. Contacto\nPara consultas, usa el sistema de soporte dentro de la plataforma.','2026-07-08 19:40:52',1);
/*!40000 ALTER TABLE `terms` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `users`
--

DROP TABLE IF EXISTS `users`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `users` (
  `id_user` int NOT NULL AUTO_INCREMENT,
  `email` varchar(255) NOT NULL,
  `password_hash` varchar(255) NOT NULL,
  `created_at` timestamp NULL DEFAULT NULL,
  `is_active` tinyint DEFAULT NULL,
  `phone` varchar(20) DEFAULT NULL,
  `phone_verified` tinyint DEFAULT '0',
  PRIMARY KEY (`id_user`),
  UNIQUE KEY `id_users_UNIQUE` (`id_user`),
  UNIQUE KEY `email_UNIQUE` (`email`)
) ENGINE=InnoDB AUTO_INCREMENT=7 DEFAULT CHARSET=utf8mb3;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `users`
--

LOCK TABLES `users` WRITE;
/*!40000 ALTER TABLE `users` DISABLE KEYS */;
INSERT INTO `users` VALUES (1,'admin@test.com','$2a$10$ev/t3rt9wfrBHxRud3LJD.EaHEMmS9PYF92hkGxlbshs/0hKWbY6u','2026-05-11 23:26:13',1,NULL,0),(2,'user@test.com','$2a$10$TNDRgWfMGBv2d9pHMSO2f.reEhTKU/H4ycWfT8vkCDsGWLtuy.vTa','2026-05-11 23:26:13',1,NULL,0),(5,'test@fivox.com','$2a$10$mgryWYQlN9FfE/QR46l7..Za03CMEma8w8ltiSCvhpTgU8rntM10W','2026-07-02 17:42:14',1,'23658588',1),(6,'lud@test.com','$2a$10$FgFKYWzVm46XL635Bpo1JOSpSXFa7D7lXPZCi/v6BTyEJVYve3V0K','2026-07-06 21:52:59',1,'1234222222',1);
/*!40000 ALTER TABLE `users` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `users_roles`
--

DROP TABLE IF EXISTS `users_roles`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `users_roles` (
  `id_user` int NOT NULL,
  `id_role` int NOT NULL,
  PRIMARY KEY (`id_user`,`id_role`),
  KEY `fk_USERS_has_ROLES_ROLES1_idx` (`id_role`),
  KEY `fk_USERS_has_ROLES_USERS1_idx` (`id_user`),
  CONSTRAINT `fk_USERS_has_ROLES_ROLES1` FOREIGN KEY (`id_role`) REFERENCES `roles` (`id_role`),
  CONSTRAINT `fk_USERS_has_ROLES_USERS1` FOREIGN KEY (`id_user`) REFERENCES `users` (`id_user`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb3;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `users_roles`
--

LOCK TABLES `users_roles` WRITE;
/*!40000 ALTER TABLE `users_roles` DISABLE KEYS */;
INSERT INTO `users_roles` VALUES (1,1),(2,2),(5,2);
/*!40000 ALTER TABLE `users_roles` ENABLE KEYS */;
UNLOCK TABLES;
/*!40103 SET TIME_ZONE=@OLD_TIME_ZONE */;

/*!40101 SET SQL_MODE=@OLD_SQL_MODE */;
/*!40014 SET FOREIGN_KEY_CHECKS=@OLD_FOREIGN_KEY_CHECKS */;
/*!40014 SET UNIQUE_CHECKS=@OLD_UNIQUE_CHECKS */;
/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
/*!40111 SET SQL_NOTES=@OLD_SQL_NOTES */;

-- Dump completed on 2026-07-13 16:20:01
