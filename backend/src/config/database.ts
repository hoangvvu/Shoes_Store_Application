import sql from 'mssql';
import { env } from './env';

export type SqlType = sql.ISqlType | (() => sql.ISqlType);
export type Param = [type: SqlType, value: unknown];
export type Executor = sql.ConnectionPool | sql.Transaction;

let pool: sql.ConnectionPool | null = null;

export async function getPool(): Promise<sql.ConnectionPool> {
  if (!pool) {
    pool = await new sql.ConnectionPool({
      server: env.DB_SERVER,
      port: env.DB_PORT,
      database: env.DB_NAME,
      user: env.DB_USER,
      password: env.DB_PASSWORD,
      options: {
        encrypt: env.DB_ENCRYPT === 'true',
        trustServerCertificate: env.DB_TRUST_SERVER_CERT === 'true',
      },
      pool: { max: 10, min: 0, idleTimeoutMillis: 30000 },
    }).connect();
  }
  return pool;
}

/** Chạy câu SQL có tham số. Tuyệt đối không nối chuỗi dữ liệu người dùng vào `text`. */
export async function query<T = Record<string, any>>(
  text: string,
  params: Record<string, Param> = {},
  exec?: Executor,
): Promise<sql.IResult<T>> {
  const target = exec ?? (await getPool());
  const request = new sql.Request(target as sql.ConnectionPool);
  for (const [name, [type, value]] of Object.entries(params)) {
    request.input(name, type as sql.ISqlType, value);
  }
  return request.query<T>(text);
}

/** Một transaction duy nhất; lỗi ở bất kỳ bước nào sẽ ROLLBACK. */
export async function withTransaction<T>(fn: (tx: sql.Transaction) => Promise<T>): Promise<T> {
  const tx = new sql.Transaction(await getPool());
  await tx.begin();
  try {
    const result = await fn(tx);
    await tx.commit();
    return result;
  } catch (err) {
    try {
      await tx.rollback(); // trigger THROW có thể đã rollback sẵn
    } catch {
      /* bỏ qua */
    }
    throw err;
  }
}

export { sql };
