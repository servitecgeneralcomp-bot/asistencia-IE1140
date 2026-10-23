import { handler, json, body, clean, HttpError, csv } from '@/lib/api';
import { q, q1 } from '@/lib/db';
export const dynamic = 'force-dynamic';
import { limaDate, limaTime, weekday } from '@/lib/time';
import { getSettings } from '@/lib/settings';
import { processOutbox } from '@/lib/mail';
export const GET = handler(async (req) => {
  const fecha = limaDate(); const st = await getSettings();
  processOutbox(5).catch(() => {}); // reintenta correos pendientes en segundo plano
  const rows = await q(`SELECT st.id, st.dni, st.apellidos||', '||st.nombres nombre, st.grado||' '||st.seccion aula, st.apoderado_telefono,
      (SELECT to_char(min(ts) AT TIME ZONE 'America/Lima','HH24:MI') FROM attendance WHERE student_id=st.id AND fecha=$1 AND tipo='INGRESO') ingreso,
      (SELECT bool_or(tarde) FROM attendance WHERE student_id=st.id AND fecha=$1) tarde,
      (SELECT tipo FROM attendance WHERE student_id=st.id AND fecha=$1 ORDER BY ts DESC LIMIT 1) ultimo,
      (SELECT to_char(max(ts) AT TIME ZONE 'America/Lima','HH24:MI') FROM attendance WHERE student_id=st.id AND fecha=$1 AND tipo='SALIDA') salida,
      EXISTS(SELECT 1 FROM justifications j WHERE j.student_id=st.id AND j.fecha=$1 AND j.tipo='FALTA') justificado
    FROM students st WHERE st.activo ORDER BY 4,3`, [fecha]);
  const hol = await q1('SELECT descripcion FROM holidays WHERE fecha=$1', [fecha]);
  const c = { total: rows.length, presentes: 0, ausentes: 0, tarde: 0, sin_salida: 0, salieron: 0, justificados: 0 };
  const aulas = {};
  for (const r of rows) {
    const a = (aulas[r.aula] ||= { aula: r.aula, total: 0, presentes: 0, tarde: 0 }); a.total++;
    if (r.ingreso) { c.presentes++; a.presentes++; if (r.tarde) { c.tarde++; a.tarde++; } if (r.ultimo === 'INGRESO') c.sin_salida++; else c.salieron++; }
    else if (r.justificado) c.justificados++; else c.ausentes++;
  }
  const ultimos = await q(`SELECT a.tipo, a.tarde, a.anticipado, to_char(a.ts AT TIME ZONE 'America/Lima','HH24:MI') hora, s.nombres||' '||s.apellidos nombre, s.grado||' '||s.seccion aula
    FROM attendance a JOIN students s ON s.id=a.student_id WHERE a.fecha=$1 ORDER BY a.ts DESC LIMIT 12`, [fecha]);
  const mail = await q1("SELECT count(*) FILTER (WHERE status='pendiente' OR status='enviando')::int pendientes, count(*) FILTER (WHERE status='fallido')::int fallidos FROM emails WHERE created_at > now()-interval '2 days'");
  return json({ fecha, hora: limaTime(), counts: c, aulas: Object.values(aulas), lista: rows, ultimos, feriado: hol?.descripcion || null,
    lectivo: st.dias_lectivos.includes(weekday(fecha)) && !hol, mail });
});
