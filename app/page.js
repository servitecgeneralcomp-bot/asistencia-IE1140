'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import Shell from '@/components/Shell';
import { api, Stat } from '@/components/ui';
export default function Home() { return <Shell><Dash /></Shell>; }
function Dash() {
  const [d, setD] = useState(null); const [f, setF] = useState('ausentes'); const [aula, setAula] = useState('');
  const load = () => api('/api/dashboard').then(setD).catch(() => {});
  useEffect(() => { load(); const t = setInterval(load, 20000); return () => clearInterval(t); }, []);
  if (!d) return <p className="text-slate-400">Cargando…</p>;
  const c = d.counts;
  const lista = d.lista.filter((r) => (!aula || r.aula === aula) && ({ ausentes: !r.ingreso && !r.justificado, tarde: r.tarde, sin_salida: r.ingreso && r.ultimo === 'INGRESO', presentes: !!r.ingreso, todos: true }[f]));
  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-lg font-bold">Resumen de hoy <span className="text-slate-400 font-normal text-sm">{d.fecha} · actualizado {d.hora} (hora de Lima)</span></h2>
        <Link href="/escaner" className="btn-p">📷 Abrir escáner</Link>
      </div>
      {d.feriado && <div className="card !bg-amber-50 border-amber-200 text-amber-800 text-sm">📅 Hoy es feriado / sin clases: <b>{d.feriado}</b></div>}
      {!d.feriado && !d.lectivo && <div className="card !bg-slate-100 text-sm text-slate-600">Hoy no es día lectivo según los ajustes.</div>}
      {d.mail.fallidos > 0 && <div className="card !bg-rose-50 border-rose-200 text-rose-700 text-sm">✉️ {d.mail.fallidos} correo(s) a apoderados fallaron. Revisa Ajustes → Correos.</div>}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        <Stat label="Matriculados" value={c.total} />
        <Stat label="Presentes" value={c.presentes} tone="green" sub={c.total ? Math.round(c.presentes * 100 / c.total) + '%' : ''} />
        <Stat label="Ausentes" value={c.ausentes} tone="red" sub={c.justificados ? `+${c.justificados} justificados` : ''} />
        <Stat label="Tardanzas" value={c.tarde} tone="amber" />
        <Stat label="Aún sin salir" value={c.sin_salida} tone="indigo" sub={`${c.salieron} ya salieron`} />
      </div>
      <div className="grid lg:grid-cols-3 gap-5">
        <div className="card lg:col-span-2">
          <div className="flex flex-wrap gap-2 mb-3">
            {[['ausentes', 'Ausentes'], ['tarde', 'Tardanzas'], ['sin_salida', 'Sin salida'], ['presentes', 'Presentes'], ['todos', 'Todos']].map(([k, l]) =>
              <button key={k} onClick={() => setF(k)} className={`chip !text-xs !px-3 !py-1 ${f === k ? 'bg-indigo-600 text-white' : 'bg-slate-100 text-slate-600'}`}>{l}</button>)}
            <select className="inp !w-auto !py-1 ml-auto" value={aula} onChange={(e) => setAula(e.target.value)}><option value="">Todas las aulas</option>{d.aulas.map((a) => <option key={a.aula}>{a.aula}</option>)}</select>
          </div>
          <div className="overflow-x-auto max-h-[420px]"><table className="tbl"><thead><tr><th>Estudiante</th><th>Aula</th><th>Ingreso</th><th>Salida</th></tr></thead><tbody>
            {lista.map((r) => <tr key={r.id}><td>{r.nombre}{r.justificado && <span className="chip bg-sky-100 text-sky-700 ml-1">justificado</span>}</td><td className="text-xs">{r.aula}</td>
              <td>{r.ingreso ? <span className={r.tarde ? 'text-amber-600 font-semibold' : 'text-emerald-700'}>{r.ingreso}{r.tarde && ' ⏰'}</span> : '—'}</td><td>{r.salida || '—'}</td></tr>)}
            {!lista.length && <tr><td colSpan={4} className="text-center text-slate-400 py-6">Sin estudiantes en este filtro</td></tr>}
          </tbody></table></div>
        </div>
        <div className="space-y-5">
          <div className="card"><h3 className="font-bold text-sm mb-2">Por aula</h3>
            {d.aulas.map((a) => <div key={a.aula} className="mb-2"><div className="flex justify-between text-xs"><span>{a.aula}</span><span>{a.presentes}/{a.total}{a.tarde ? ` · ${a.tarde}⏰` : ''}</span></div>
              <div className="h-2 bg-slate-100 rounded"><div className="h-2 bg-emerald-500 rounded" style={{ width: `${a.total ? a.presentes * 100 / a.total : 0}%` }} /></div></div>)}
          </div>
          <div className="card"><h3 className="font-bold text-sm mb-2">Últimas marcas</h3>
            {d.ultimos.map((u, i) => <div key={i} className="flex justify-between text-xs py-1 border-b border-slate-100"><span><b className={u.tipo === 'INGRESO' ? 'text-emerald-600' : 'text-indigo-600'}>{u.tipo === 'INGRESO' ? '↘' : '↗'}</b> {u.nombre}</span><span className="text-slate-500">{u.hora}{u.tarde && ' ⏰'}{u.anticipado && ' 🚸'}</span></div>)}
            {!d.ultimos.length && <p className="text-xs text-slate-400">Aún no hay marcas hoy</p>}
          </div>
        </div>
      </div>
    </div>
  );
}
