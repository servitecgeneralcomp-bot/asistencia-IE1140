import { handler, json, body, clean, HttpError, csv } from '@/lib/api';
import { q, q1 } from '@/lib/db';
export const dynamic = 'force-dynamic';
import { hashPassword, validPassword, audit } from '@/lib/auth';
export const GET = handler(async () => json({ rows: await q('SELECT id,username,nombre,role,activo,created_at FROM users ORDER BY id') }), { role: 'admin' });
export const POST = handler(async (req, { user }) => {
  const b = await body(req); const username = clean(b.username, 40).toLowerCase();
  if (!/^[a-z0-9._-]{3,40}$/.test(username)) throw new HttpError(400, 'Usuario: 3-40 letras, números, punto o guion');
  if (!['admin', 'auxiliar'].includes(b.role)) throw new HttpError(400, 'Rol inválido');
  if (!validPassword(b.password)) throw new HttpError(400, 'Contraseña mínima de 8 caracteres');
  if (await q1('SELECT 1 FROM users WHERE username=$1', [username])) throw new HttpError(409, 'Ese usuario ya existe');
  await q('INSERT INTO users(username,nombre,password_hash,role) VALUES($1,$2,$3,$4)', [username, clean(b.nombre, 80) || username, await hashPassword(b.password), b.role]);
  await audit(user.id, 'usuario_crear', `${username} (${b.role})`); return json({ ok: true });
}, { role: 'admin' });
