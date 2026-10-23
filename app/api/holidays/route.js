import { handler, json, body, clean, HttpError, csv } from '@/lib/api';
import { q, q1 } from '@/lib/db';
export const dynamic = 'force-dynamic';
import { audit } from '@/lib/auth';
export const GET = handler(async () => json({ rows: await q("SELECT to_char(fecha,'YYYY-MM-DD') fecha, descripcion FROM holidays WHERE fecha >= now()::date - 400 ORDER BY fecha") }));
export const POST = handler(async (req, { user }) => {
  const b = await body(req);
  if (b.preset === 'peru') {
    const y = parseInt(b.year, 10) || new Date().getFullYear();
    const list = [['01-01', 'Año Nuevo'], ['05-01', 'Día del Trabajo'], ['06-07', 'Batalla de Arica y Día de la Bandera'], ['06-29', 'San Pedro y San Pablo'], ['07-23', 'Día de la Fuerza Aérea'], ['07-28', 'Fiestas Patrias'], ['07-29', 'Fiestas Patrias'],
      ['08-06', 'Batalla de Junín'], ['08-30', 'Santa Rosa de Lima'], ['10-08', 'Combate de Angamos'], ['11-01', 'Todos los Santos'], ['12-08', 'Inmaculada Concepción'], ['12-09', 'Batalla de Ayacucho'], ['12-25', 'Navidad']];
    for (const [md, d] of list) await q('INSERT INTO holidays VALUES($1,$2) ON CONFLICT DO NOTHING', [`${y}-${md}`, d]);
    await audit(user.id, 'feriados_peru', String(y)); return json({ ok: true, agregados: list.length });
  }
  if (!/^\d{4}-\d{2}-\d{2}$/.test(b.fecha || '')) throw new HttpError(400, 'Fecha inválida');
  await q('INSERT INTO holidays VALUES($1,$2) ON CONFLICT(fecha) DO UPDATE SET descripcion=$2', [b.fecha, clean(b.descripcion, 100) || 'Sin clases']);
  await audit(user.id, 'feriado_agregar', b.fecha); return json({ ok: true });
}, { role: 'admin' });
export const DELETE = handler(async (req, { user }) => {
  const f = new URL(req.url).searchParams.get('fecha');
  await q('DELETE FROM holidays WHERE fecha=$1', [f]); await audit(user.id, 'feriado_eliminar', f); return json({ ok: true });
}, { role: 'admin' });
