import { handler, json, body, clean, HttpError, csv } from '@/lib/api';
import { q, q1 } from '@/lib/db';
export const dynamic = 'force-dynamic';
import { range } from '@/lib/filters';
import { getSettings } from '@/lib/settings';
import { schoolDays } from '@/lib/attendance';
import { limaDate } from '@/lib/time';
export const GET = handler(async (req) => {
  const u = new URL(req.url); const { from, to } = range(u, 30); const aula = clean(u.searchParams.get('aula'), 60);
  const st = await getSettings();
  const today = limaDate();
  const dias = (await schoolDays(from, to > today ? today : to, st));
  const rows = await q(`WITH d AS (SELECT unnest($1::date[]) fecha)
    SELECT st.id, st.dni, st.apellidos||', '||st.nombres estudiante, st.grado||' '||st.seccion aula, st.apoderado_telefono,
      count(*) FILTER (WHERE NOT EXISTS(SELECT 1 FROM attendance a WHERE a.student_id=st.id AND a.fecha=d.fecha AND a.tipo='INGRESO'))::int faltas,
      count(*) FILTER (WHERE NOT EXISTS(SELECT 1 FROM attendance a WHERE a.student_id=st.id AND a.fecha=d.fecha AND a.tipo='INGRESO')
        AND EXISTS(SELECT 1 FROM justifications j WHERE j.student_id=st.id AND j.fecha=d.fecha AND j.tipo='FALTA'))::int justificadas,
      string_agg(CASE WHEN NOT EXISTS(SELECT 1 FROM attendance a WHERE a.student_id=st.id AND a.fecha=d.fecha AND a.tipo='INGRESO') THEN to_char(d.fecha,'DD/MM') END, ', ' ORDER BY d.fecha) detalle
    FROM students st CROSS JOIN d WHERE st.activo AND d.fecha >= st.created_at::date AND ($2='' OR st.grado||' '||st.seccion=$2)
    GROUP BY st.id HAVING count(*) FILTER (WHERE NOT EXISTS(SELECT 1 FROM attendance a WHERE a.student_id=st.id AND a.fecha=d.fecha AND a.tipo='INGRESO'))>0
    ORDER BY faltas DESC`, [dias, aula]);
  if (u.searchParams.get('format') === 'csv')
    return csv(rows, [['dni', 'DNI'], ['estudiante', 'Estudiante'], ['aula', 'Aula'], ['faltas', 'Faltas'], ['justificadas', 'Justificadas'], ['detalle', 'Fechas'], ['apoderado_telefono', 'Teléfono apoderado']], `faltas_${from}_${to}.csv`);
  return json({ from, to, diasLectivos: dias.length, rows });
});
