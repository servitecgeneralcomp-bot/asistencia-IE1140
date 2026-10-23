import { handler, json, body, clean, HttpError, csv } from '@/lib/api';
import { q, q1 } from '@/lib/db';
export const dynamic = 'force-dynamic';
import { validateStudent } from '@/lib/students';
import { audit } from '@/lib/auth';
const getId = (p) => { const n = parseInt(p.id, 10); if (!n) throw new HttpError(400, 'ID inválido'); return n; };
export const GET = handler(async (req, { params }) => {
  const s = await q1('SELECT * FROM students WHERE id=$1', [getId(params)]);
  if (!s) throw new HttpError(404, 'No encontrado'); delete s.qr_nonce;
  const hist = await q('SELECT * FROM attendance WHERE student_id=$1 ORDER BY ts DESC LIMIT 60', [s.id]);
  return json({ student: s, historial: hist });
});
export const PUT = handler(async (req, { params, user }) => {
  const id = getId(params); const b = await body(req);
  if (b.activo !== undefined && Object.keys(b).length === 1) {
    await q('UPDATE students SET activo=$2, updated_at=now() WHERE id=$1', [id, !!b.activo]);
    await audit(user.id, b.activo ? 'estudiante_activar' : 'estudiante_desactivar', String(id)); return json({ ok: true });
  }
  const s = validateStudent(b);
  if (await q1('SELECT 1 FROM students WHERE dni=$1 AND id<>$2', [s.dni, id])) throw new HttpError(409, 'Otro estudiante ya tiene ese documento');
  await q(`UPDATE students SET dni=$2,nombres=$3,apellidos=$4,grado=$5,seccion=$6,aula=$7,apoderado_nombre=$8,apoderado_email=$9,apoderado_telefono=$10,
    hora_entrada=$11,hora_salida=$12,foto=CASE WHEN $13 THEN $14 ELSE foto END,updated_at=now() WHERE id=$1`,
    [id, s.dni, s.nombres, s.apellidos, s.grado, s.seccion, s.aula, s.apoderado_nombre, s.apoderado_email, s.apoderado_telefono, s.hora_entrada, s.hora_salida, s.foto !== undefined, s.foto ?? null]);
  await audit(user.id, 'estudiante_editar', s.dni);
  return json({ ok: true });
}, { role: 'admin' });
export const DELETE = handler(async (req, { params, user }) => {
  const id = getId(params); const s = await q1('SELECT dni FROM students WHERE id=$1', [id]);
  if (!s) throw new HttpError(404, 'No encontrado');
  await q('DELETE FROM students WHERE id=$1', [id]); await audit(user.id, 'estudiante_eliminar', s.dni);
  return json({ ok: true });
}, { role: 'admin' });
