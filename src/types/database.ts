import type { QueryResult, RowDataPacket } from 'mysql2/promise';

/** Extrae el primer result set que devuelve un CALL de MySQL. */
export function procedureRows<T extends RowDataPacket>(result: QueryResult): T[] {
  return (result as RowDataPacket[][])[0] as T[];
}

/** Normaliza el resultado de una consulta SELECT tipada. */
export function selectRows<T extends RowDataPacket>(result: QueryResult): T[] {
  return result as T[];
}

export function databaseMessage(error: unknown, fallback: string): string {
  if (typeof error === 'object' && error !== null && 'sqlMessage' in error) {
    const sqlMessage = (error as { sqlMessage?: unknown }).sqlMessage;
    if (typeof sqlMessage === 'string') return sqlMessage;
  }
  return fallback;
}
