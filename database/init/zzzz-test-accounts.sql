-- Cuentas locales solicitadas para pruebas funcionales.
-- Puede ejecutarse varias veces: actualiza únicamente estos cuatro emails.
USE marketplace_db;

INSERT INTO users (email, password_hash, created_at, is_active, phone_verified)
VALUES
  ('usuario.prueba@fivox.local', '$2a$10$EqUGq29LfChifXU33QZ2q.BSSe459V/B9GRJNIp6AnxOucTHkctCm', NOW(), 1, 0),
  ('admin.prueba@fivox.local', '$2a$10$nCwsxoo.niSA/nfFKwhvLO0/E.kX/1UQRiocwANip76N393.n8CaS', NOW(), 1, 0),
  ('usuario.demo@fivox.local', '$2a$10$j2niZ/rpE0gcZzBtzegvOeavGb.Hhvb412hX2yUv/W371yIuW2Iji', NOW(), 1, 0),
  ('admin.demo@fivox.local', '$2a$10$3.fsGD9Daa3NLckR1oLU2O0nduVqwGB4O0JUGEgKPhK3zvjJKCusi', NOW(), 1, 0)
ON DUPLICATE KEY UPDATE
  password_hash = VALUES(password_hash),
  is_active = 1;

INSERT INTO profiles (name, created_at, id_user)
SELECT requested.name, NOW(), users.id_user
FROM (
  SELECT 'usuario.prueba@fivox.local' AS email, 'Usuario Prueba' AS name
  UNION ALL SELECT 'admin.prueba@fivox.local', 'Admin Prueba'
  UNION ALL SELECT 'usuario.demo@fivox.local', 'Usuario Demo'
  UNION ALL SELECT 'admin.demo@fivox.local', 'Admin Demo'
) AS requested
INNER JOIN users ON users.email = requested.email
ON DUPLICATE KEY UPDATE
  name = VALUES(name),
  updated_at = NOW();

DELETE users_roles
FROM users_roles
INNER JOIN users ON users.id_user = users_roles.id_user
WHERE users.email IN (
  'usuario.prueba@fivox.local',
  'admin.prueba@fivox.local',
  'usuario.demo@fivox.local',
  'admin.demo@fivox.local'
);

INSERT INTO users_roles (id_user, id_role)
SELECT users.id_user, roles.id_role
FROM users
INNER JOIN roles ON roles.name = CASE
  WHEN users.email IN ('admin.prueba@fivox.local', 'admin.demo@fivox.local') THEN 'ADMIN'
  ELSE 'USER'
END
WHERE users.email IN (
  'usuario.prueba@fivox.local',
  'admin.prueba@fivox.local',
  'usuario.demo@fivox.local',
  'admin.demo@fivox.local'
);

