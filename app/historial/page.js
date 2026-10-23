'use client';
import { useEffect, useState } from 'react';
import Shell, { useMe } from '@/components/Shell';
import { api, AulaSelect, useAulas, todayLima } from '@/components/ui';
export default function Page() { return <Shell><Hist /></Shell>; }
function Hist() {
  const me = useMe(); const aulas = useAulas();
  const [f, setF] = useState({ desde: todayLima(), hasta: todayLima(), aula: '', q: '', tipo: '', solo: '' }); const [d, setD] = useState(null);
  const qs = () => new URLSearchParams(f).toString();
  const load = () => api('/api/attendance?' + qs()).then(setD).catch((e) => alert(e.message));
  useEffect(() => { const t = setTimeout(load, 250); return () => clearTimeout(t); }, [f]);
  const set = (k) => (e) => setF({ ...f, [k]: e.target?.value ?? e });
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap justify-between gap-2 items-center"><h2 className="text-lg font-bold">Historial de ingresos y salidas</h2>
        <div className="flex gap-2 no-print"><a className="btn-s" href={'/api/attendance?format=csv&' + qs()}>⬇️ CSV / Excel</a><button className="btn-s" onClick={() => print()}>🖨️ PDF</button></div></div>
      <div className="card !p-3 grid grid-cols-2 md:grid-cols-6 gap-2 no-print">
        <div><label className="lbl">Desde</label><input type="date" className="inp" value={f.desde} onChange={set('desde')} /></div>
        <div><label className="lbl">Hasta</label><input type="date" className="inp" value={f.hasta} onChange={set('hasta')} /></div>
        <div><label className="lbl">Aula</label><AulaSelect aulas={aulas} value={f.aula} onChange={set('aula')} /></div>
        <div><label className="lbl">Tipo</label><select className="inp" value={f.tipo} onChange={set('tipo')}><option value="">Ingreso y salida</option><option>INGRESO</option><option>SALIDA</option></select></div>
        <div><label className="lbl">Solo</label><select className="inp" value={f.solo} onChange={set('solo')}><option value="">Todo</option><option value="tarde">Tardanzas</option><option value="anticipado">Retiros anticipados</option></select></div>
        <div><label className="lbl">Estudiante</label><input className="inp" placeholder="DNI o nombre" value={f.q} onChange={set('q')} /></div>
      </div>
      <p className="hidden print:block text-sm">{me.settings.school_name} — Historial {f.desde} a {f.hasta} {f.aula}</p>
      <div className="card !p-0 overflow-x-auto"><table className="tbl"><thead><tr><th>Fecha</th><th>Hora</th><th>Tipo</th><th>Estudiante</th><th>Aula</th><th>Detalle</th><th>Registró</th><th className="no-print">✉️</th>{me.user.role === 'admin' && <th className="no-print"></th>}</tr></thead><tbody>
        {d?.rows.map((r) => <tr key={r.id}><td className="text-xs whitespace-nowrap">{r.fecha}</td><td className="font-mono text-xs">{r.hora}</td>
          <td><span className={`chip ${r.tipo === 'INGRESO' ? 'bg-emerald-100 text-emerald-700' : 'bg-sky-100 text-sky-700'}`}>{r.tipo}</span></td>
          <td className="text-sm">{r.estudiante}<br /><span className="text-[11px] text-slate-400">{r.dni}</span></td><td className="text-xs">{r.aula}</td>
          <td className="text-xs">{r.tarde && <span className="text-amber-600">⏰ {r.minutos_tarde} min </span>}{r.anticipado && <span className="text-amber-600">🚸 anticipada{r.recoge_nombre && ` · recoge: ${r.recoge_nombre}`} </span>}{r.nota}{r.metodo === 'MANUAL' && <span className="chip bg-slate-100">manual</span>}</td>
          <td className="text-xs">{r.registrado_por}</td><td className="text-xs no-print" title={r.correo || 'sin correo'}>{{ enviado: '✅', pendiente: '⏳', enviando: '⏳', fallido: '❌' }[r.correo] || '—'}</td>
          {me.user.role === 'admin' && <td className="no-print"><button title="Anular marca" className="text-rose-500 text-xs" onClick={async () => { if (confirm('¿Anular este registro? Queda en auditoría.')) { await api('/api/attendance/' + r.id, { method: 'DELETE' }); load(); } }}>✕</button></td>}
        </tr>)}
        {d && !d.rows.length && <tr><td colSpan={9} className="text-center py-8 text-slate-400">Sin registros en este rango</td></tr>}
      </tbody></table></div>
      {d && <p className="text-xs text-slate-400">{d.total} registros{d.total > 2000 && ' (en pantalla se muestran 2000; el CSV trae todos)'}</p>}
    </div>
  );
}
