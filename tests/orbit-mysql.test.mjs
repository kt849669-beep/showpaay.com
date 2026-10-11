import test from 'node:test';
import assert from 'node:assert/strict';
import { orbitDatabase, connectOrbitDatabase } from '../scripts/orbit-mysql.js';

const consume = 'DELETE FROM orbit_tickets WHERE ticket_hash = ? AND key_hash = ? AND expires_at > ? RETURNING orbit_session_id, session_expires_at';
function fixture({ rows = [{ orbit_session_id: 'owner', session_expires_at: 123 }], fail = false } = {}) {
  const calls = [];
  const connection = {
    async beginTransaction() { calls.push('begin'); },
    async commit() { calls.push('commit'); },
    async rollback() { calls.push('rollback'); },
    release() { calls.push('release'); },
    async execute(sql, values) { calls.push({ sql, values }); if (fail) throw new Error('Database unavailable'); return [sql.startsWith('SELECT') ? rows : { affectedRows: 1 }]; },
  };
  const pool = { async getConnection() { return connection; }, execute: connection.execute };
  return { db: orbitDatabase(pool), calls };
}
test('MySQL consumes a ticket under a row lock before committing', async () => {
  const { db, calls } = fixture();
  assert.deepEqual(await db.prepare(consume).bind('ticket', 'key', 100).first(), { orbit_session_id: 'owner', session_expires_at: 123 });
  assert.equal(calls[0], 'begin');
  assert.match(calls[1].sql, /FOR UPDATE$/);
  assert.deepEqual(calls[1].values, ['ticket', 'key', 100]);
  assert.match(calls[2].sql, /^DELETE FROM orbit_tickets/);
  assert.deepEqual(calls.slice(-2), ['commit', 'release']);
});
test('an absent or used ticket cannot create a session', async () => {
  const { db, calls } = fixture({ rows: [] });
  assert.equal(await db.prepare(consume).bind('used', 'key', 100).first(), null);
  assert.equal(calls.filter(call => call.sql?.startsWith('DELETE')).length, 0);
  assert.deepEqual(calls.slice(-2), ['commit', 'release']);
});
test('failed database operations roll back and release the connection', async () => {
  const { db, calls } = fixture({ fail: true });
  await assert.rejects(db.batch([db.prepare('DELETE FROM orbit_sessions WHERE key_hash = ?').bind('key')]), /Database unavailable/);
  assert.deepEqual(calls.slice(-2), ['rollback', 'release']);
  assert(!calls.includes('commit'));
});
test('Orbit stays disabled without a key and refuses incomplete configuration', async () => {
  assert.deepEqual((await connectOrbitDatabase({})).env, {});
  await assert.rejects(connectOrbitDatabase({ ORBIT_API_KEY: 'sp_orbit_' + 'a'.repeat(64) }), /configuration is incomplete/);
});
