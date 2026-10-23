import crypto from 'crypto';
import { secret } from './auth';
// Formato del QR: EI1140.<id>.<firma>  — la firma HMAC impide fabricar o adivinar carnets.
const sig = (id, nonce) => crypto.createHmac('sha256', secret()).update(`qr:${id}:${nonce}`).digest('base64url').slice(0, 22);
export const qrToken = (s) => `EI1140.${s.id}.${sig(s.id, s.qr_nonce)}`;
export const newNonce = () => crypto.randomBytes(9).toString('base64url');
export function parseToken(t) {
  const m = /^EI1140\.(\d{1,9})\.([A-Za-z0-9_-]{22})$/.exec(String(t || '').trim());
  return m ? { id: +m[1], sig: m[2] } : null;
}
export function verifyToken(parsed, student) {
  const a = Buffer.from(parsed.sig), b = Buffer.from(sig(student.id, student.qr_nonce));
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}
