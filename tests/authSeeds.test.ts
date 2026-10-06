import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { describe, it } from 'node:test';

const usersSql = readFileSync(
  path.join(process.cwd(), 'database/init/marketplace_db_users.sql'),
  'utf8',
);

describe('authentication seed data', () => {
  it('stores bcrypt hashes for every seeded user', () => {
    const insertValues = usersSql.match(/INSERT INTO `users` VALUES ([\s\S]+?);/)?.[1];
    assert.ok(insertValues, 'No se encontró el INSERT de usuarios');

    const hashes = [...insertValues.matchAll(/'([^']+)'(?=,'\d{4}-\d{2}-\d{2})/g)]
      .flatMap((match) => match[1] ? [match[1]] : []);

    assert.ok(hashes.length > 0, 'No se encontraron contraseñas precargadas');
    hashes.forEach((hash) => assert.match(hash, /^\$2[aby]\$10\$.{53}$/));
  });

  it('keeps the test user active', () => {
    assert.match(
      usersSql,
      /\(2,'user@test\.com','\$2[aby]\$10\$.{53}','[^']+',1,/
    );
  });
});
