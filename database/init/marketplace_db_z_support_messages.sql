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

-- Se importa después de support_tickets: MySQL 8.4 valida la referencia.
DROP TABLE IF EXISTS `support_messages`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `support_messages` (
  `id_message` int NOT NULL AUTO_INCREMENT,
  `message` text NOT NULL,
  `created_at` timestamp NULL DEFAULT NULL,
  `id_ticket` int NOT NULL,
  `id_user` int NOT NULL,
  PRIMARY KEY (`id_message`,`id_ticket`,`id_user`),
  KEY `fk_SUPPORT_MESSAGES_SUPPORT_TICKETS1_idx` (`id_ticket`,`id_user`),
  CONSTRAINT `fk_SUPPORT_MESSAGES_SUPPORT_TICKETS1` FOREIGN KEY (`id_ticket`) REFERENCES `support_tickets` (`id_ticket`)
) ENGINE=InnoDB AUTO_INCREMENT=25 DEFAULT CHARSET=utf8mb3;
/*!40101 SET character_set_client = @saved_cs_client */;

LOCK TABLES `support_messages` WRITE;
/*!40000 ALTER TABLE `support_messages` DISABLE KEYS */;
INSERT INTO `support_messages` VALUES (1,'I have a problem with my purchase.','2026-05-11 23:31:28',1,2),(2,'Your issue has been received.','2026-05-11 23:31:28',2,2),(3,'Tengo un post duplicado y no me deja eliminarlo','2026-07-03 19:24:20',3,5),(4,'No puedo editar mi email','2026-07-03 19:25:27',4,5),(5,'Ya me anda','2026-07-03 19:27:59',3,5),(6,'Hola! esto es una prueba','2026-07-03 19:37:23',5,5),(7,'fsdf','2026-07-03 19:37:27',5,5),(8,'gjhgj','2026-07-04 01:41:04',5,5),(9,'Esto es una prueba de mensaje predeterminado','2026-07-04 01:41:25',6,5),(10,'Mensaje arriba','2026-07-04 01:45:26',7,5),(11,'¡Hola! Gracias por elegir FIVOX. A la brevedad un administrador estará respondiendo tu consulta.','2026-07-04 01:47:03',7,1),(12,'¡Hola! Gracias por elegir FIVOX. A la brevedad un administrador estará respondiendo tu consulta.','2026-07-04 01:50:06',8,1),(13,'Prueba de mensaje 4','2026-07-04 01:50:06',8,5),(14,'Muchas gracias!','2026-07-04 02:01:02',8,5),(15,'hk','2026-07-04 02:01:17',8,5),(16,'kh','2026-07-04 02:01:18',8,5),(17,'hkghkgkghkh','2026-07-04 02:01:21',8,5),(18,'hgkghk','2026-07-04 02:01:22',8,5),(19,'khkghkgkghkh','2026-07-04 02:01:23',8,5),(20,'khgkghkgh','2026-07-04 02:01:25',8,5),(21,'kkhk','2026-07-04 02:01:27',8,5),(22,'kghkgk','2026-07-04 02:01:29',8,5),(23,'¡Hola! Gracias por elegir FIVOX. A la brevedad un administrador estará respondiendo tu consulta.','2026-08-27 15:13:52',9,1),(24,'PRUEBA TEST','2026-08-27 15:13:52',9,5);
/*!40000 ALTER TABLE `support_messages` ENABLE KEYS */;
UNLOCK TABLES;
/*!40103 SET TIME_ZONE=@OLD_TIME_ZONE */;
/*!40101 SET SQL_MODE=@OLD_SQL_MODE */;
/*!40014 SET FOREIGN_KEY_CHECKS=@OLD_FOREIGN_KEY_CHECKS */;
/*!40014 SET UNIQUE_CHECKS=@OLD_UNIQUE_CHECKS */;
/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
/*!40111 SET SQL_NOTES=@OLD_SQL_NOTES */;
