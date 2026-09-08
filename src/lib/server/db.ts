import { env } from '$env/dynamic/private';
import pg from 'pg';

let pool: pg.Pool | undefined;
export function database() {
  if (!env.DATABASE_URL) throw new Error('DATABASE_URL is required');
  if (!pool) {
    pool = new pg.Pool({
      connectionString: env.DATABASE_URL,
      max: 5,
      connectionTimeoutMillis: 5000,
      idleTimeoutMillis: 30000,
      statement_timeout: 5000
    });
    // Never log connection strings or driver errors containing credentials.
    pool.on('error', () => console.error('Database connection error'));
  }
  return pool;
}
