import pg from 'pg';

const g = globalThis;
function makePool() {
  const url = process.env.DATABASE_URL || process.env.POSTGRES_URL;
  if (!url) throw new Error('Falta DATABASE_URL');
  const local = /localhost|127\.0\.0\.1|\/var\/run/.test(url);
  return new pg.Pool({ connectionString: url, ssl: local ? false : { rejectUnauthorized: false }, max: 5, idleTimeoutMillis: 10000 });
}
export function pool() { if (!g.__ei_pool) g.__ei_pool = makePool(); return g.__ei_pool; }
export async function q(text, params = []) { await ensureSchema(); return (await pool().query(text, params)).rows; }
export async function q1(text, params = []) { return (await q(text, params))[0] || null; }

const SCHEMA = `
CREATE TABLE IF NOT EXISTS users (
  id SERIAL PRIMARY KEY, username TEXT UNIQUE NOT NULL, nombre TEXT NOT NULL,
  password_hash TEXT NOT NULL, role TEXT NOT NULL CHECK (role IN ('admin','auxiliar')),
  activo BOOLEAN NOT NULL DEFAULT true, created_at TIMESTAMPTZ NOT NULL DEFAULT now());
CREATE TABLE IF NOT EXISTS sessions (
  token_hash TEXT PRIMARY KEY, user_id INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  expires_at TIMESTAMPTZ NOT NULL, created_at TIMESTAMPTZ NOT NULL DEFAULT now());
CREATE TABLE IF NOT EXISTS students (
  id SERIAL PRIMARY KEY, dni TEXT UNIQUE NOT NULL, nombres TEXT NOT NULL, apellidos TEXT NOT NULL,
  grado TEXT NOT NULL DEFAULT '', seccion TEXT NOT NULL DEFAULT '', aula TEXT NOT NULL DEFAULT '',
  foto TEXT, apoderado_nombre TEXT NOT NULL DEFAULT '', apoderado_email TEXT NOT NULL DEFAULT '',
  apoderado_telefono TEXT NOT NULL DEFAULT '', hora_entrada TEXT, hora_salida TEXT,
  qr_nonce TEXT NOT NULL, activo BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(), updated_at TIMESTAMPTZ NOT NULL DEFAULT now());
CREATE TABLE IF NOT EXISTS attendance (
  id SERIAL PRIMARY KEY, student_id INT NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  tipo TEXT NOT NULL CHECK (tipo IN ('INGRESO','SALIDA')), ts TIMESTAMPTZ NOT NULL DEFAULT now(),
  fecha DATE NOT NULL, tarde BOOLEAN NOT NULL DEFAULT false, minutos_tarde INT NOT NULL DEFAULT 0,
  anticipado BOOLEAN NOT NULL DEFAULT false, recoge_nombre TEXT, nota TEXT,
  metodo TEXT NOT NULL DEFAULT 'QR', user_id INT REFERENCES users(id) ON DELETE SET NULL);
CREATE INDEX IF NOT EXISTS att_fecha ON attendance(fecha);
CREATE INDEX IF NOT EXISTS att_student ON attendance(student_id, ts DESC);
CREATE TABLE IF NOT EXISTS settings (key TEXT PRIMARY KEY, value JSONB NOT NULL);
CREATE TABLE IF NOT EXISTS holidays (fecha DATE PRIMARY KEY, descripcion TEXT NOT NULL);
CREATE TABLE IF NOT EXISTS justifications (
  id SERIAL PRIMARY KEY, student_id INT NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  fecha DATE NOT NULL, tipo TEXT NOT NULL CHECK (tipo IN ('FALTA','TARDANZA')), motivo TEXT NOT NULL,
  user_id INT REFERENCES users(id) ON DELETE SET NULL, created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (student_id, fecha, tipo));
CREATE TABLE IF NOT EXISTS emails (
  id SERIAL PRIMARY KEY, to_addr TEXT NOT NULL, subject TEXT NOT NULL, html TEXT NOT NULL,
  kind TEXT NOT NULL DEFAULT 'info', ref TEXT UNIQUE, status TEXT NOT NULL DEFAULT 'pendiente',
  attempts INT NOT NULL DEFAULT 0, last_error TEXT, created_at TIMESTAMPTZ NOT NULL DEFAULT now(), sent_at TIMESTAMPTZ);
CREATE INDEX IF NOT EXISTS emails_status ON emails(status, created_at);
CREATE TABLE IF NOT EXISTS audit (
  id SERIAL PRIMARY KEY, user_id INT REFERENCES users(id) ON DELETE SET NULL, accion TEXT NOT NULL,
  detalle TEXT, ip TEXT, ts TIMESTAMPTZ NOT NULL DEFAULT now());
CREATE TABLE IF NOT EXISTS rate_limits (key TEXT PRIMARY KEY, count INT NOT NULL, reset_at TIMESTAMPTZ NOT NULL);
`;

export async function ensureSchema() {
  if (g.__ei_schema) return g.__ei_schema;
  g.__ei_schema = (async () => {
    const c = await pool().connect();
    try {
      await c.query('SELECT pg_advisory_lock(11401140)');
      await c.query(SCHEMA);
    } finally {
      await c.query('SELECT pg_advisory_unlock(11401140)').catch(() => {});
      c.release();
    }
  })().catch((e) => { g.__ei_schema = null; throw e; });
  return g.__ei_schema;
}
