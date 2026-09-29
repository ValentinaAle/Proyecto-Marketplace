import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import type { QueryResult, RowDataPacket } from 'mysql2/promise';
import { databaseMessage, procedureRows, selectRows } from '../src/types/database';

interface ExampleRow extends RowDataPacket {
  id: number;
}

describe('database helpers', () => {
  it('extracts the first result set from a stored procedure response', () => {
    const expected: ExampleRow[] = [{ id: 7 } as ExampleRow];
    const result = [expected, { affectedRows: 0 }] as unknown as QueryResult;

    assert.deepEqual(procedureRows<ExampleRow>(result), expected);
  });

  it('normalizes rows returned by SELECT queries', () => {
    const expected: ExampleRow[] = [{ id: 3 } as ExampleRow];

    assert.deepEqual(selectRows<ExampleRow>(expected), expected);
  });

  it('uses a database message only when it is a string', () => {
    assert.equal(databaseMessage({ sqlMessage: 'Duplicado' }, 'Fallback'), 'Duplicado');
    assert.equal(databaseMessage(new Error('Interno'), 'Fallback'), 'Fallback');
  });
});
