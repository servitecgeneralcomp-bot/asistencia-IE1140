import { handler, json, body, clean, HttpError, csv } from '@/lib/api';
import { q, q1 } from '@/lib/db';
export const dynamic = 'force-dynamic';
export const GET = handler(async (req) => {
  const s = clean(new URL(req.url).searchParams.get('q'), 60);
  return json({ rows: await q(`SELECT a.id, to_char(a.ts AT TIME ZONE 'America/Lima','YYYY-MM-DD HH24:MI:SS') fecha, coalesce(u.nombre,'—') usuario, a.accion, a.detalle, a.ip
    FROM audit a LEFT JOIN users u ON u.id=a.user_id WHERE ($1='' OR a.accion ILIKE '%'||$1||'%' OR a.detalle ILIKE '%'||$1||'%' OR u.nombre ILIKE '%'||$1||'%')
    ORDER BY a.id DESC LIMIT 500`, [s]) });
}, { role: 'admin' });
