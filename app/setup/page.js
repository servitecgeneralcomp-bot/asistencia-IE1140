'use client';
import { useState } from 'react';
import { api } from '@/components/ui';
export default function Setup() {
  const [f, setF] = useState({ setupKey: '', nombre: '', username: 'admin', password: '' }); const [err, setErr] = useState('');
  const go = async (e) => { e.preventDefault(); setErr(''); try { await api('/api/setup', { method: 'POST', body: f }); location.href = '/ajustes'; } catch (e) { setErr(e.message); } };
  const fld = (k, label, type = 'text') => <div><label className="lbl">{label}</label><input className="inp" type={type} value={f[k]} onChange={(e) => setF({ ...f, [k]: e.target.value })} required /></div>;
  return (
    <div className="min-h-screen flex items-center justify-center bg-indigo-900 p-4">
      <form onSubmit={go} className="bg-white rounded-2xl shadow-xl p-6 w-full max-w-sm space-y-3">
        <h1 className="text-lg font-bold text-indigo-900">Instalación: primer administrador</h1>
        <p className="text-xs text-slate-500">Solo funciona una vez, cuando aún no hay usuarios. La clave de instalación es la variable <b>ADMIN_SETUP_KEY</b> de Vercel.</p>
        {fld('setupKey', 'Clave de instalación (ADMIN_SETUP_KEY)', 'password')}{fld('nombre', 'Tu nombre')}{fld('username', 'Usuario')}{fld('password', 'Contraseña (mín. 8)', 'password')}
        {err && <p className="text-sm text-rose-600">{err}</p>}
        <button className="btn-p w-full">Crear administrador</button>
      </form>
    </div>
  );
}
