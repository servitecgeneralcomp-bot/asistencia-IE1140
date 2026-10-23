import crypto from 'crypto';
import bcrypt from 'bcryptjs';
import { cookies, headers } from 'next/headers';
import { q, q1 } from './db';

const COOKIE = 'ei_sid';
const SESSION_HOURS = 12;
export const sha = (s) => crypto.createHash('sha256').update(s).digest('hex');
export function secret() {
  const s = process.env.APP_SECRET;
  if (!s || s.length < 24) throw new Error('APP_SECRET falta o es muy corto (mínimo 24 caracteres)');
  return s;
}
export const hashPassword = (p) => bcrypt.hash(p, 11);
export const checkPassword = (p, h) => bcrypt.compare(p, h);
export function validPassword(p) { return typeof p === 'string' && p.length >= 8 && p.length <= 100; }

export function clientIp() {
  const h = headers();
  return (h.get('x-forwarded-for') || '').split(',')[0].trim() || h.get('x-real-ip') || 'local';
}
export async function createSession(userId) {
  const token = crypto.randomBytes(32).toString('base64url');
  const exp = new Date(Date.now() + SESSION_HOURS * 3600e3);
  await q('INSERT INTO sessions(token_hash,user_id,expires_at) VALUES($1,$2,$3)', [sha(token), userId, exp]);
  await q('DELETE FROM sessions WHERE expires_at < now()');
  cookies().set(COOKIE, token, { httpOnly: true, secure: process.env.NODE_ENV === 'production', sameSite: 'lax', path: '/', expires: exp });
}
export async function destroySession() {
  const t = cookies().get(COOKIE)?.value;
  if (t) await q('DELETE FROM sessions WHERE token_hash=$1', [sha(t)]);
  cookies().delete(COOKIE);
}
export async function currentUser() {
  const t = cookies().get(COOKIE)?.value;
  if (!t) return null;
  return q1(`SELECT u.id,u.username,u.nombre,u.role FROM sessions s JOIN users u ON u.id=s.user_id
             WHERE s.token_hash=$1 AND s.expires_at>now() AND u.activo`, [sha(t)]);
}
/** Límite de intentos guardado en Postgres (funciona entre instancias serverless). */
export async function rateLimit(key, max, windowSec) {
  const r = await q1(`INSERT INTO rate_limits(key,count,reset_at) VALUES($1,1,now()+($2||' seconds')::interval)
    ON CONFLICT(key) DO UPDATE SET count=CASE WHEN rate_limits.reset_at<now() THEN 1 ELSE rate_limits.count+1 END,
      reset_at=CASE WHEN rate_limits.reset_at<now() THEN now()+($2||' seconds')::interval ELSE rate_limits.reset_at END
    RETURNING count`, [key, String(windowSec)]);
  return r.count <= max;
}
export async function audit(userId, accion, detalle) {
  await q('INSERT INTO audit(user_id,accion,detalle,ip) VALUES($1,$2,$3,$4)', [userId || null, accion, detalle ? String(detalle).slice(0, 1000) : null, clientIp()]);
}
