-- Repara únicamente las cuentas de prueba incluidas en el proyecto.
-- Es idempotente y no modifica las contraseñas de usuarios reales.
USE marketplace_db;

UPDATE users
SET password_hash = '$2a$10$ev/t3rt9wfrBHxRud3LJD.EaHEMmS9PYF92hkGxlbshs/0hKWbY6u',
    is_active = 1
WHERE email = 'admin@test.com';

UPDATE users
SET password_hash = '$2a$10$TNDRgWfMGBv2d9pHMSO2f.reEhTKU/H4ycWfT8vkCDsGWLtuy.vTa',
    is_active = 1
WHERE email = 'user@test.com';
