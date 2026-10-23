import { handler, json, body, clean, HttpError, csv } from '@/lib/api';
import { q, q1 } from '@/lib/db';
export const dynamic = 'force-dynamic';
import { validateStudent } from '@/lib/students';
import { newNonce } from '@/lib/qr';
import { audit } from '@/lib/auth';
export const GET = handler(async (req) => {
  const u = new URL(req.url); const s = clean(u.searchParams.get('q'), 60); const aula = clean(u.searchParams.get('aula'), 60);
  const inact = u.searchParams.get('inactivos') === '1';
  const rows = await q(`SELECT id,dni,nombres,apellidos,grado,seccion,aula,apoderado_nombre,apoderado_email,apoderado_telefono,hora_entrada,hora_salida,activo,
      (foto IS NOT NULL) tiene_foto FROM students
    WHERE ($1='' OR dni ILIKE '%'||$1||'%' OR (nombres||' '||apellidos) ILIKE '%'||$1||'%' OR (apellidos||' '||nombres) ILIKE '%'||$1||'%')
      AND ($2='' OR (grado||' '||seccion)=$2) AND (activo OR $3) ORDER BY grado,seccion,apellidos,nombres LIMIT 2000`, [s, aula, inact]);
  const aulas = (await q("SELECT DISTINCT grado||' '||seccion a FROM students WHERE activo ORDER BY 1")).map((r) => r.a);
  return json({ students: rows, aulas });
});
export const POST = handler(async (req, { user }) => {
  const s = validateStudent(await body(req));
  if (await q1('SELECT 1 FROM students WHERE dni=$1', [s.dni])) throw new HttpError(409, 'Ya existe un estudiante con ese documento');
  const r = await q1(`INSERT INTO students(dni,nombres,apellidos,grado,seccion,aula,apoderado_nombre,apoderado_email,apoderado_telefono,hora_entrada,hora_salida,foto,qr_nonce)
    VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13) RETURNING id`, [s.dni, s.nombres, s.apellidos, s.grado, s.seccion, s.aula, s.apoderado_nombre, s.apoderado_email, s.apoderado_telefono, s.hora_entrada, s.hora_salida, s.foto || null, newNonce()]);
  await audit(user.id, 'estudiante_crear', s.dni);
  return json({ ok: true, id: r.id });
}, { role: 'admin' });
