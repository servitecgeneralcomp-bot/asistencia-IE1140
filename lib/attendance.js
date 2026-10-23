import { q, q1 } from './db';
import { getSettings } from './settings';
import { limaDate, limaTime, limaMinutes, hhmmToMin, fmtDateLong } from './time';
import { enqueue, processOutbox, template, escHtml } from './mail';
import { audit } from './auth';

export const fullName = (s) => `${s.nombres} ${s.apellidos}`;
export const aulaLabel = (s) => [s.grado, s.seccion && `"${s.seccion}"`, s.aula && `(${s.aula})`].filter(Boolean).join(' ');

/**
 * Registra ingreso/salida. tipo: 'AUTO' alterna según el último registro del día.
 * Devuelve { ok, tipo, ... } o { ok:false, error, code }.
 */
export async function registerMark({ student, tipo = 'AUTO', user, metodo = 'QR', recoge_nombre = null, nota = null, force = false }) {
  const st = await getSettings();
  const now = new Date();
  const fecha = limaDate(now);
  const last = await q1('SELECT * FROM attendance WHERE student_id=$1 AND fecha=$2 ORDER BY ts DESC LIMIT 1', [student.id, fecha]);
  const auto = tipo === 'AUTO';
  if (auto) tipo = !last || last.tipo === 'SALIDA' ? 'INGRESO' : 'SALIDA';
  if (last && !force) {
    const mins = (now - new Date(last.ts)) / 60000;
    if ((last.tipo === tipo || auto) && mins < Math.max(st.dedupe_min, 0.25))
      return { ok: false, code: 'DUPLICADO', error: `Ya se registró ${last.tipo.toLowerCase()} hace ${Math.max(1, Math.round(mins))} min`, last };
    if (last.tipo !== tipo && tipo === 'SALIDA' && mins < st.min_entre_ingreso_salida)
      return { ok: false, code: 'MUY_PRONTO', error: `Ingresó hace ${Math.round(mins)} min. ¿Seguro que es una salida? Use "Salida" manual para confirmar.`, last };
    if (last.tipo === tipo && tipo === 'INGRESO') return { ok: false, code: 'YA_INGRESO', error: 'Ya tiene ingreso registrado hoy y no tiene salida', last };
  }
  if (!last && tipo === 'SALIDA' && !force) return { ok: false, code: 'SIN_INGRESO', error: 'No tiene ingreso hoy. Use "Salida" manual para confirmar.' };

  const nowMin = limaMinutes(now);
  let tarde = false, minutos_tarde = 0, anticipado = false;
  if (tipo === 'INGRESO' && !(await q1("SELECT 1 FROM attendance WHERE student_id=$1 AND fecha=$2 AND tipo='INGRESO'", [student.id, fecha]))) {
    const limite = hhmmToMin(student.hora_entrada || st.hora_entrada) + st.tolerancia;
    if (nowMin > limite) { tarde = true; minutos_tarde = nowMin - hhmmToMin(student.hora_entrada || st.hora_entrada); }
  }
  if (tipo === 'SALIDA' && nowMin < hhmmToMin(student.hora_salida || st.hora_salida)) anticipado = true;

  const rec = await q1(`INSERT INTO attendance(student_id,tipo,ts,fecha,tarde,minutos_tarde,anticipado,recoge_nombre,nota,metodo,user_id)
    VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11) RETURNING *`, [student.id, tipo, now, fecha, tarde, minutos_tarde, anticipado, recoge_nombre || null, nota || null, metodo, user?.id || null]);
  await audit(user?.id, `marca_${tipo.toLowerCase()}`, `${student.dni} ${fullName(student)} (${metodo})${anticipado ? ' anticipada' : ''}`);

  const hora = limaTime(now).slice(0, 5);
  if ((tipo === 'INGRESO' ? st.notify_ingreso : st.notify_salida) && student.apoderado_email) {
    const isIn = tipo === 'INGRESO';
    const lines = [
      `Estimado(a) ${escHtml(student.apoderado_nombre || 'apoderado(a)')}:`,
      `Le informamos que <b>${escHtml(fullName(student))}</b> (${escHtml(aulaLabel(student))}) registró su <b>${isIn ? 'ingreso' : 'salida'}</b> del colegio.`,
      `Fecha: ${escHtml(fmtDateLong(fecha))}<br>Hora: <b style="font-size:18px">${hora}</b> (hora de Lima)`,
    ];
    if (tarde) lines.push(`<span style="color:#b45309">Llegó con <b>${minutos_tarde} min</b> de tardanza (hora de entrada ${escHtml(student.hora_entrada || st.hora_entrada)}).</span>`);
    if (anticipado) lines.push(`<span style="color:#b45309">Retiro anticipado${recoge_nombre ? ` — recogido por <b>${escHtml(recoge_nombre)}</b>` : ''}.</span>`);
    if (nota) lines.push(`Observación: ${escHtml(nota)}`);
    await enqueue({ to: student.apoderado_email, kind: tipo.toLowerCase(), ref: `att-${rec.id}`,
      subject: `${isIn ? 'Ingreso registrado' : 'Salida registrada'}: ${student.nombres} - ${hora} - I.E. 1140`,
      html: template(st, isIn ? (tarde ? 'Ingreso con tardanza' : 'Ingreso registrado') : (anticipado ? 'Retiro anticipado' : 'Salida registrada'), isIn ? '#047857' : '#4338ca', lines) });
    // Intento inmediato (máx. ~8 s). Si falla queda en la cola y se reintenta.
    try { await processOutbox(3); } catch (e) { console.error(e); }
  }
  return { ok: true, tipo, hora, fecha, tarde, minutos_tarde, anticipado, record: rec };
}

/** Días lectivos entre dos fechas (excluye fines de semana no lectivos y feriados). */
export async function schoolDays(from, to, st) {
  const hol = new Set((await q('SELECT to_char(fecha,\'YYYY-MM-DD\') f FROM holidays WHERE fecha BETWEEN $1 AND $2', [from, to])).map((r) => r.f));
  const out = []; let d = from; let guard = 0;
  while (d <= to && guard++ < 800) {
    const wd = new Date(d + 'T12:00:00Z').getUTCDay();
    if (st.dias_lectivos.includes(wd) && !hol.has(d)) out.push(d);
    const n = new Date(d + 'T12:00:00Z'); n.setUTCDate(n.getUTCDate() + 1); d = n.toISOString().slice(0, 10);
  }
  return out;
}
