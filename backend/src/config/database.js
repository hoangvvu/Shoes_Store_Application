const env = require('./env');

const isWindowsAuth = Boolean(env.DB_USE_WINDOWS_AUTH);
const sql = isWindowsAuth ? require('mssql/msnodesqlv8') : require('mssql');

let pool = null;

const getPool = async () => {
  if (!pool) {
    try {
      if (isWindowsAuth) {
        const connectionString = `Driver={ODBC Driver 18 for SQL Server};Server=${env.DB_SERVER};Database=${env.DB_NAME};Trusted_Connection=yes;TrustServerCertificate=${env.DB_TRUST_SERVER_CERTIFICATE ? 'yes' : 'no'};`;
        pool = new sql.ConnectionPool({
          connectionString,
          pool: {
            max: 10,
            min: 0,
            idleTimeoutMillis: 30000,
          },
        });
        await pool.connect();
      } else {
        const sqlConfig = {
          user: env.DB_USER,
          password: env.DB_PASSWORD,
          server: env.DB_SERVER,
          port: env.DB_PORT,
          database: env.DB_NAME,
          options: {
            encrypt: env.DB_ENCRYPT,
            trustServerCertificate: env.DB_TRUST_SERVER_CERTIFICATE,
            enableArithAbort: true,
          },
          pool: {
            max: 10,
            min: 0,
            idleTimeoutMillis: 30000,
          },
        };
        pool = await sql.connect(sqlConfig);
      }
      console.log(`✅ Kết nối Microsoft SQL Server [${env.DB_SERVER}/${env.DB_NAME}] thành công! (${isWindowsAuth ? 'Windows Auth' : 'SQL Auth'})`);
    } catch (err) {
      console.error('❌ Lỗi kết nối Microsoft SQL Server:', err.message);
      throw err;
    }
  }
  return pool;
};

/**
 * Execute a parameterized query
 * @param {string} text SQL query string
 * @param {Object} params Key-value pairs for parameters
 */
const query = async (text, params = {}) => {
  const currentPool = await getPool();
  const request = currentPool.request();
  for (const [key, val] of Object.entries(params)) {
    request.input(key, val);
  }
  return request.query(text);
};

/**
 * Execute operations within a database transaction with optional session context (user_id)
 * @param {Function} callback async function(transactionRequest, transaction)
 * @param {number|null} actorUserId Optional user ID for sp_set_session_context
 */
const transaction = async (callback, actorUserId = null) => {
  const currentPool = await getPool();
  const tx = new sql.Transaction(currentPool);
  await tx.begin();

  try {
    const req = tx.request();
    if (actorUserId !== null && actorUserId !== undefined) {
      req.input('sessionUserId', sql.Int, actorUserId);
      await req.query(`EXEC sp_set_session_context @key = N'user_id', @value = @sessionUserId;`);
    }

    const result = await callback(req, tx);
    await tx.commit();
    return result;
  } catch (error) {
    if (tx._aborted !== true) {
      try {
        await tx.rollback();
      } catch (rbErr) {
        // transaction might already be rolled back by trigger (e.g., THROW in trigger with XACT_ABORT)
      }
    }
    throw error;
  }
};

const closePool = async () => {
  if (pool) {
    await pool.close();
    pool = null;
  }
};

module.exports = {
  sql,
  getPool,
  query,
  transaction,
  closePool,
};
