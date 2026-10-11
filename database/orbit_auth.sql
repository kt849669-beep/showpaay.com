-- Cloudflare D1 only. No Supabase tables, credentials, or policies change.
CREATE TABLE IF NOT EXISTS orbit_tickets (
  ticket_hash TEXT PRIMARY KEY,
  key_hash TEXT NOT NULL,
  orbit_session_id TEXT NOT NULL,
  expires_at INTEGER NOT NULL,
  session_expires_at INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS orbit_tickets_owner ON orbit_tickets(orbit_session_id);
CREATE TABLE IF NOT EXISTS orbit_sessions (
  token_hash TEXT PRIMARY KEY,
  key_hash TEXT NOT NULL,
  orbit_session_id TEXT NOT NULL,
  expires_at INTEGER NOT NULL,
  csrf TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS orbit_sessions_owner ON orbit_sessions(orbit_session_id);
