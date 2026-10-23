import { handler, json, body, clean, HttpError, csv } from '@/lib/api';
import { q, q1 } from '@/lib/db';
export const dynamic = 'force-dynamic';
import { checkPassword, hashPassword, createSession, rateLimit, clientIp, audit } from '@/lib/auth';
export const POST = handler(async (req) => {
  const b = await body(req);
  const username = clean(b.username, 40).toLowerCase();
  const ip = clientIp();
  if (!(await rateLimit('login:' + ip, 20, 900)) || !(await rateLimit('loginu:' + username, 8, 900)))
    throw new HttpError(429, 'Demasiados intentos. Espera 15 minutos.');
  const u = await q1('SELECT * FROM users WHERE username=$1 AND activo', [username]);
  const ok = u ? await checkPassword(String(b.password || ''), u.password_hash) : (await hashPassword('timing'), false);
  if (!u || !ok) { await audit(u?.id, 'login_fallido', username); throw new HttpError(401, 'Usuario o contraseña incorrectos'); }
  await createSession(u.id); await audit(u.id, 'login', username);
  return json({ ok: true, user: { nombre: u.nombre, role: u.role } });
}, { auth: false });
