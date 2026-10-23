'use client';
import { useEffect, useState, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { api } from '@/components/ui';
export default function Page() { return <Suspense><Carnets /></Suspense>; }
function Carnets() {
  const sp = useSearchParams(); const [d, setD] = useState(null); const [err, setErr] = useState('');
  useEffect(() => { api(`/api/carnets?ids=${sp.get('ids') || ''}&aula=${encodeURIComponent(sp.get('aula') || '')}`).then(setD).catch((e) => setErr(e.message)); }, [sp]);
  if (err) return <p className="p-6 text-rose-600">{err}</p>;
  if (!d) return <p className="p-6 text-slate-400">Generando carnets…</p>;
  return (
    <div className="p-4">
      <div className="no-print flex flex-wrap gap-2 items-center mb-4"><a href="/estudiantes" className="btn-s">← Volver</a><button className="btn-p" onClick={() => print()}>🖨️ Imprimir / Guardar PDF</button>
        <span className="text-sm text-slate-500">{d.carnets.length} carnets · tamaño tarjeta (8.5 × 5.4 cm). Imprime al 100%.</span></div>
      <div className="flex flex-wrap gap-3">
        {d.carnets.map((c) => (
          <div key={c.id} className="bg-white border-2 border-indigo-900 rounded-xl overflow-hidden flex flex-col" style={{ width: '85.6mm', height: '54mm', breakInside: 'avoid' }}>
            <div className="bg-indigo-900 text-white px-2 py-1 text-center leading-tight"><p className="text-[9px] font-bold">{d.settings.school_name}</p><p className="text-[7px] text-indigo-200">{d.settings.school_place} · CARNET DE ASISTENCIA</p></div>
            <div className="flex flex-1 items-center gap-2 px-2">
              {c.foto ? <img src={c.foto} alt="" style={{ width: '20mm', height: '24mm' }} className="object-cover rounded border" /> : <div style={{ width: '20mm', height: '24mm' }} className="bg-slate-100 rounded border flex items-center justify-center text-2xl">👤</div>}
              <div className="flex-1 min-w-0 leading-tight"><p className="text-[11px] font-bold">{c.nombres}</p><p className="text-[10px]">{c.apellidos}</p>
                <p className="text-[9px] text-slate-600 mt-1">DNI: {c.dni}</p><p className="text-[9px] text-slate-600">{c.grado} {c.seccion}</p>{c.aula && <p className="text-[9px] text-slate-600">{c.aula}</p>}</div>
              <img src={c.qr} alt="QR" style={{ width: '30mm', height: '30mm' }} />
            </div>
            <div className="bg-amber-400 h-1.5" />
          </div>))}
      </div>
    </div>
  );
}
