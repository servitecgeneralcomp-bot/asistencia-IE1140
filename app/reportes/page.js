'use client';
import { useEffect, useState } from 'react';
import Shell, { useMe } from '@/components/Shell';
import { api, AulaSelect, useAulas, daysAgo, todayLima, Stat, Msg } from '@/components/ui';
export default function Page() { return <Shell><Rep /></Shell>; }
function Rep() {
  const me = useMe(); const aulas = useAulas(); const [tab, setTab] = useState('tardanzas');
  const [f, setF] = useState({ desde: daysAgo(30), hasta: todayLima(), aula: '' });
  const set = (k) => (e) => setF({ ...f, [k]: e.target?.value ?? e });
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2 no-print">{[['tardanzas', '⏰ Tardanzas'], ['faltas', '🚫 Faltas'], ['justif', '📝 Justificaciones']].map(([k, l]) => <button key={k} onClick={() => setTab(k)} className={`btn ${tab === k ? 'bg-indigo-600 text-white' : 'bg-white border'}`}>{l}</button>)}</div>
      <div className="card !p-3 grid grid-cols-2 md:grid-cols-4 gap-2 no-print">
        <div><label className="lbl">Desde</label><input type="date" className="inp" value={f.desde} onChange={set('desde')} /></div>
        <div><label className="lbl">Hasta</label><input type="date" className="inp" value={f.hasta} onChange={set('hasta')} /></div>
        <div><label className="lbl">Aula</label><AulaSelect aulas={aulas} value={f.aula} onChange={set('aula')} /></div>
        <div className="flex items-end gap-2">{tab !== 'justif' && <a className="btn-s" href={`/api/reports/${tab}?format=csv&${new URLSearchParams(f)}`}>⬇️ CSV</a>}<button className="btn-s" onClick={() => print()}>🖨️ PDF</button></div>
      </div>
      <p className="hidden print:block font-bold">{me.settings.school_name} — Reporte de {tab} del {f.desde} al {f.hasta} {f.aula}</p>
      {tab === 'tardanzas' && <Tard f={f} st={me.settings} />}{tab === 'faltas' && <Faltas f={f} />}{tab === 'justif' && <Justif f={f} />}
    </div>
  );
}
function Tard({ f, st }) {
  const [d, setD] = useState(null);
  useEffect(() => { api('/api/reports/tardanzas?' + new URLSearchParams(f)).then(setD).catch((e) => alert(e.message)); }, [f]);
  if (!d) return null; const tot = d.rows.reduce((a, r) => a + r.tardanzas, 0); const max = Math.max(1, ...d.porDia.map((x) => x.tardanzas));
  return (<>
    <p className="text-xs text-slate-500">Se considera tardanza llegar después de las {st.hora_entrada} + {st.tolerancia} min de tolerancia (o el horario propio del estudiante).</p>
    <div className="grid grid-cols-3 gap-3"><Stat label="Tardanzas" value={tot} tone="amber" /><Stat label="Estudiantes con tardanza" value={d.rows.length} /><Stat label="Aulas" value={d.porAula.length} /></div>
    {d.porDia.length > 0 && <div className="card"><h3 className="text-sm font-bold mb-2">Tardanzas por día</h3><div className="flex items-end gap-1 h-32">{d.porDia.map((x) => <div key={x.fecha} className="flex-1 flex flex-col items-center justify-end h-full" title={`${x.fecha}: ${x.tardanzas}`}><span className="text-[9px]">{x.tardanzas}</span><div className="w-full bg-amber-400 rounded-t" style={{ height: `${x.tardanzas * 100 / max}%` }} /><span className="text-[8px] text-slate-400">{x.fecha.slice(8)}</span></div>)}</div></div>}
    <div className="grid lg:grid-cols-3 gap-4">
      <div className="card !p-0 overflow-x-auto lg:col-span-2"><table className="tbl"><thead><tr><th>Estudiante</th><th>Aula</th><th>N.º</th><th>Justif.</th><th>Min.</th><th>Detalle</th></tr></thead><tbody>
        {d.rows.map((r) => <tr key={r.id}><td>{r.estudiante}</td><td className="text-xs">{r.aula}</td><td className="font-bold text-amber-600">{r.tardanzas}</td><td>{r.justificadas}</td><td>{r.minutos}</td><td className="text-[11px] text-slate-500">{r.detalle}</td></tr>)}
        {!d.rows.length && <tr><td colSpan={6} className="text-center py-6 text-slate-400">Sin tardanzas 🎉</td></tr>}</tbody></table></div>
      <div className="card !p-0"><table className="tbl"><thead><tr><th>Aula</th><th>Tardanzas</th><th>Estud.</th></tr></thead><tbody>{d.porAula.map((a) => <tr key={a.aula}><td>{a.aula}</td><td>{a.tardanzas}</td><td>{a.estudiantes}</td></tr>)}</tbody></table></div>
    </div></>);
}
function Faltas({ f }) {
  const [d, setD] = useState(null);
  useEffect(() => { api('/api/reports/faltas?' + new URLSearchParams(f)).then(setD).catch((e) => alert(e.message)); }, [f]);
  if (!d) return null;
  return (<>
    <p className="text-xs text-slate-500">{d.diasLectivos} días lectivos en el rango (sin fines de semana ni feriados). Falta = día lectivo sin ingreso.</p>
    <div className="card !p-0 overflow-x-auto"><table className="tbl"><thead><tr><th>Estudiante</th><th>Aula</th><th>Faltas</th><th>Justif.</th><th>Fechas</th><th>Celular apoderado</th></tr></thead><tbody>
      {d.rows.map((r) => <tr key={r.id}><td>{r.estudiante}</td><td className="text-xs">{r.aula}</td><td className="font-bold text-rose-600">{r.faltas}</td><td>{r.justificadas}</td><td className="text-[11px] text-slate-500">{r.detalle}</td><td className="text-xs">{r.apoderado_telefono}</td></tr>)}
      {!d.rows.length && <tr><td colSpan={6} className="text-center py-6 text-slate-400">Sin faltas</td></tr>}</tbody></table></div></>);
}
function Justif({ f }) {
  const me = useMe(); const [rows, setRows] = useState([]); const [qs, setQs] = useState(''); const [found, setFound] = useState([]); const [msg, setMsg] = useState('');
  const [n, setN] = useState({ studentId: '', nombre: '', fecha: todayLima(), tipo: 'FALTA', motivo: '' });
  const load = () => api('/api/justifications?' + new URLSearchParams(f)).then((d) => setRows(d.rows));
  useEffect(() => { load(); }, [f]);
  useEffect(() => { if (qs.length < 2) return setFound([]); const t = setTimeout(() => api('/api/students?q=' + encodeURIComponent(qs)).then((d) => setFound(d.students.slice(0, 6))), 250); return () => clearTimeout(t); }, [qs]);
  const save = async (e) => { e.preventDefault(); try { await api('/api/justifications', { method: 'POST', body: n }); setMsg('✅ Justificación registrada'); setN({ ...n, studentId: '', nombre: '', motivo: '' }); load(); } catch (er) { setMsg('❌ ' + er.message); } };
  return (<div className="grid lg:grid-cols-3 gap-4">
    <form onSubmit={save} className="card space-y-2 no-print"><h3 className="font-bold text-sm">Nueva justificación</h3>
      {n.studentId ? <div className="text-sm bg-indigo-50 rounded p-2 flex justify-between">{n.nombre}<button type="button" onClick={() => setN({ ...n, studentId: '' })}>✕</button></div> :
        <><input className="inp" placeholder="Buscar estudiante" value={qs} onChange={(e) => setQs(e.target.value)} />{found.map((s) => <button type="button" key={s.id} className="block w-full text-left text-sm px-2 py-1 hover:bg-indigo-50 rounded" onClick={() => { setN({ ...n, studentId: s.id, nombre: `${s.apellidos}, ${s.nombres}` }); setQs(''); }}>{s.apellidos}, {s.nombres} <span className="text-xs text-slate-400">{s.grado} {s.seccion}</span></button>)}</>}
      <div className="grid grid-cols-2 gap-2"><input type="date" className="inp" value={n.fecha} onChange={(e) => setN({ ...n, fecha: e.target.value })} />
        <select className="inp" value={n.tipo} onChange={(e) => setN({ ...n, tipo: e.target.value })}><option value="FALTA">Falta</option><option value="TARDANZA">Tardanza</option></select></div>
      <textarea className="inp" rows={3} placeholder="Motivo (ej. cita médica, con constancia)" value={n.motivo} onChange={(e) => setN({ ...n, motivo: e.target.value })} required />
      <Msg m={msg} /><button className="btn-p w-full" disabled={!n.studentId}>Guardar</button></form>
    <div className="card !p-0 overflow-x-auto lg:col-span-2"><table className="tbl"><thead><tr><th>Fecha</th><th>Estudiante</th><th>Tipo</th><th>Motivo</th><th>Registró</th><th></th></tr></thead><tbody>
      {rows.map((r) => <tr key={r.id}><td className="text-xs">{r.fecha}</td><td className="text-sm">{r.estudiante}<br /><span className="text-[11px] text-slate-400">{r.aula}</span></td><td className="text-xs">{r.tipo}</td><td className="text-xs">{r.motivo}</td><td className="text-xs">{r.por}</td>
        <td>{me.user.role === 'admin' && <button className="text-rose-500 text-xs" onClick={async () => { await api('/api/justifications?id=' + r.id, { method: 'DELETE' }); load(); }}>✕</button>}</td></tr>)}
      {!rows.length && <tr><td colSpan={6} className="text-center py-6 text-slate-400">Sin justificaciones</td></tr>}</tbody></table></div>
  </div>);
}
