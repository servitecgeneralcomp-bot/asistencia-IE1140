import { handler, json, body, clean, HttpError, csv } from '@/lib/api';
import { q, q1 } from '@/lib/db';
export const dynamic = 'force-dynamic';
import { range } from '@/lib/filters';
export const GET = handler(async (req) => {
  const u = new URL(req.url); const { from, to } = range(u, 30); const aula = clean(u.searchParams.get('aula'), 60);
  const rows = await q(`SELECT st.id, st.dni, st.apellidos||', '||st.nombres estudiante, st.grado||' '||st.seccion aula,
      count(a.id)::int tardanzas, coalesce(sum(a.minutos_tarde),0)::int minutos, coalesce(round(avg(a.minutos_tarde)),0)::int promedio,
      count(j.id)::int justificadas, string_agg(to_char(a.fecha,'DD/MM')||' +'||a.minutos_tarde||'m', ', ' ORDER BY a.fecha) detalle
    FROM attendance a JOIN students st ON st.id=a.student_id
    LEFT JOIN justifications j ON j.student_id=a.student_id AND j.fecha=a.fecha AND j.tipo='TARDANZA'
    WHERE a.tarde AND a.fecha BETWEEN $1 AND $2 AND ($3='' OR st.grado||' '||st.seccion=$3)
    GROUP BY st.id ORDER BY tardanzas DESC, minutos DESC`, [from, to, aula]);
  const porAula = await q(`SELECT st.grado||' '||st.seccion aula, count(*)::int tardanzas, count(DISTINCT a.student_id)::int estudiantes
    FROM attendance a JOIN students st ON st.id=a.student_id WHERE a.tarde AND a.fecha BETWEEN $1 AND $2 AND ($3='' OR st.grado||' '||st.seccion=$3) GROUP BY 1 ORDER BY 2 DESC`, [from, to, aula]);
  const porDia = await q(`SELECT to_char(a.fecha,'YYYY-MM-DD') fecha, count(*)::int tardanzas FROM attendance a JOIN students st ON st.id=a.student_id
    WHERE a.tarde AND a.fecha BETWEEN $1 AND $2 AND ($3='' OR st.grado||' '||st.seccion=$3) GROUP BY 1 ORDER BY 1`, [from, to, aula]);
  if (u.searchParams.get('format') === 'csv')
    return csv(rows, [['dni', 'DNI'], ['estudiante', 'Estudiante'], ['aula', 'Aula'], ['tardanzas', 'Tardanzas'], ['justificadas', 'Justificadas'], ['minutos', 'Minutos totales'], ['promedio', 'Promedio (min)'], ['detalle', 'Detalle']], `tardanzas_${from}_${to}.csv`);
  return json({ from, to, rows, porAula, porDia });
});
