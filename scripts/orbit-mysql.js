import mysql from 'mysql2/promise';

// Keep the existing Orbit API contract while using GoDaddy's hosted MySQL.
export function orbitDatabase(pool) {
  async function transaction(callback) {
    const connection = await pool.getConnection();
    try {
      await connection.beginTransaction();
      const result = await callback(connection);
      await connection.commit();
      return result;
    } catch (error) {
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }
  }
  return {
    prepare(sql) {
      const statement = {
        sql, values: [],
        bind(...values) { return { ...statement, values }; },
        async first() {
          // MySQL has no DELETE RETURNING. Lock and consume the ticket atomically.
          if (this.sql === 'DELETE FROM orbit_tickets WHERE ticket_hash = ? AND key_hash = ? AND expires_at > ? RETURNING orbit_session_id, session_expires_at') {
            return transaction(async connection => {
              const [rows] = await connection.execute('SELECT orbit_session_id, session_expires_at FROM orbit_tickets WHERE ticket_hash = ? AND key_hash = ? AND expires_at > ? FOR UPDATE', this.values);
              if (!rows.length) return null;
              const [result] = await connection.execute('DELETE FROM orbit_tickets WHERE ticket_hash = ? AND key_hash = ? AND expires_at > ?', this.values);
              return result.affectedRows === 1 ? rows[0] : null;
            });
          }
          const [rows] = await pool.execute(this.sql, this.values);
          return rows[0] ?? null;
        },
        async run() { const [result] = await pool.execute(this.sql, this.values); return result; },
      };
      return statement;
    },
    batch(statements) {
      return transaction(async connection => {
        const results = [];
        for (const statement of statements) {
          const [result] = await connection.execute(statement.sql, statement.values);
          results.push(result);
        }
        return results;
      });
    },
  };
}

export async function connectOrbitDatabase(env = process.env) {
  if (!env.ORBIT_API_KEY) return { env: {}, close: async () => {} };
  if (!/^sp_orbit_[a-f0-9]{64}$/.test(env.ORBIT_API_KEY)) throw new Error('Invalid Orbit API configuration');
  if (['DB_HOST', 'DB_NAME', 'DB_USER', 'DB_PASSWORD'].some(name => !env[name])) throw new Error('Orbit database configuration is incomplete');
  const pool = mysql.createPool({
    host: env.DB_HOST, port: Number(env.DB_PORT || 3306),
    database: env.DB_NAME, user: env.DB_USER, password: env.DB_PASSWORD,
    connectionLimit: 5, connectTimeout: 10000,
    ...(env.DB_SSL === 'true' ? { ssl: { rejectUnauthorized: true } } : {}),
  });
  try {
    await pool.execute(`CREATE TABLE IF NOT EXISTS orbit_tickets (
      ticket_hash CHAR(64) CHARACTER SET ascii COLLATE ascii_bin PRIMARY KEY,
      key_hash CHAR(64) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
      orbit_session_id VARCHAR(128) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
      expires_at BIGINT NOT NULL, session_expires_at BIGINT NOT NULL,
      INDEX orbit_tickets_owner (orbit_session_id)
    ) ENGINE=InnoDB`);
    await pool.execute(`CREATE TABLE IF NOT EXISTS orbit_sessions (
      token_hash CHAR(64) CHARACTER SET ascii COLLATE ascii_bin PRIMARY KEY,
      key_hash CHAR(64) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
      orbit_session_id VARCHAR(128) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
      expires_at BIGINT NOT NULL,
      csrf CHAR(64) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
      INDEX orbit_sessions_owner (orbit_session_id)
    ) ENGINE=InnoDB`);
    return { env: { ORBIT_AUTH: orbitDatabase(pool), ORBIT_API_KEY: env.ORBIT_API_KEY }, close: () => pool.end() };
  } catch (error) {
    await pool.end();
    throw error;
  }
}
