import { handler, json, body, clean, HttpError, csv } from '@/lib/api';
import { q, q1 } from '@/lib/db';
export const dynamic = 'force-dynamic';
import { range } from '@/lib/filters';
export const GET = handler(async (req) => {
  const u = new URL(req.url); const { from, to } = range(u, 0);
  const aula = clean(u.searchParams.get('aula'), 60); const s = clean(u.searchParams.get('q'), 60);
  const tipo = ['INGRESO', 'SALIDA'].includes(u.searchParams.get('tipo')) ? u.searchParams.get('tipo') : '';
  const solo = u.searchParams.get('solo') || '';
  const rows = await q(`SELECT a.id, to_char(a.fecha,'YYYY-MM-DD') fecha, to_char(a.ts AT TIME ZONE 'America/Lima','HH24:MI:SS') hora, a.tipo, a.tarde, a.minutos_tarde,
      a.anticipado, a.recoge_nombre, a.nota, a.metodo, st.id student_id, st.dni, st.apellidos||', '||st.nombres estudiante, st.grado||' '||st.seccion aula,
      coalesce(us.nombre,'—') registrado_por, (SELECT e.status FROM emails e WHERE e.ref='att-'||a.id) correo
    FROM attendance a JOIN students st ON st.id=a.student_id LEFT JOIN users us ON us.id=a.user_id
    WHERE a.fecha BETWEEN $1 AND $2 AND ($3='' OR st.grado||' '||st.seccion=$3)
      AND ($4='' OR st.dni ILIKE '%'||$4||'%' OR (st.nombres||' '||st.apellidos) ILIKE '%'||$4||'%')
      AND ($5='' OR a.tipo=$5) AND ($6<>'tarde' OR a.tarde) AND ($6<>'anticipado' OR a.anticipado)
    ORDER BY a.ts DESC LIMIT 20000`, [from, to, aula, s, tipo, solo]);
  if (u.searchParams.get('format') === 'csv')
    return csv(rows, [['fecha', 'Fecha'], ['hora', 'Hora'], ['tipo', 'Tipo'], ['dni', 'DNI'], ['estudiante', 'Estudiante'], ['aula', 'Aula'], ['minutos_tarde', 'Min. tarde'],
      ['anticipado', 'Retiro anticipado'], ['recoge_nombre', 'Recogido por'], ['nota', 'Nota'], ['metodo', 'Método'], ['registrado_por', 'Registrado por'], ['correo', 'Correo']], `asistencia_${from}_${to}.csv`);
  return json({ rows: rows.slice(0, 2000), total: rows.length, from, to });
});
