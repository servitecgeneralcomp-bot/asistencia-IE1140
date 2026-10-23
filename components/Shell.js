'use client';
import { useEffect, useState, createContext, useContext } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { api } from './ui';
const Ctx = createContext(null);
export const useMe = () => useContext(Ctx);
const NAV = [
  ['/', '📊', 'Hoy'], ['/escaner', '📷', 'Escáner'], ['/historial', '🗂️', 'Historial'], ['/reportes', '📈', 'Reportes'],
  ['/estudiantes', '👧', 'Estudiantes'], ['/ajustes', '⚙️', 'Ajustes', 'admin'],
];
export default function Shell({ children, admin = false }) {
  const [me, setMe] = useState(null); const [clock, setClock] = useState('');
  const path = usePathname();
  useEffect(() => { api('/api/auth/me').then(setMe).catch(() => {}); }, []);
  useEffect(() => {
    const f = () => setClock(new Intl.DateTimeFormat('es-PE', { timeZone: 'America/Lima', weekday: 'short', day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit', second: '2-digit' }).format(new Date()));
    f(); const t = setInterval(f, 1000); return () => clearInterval(t);
  }, []);
  if (!me) return <div className="p-10 text-center text-slate-400">Cargando…</div>;
  const isAdmin = me.user.role === 'admin';
  const logout = async () => { await api('/api/auth/logout', { method: 'POST' }); location.href = '/login'; };
  return (
    <Ctx.Provider value={me}>
      <header className="bg-indigo-900 text-white shadow-md no-print">
        <div className="max-w-6xl mx-auto px-4 py-3 flex flex-wrap justify-between items-center gap-3">
          <div className="flex items-center gap-3">
            <div className="bg-indigo-700 p-2 rounded-lg text-2xl leading-none">🔳</div>
            <div><h1 className="text-lg font-bold tracking-tight">AsistenciaQR</h1>
              <p className="text-[11px] text-indigo-200">{me.settings.school_name} · {me.settings.school_place}</p></div>
          </div>
          <div className="flex items-center gap-2 text-xs">
            <span className="flex items-center gap-2 bg-indigo-950/60 px-3 py-1.5 rounded-full border border-indigo-700/50"><span className="w-2 h-2 bg-emerald-400 rounded-full animate-pulse" />{clock}</span>
            <span className="hidden sm:inline text-indigo-200">{me.user.nombre} ({me.user.role})</span>
            <button onClick={logout} className="px-2 py-1 rounded bg-indigo-800 hover:bg-indigo-700">Salir</button>
          </div>
        </div>
        <nav className="max-w-6xl mx-auto px-2 border-t border-indigo-800/80 flex overflow-x-auto">
          {NAV.filter((n) => !n[3] || isAdmin).map(([href, ic, label]) => {
            const act = href === '/' ? path === '/' : path.startsWith(href);
            return <Link key={href} href={href} className={`px-4 py-3 text-sm whitespace-nowrap border-b-2 ${act ? 'border-amber-400 font-semibold text-amber-300' : 'border-transparent text-indigo-200 hover:text-white'}`}>{ic} {label}</Link>;
          })}
        </nav>
      </header>
      <main className="max-w-6xl mx-auto px-3 sm:px-4 py-5 w-full">
        {admin && !isAdmin ? <div className="card">Esta sección es solo para administradores.</div> : children}
      </main>
    </Ctx.Provider>
  );
}
