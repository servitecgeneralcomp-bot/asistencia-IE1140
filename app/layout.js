import './globals.css';
export const metadata = { title: 'Asistencia QR — I.E. 1140', description: 'Control de ingreso y salida de estudiantes' };
export const viewport = { width: 'device-width', initialScale: 1, themeColor: '#312e81' };
export default function RootLayout({ children }) {
  return <html lang="es"><body className="bg-slate-50 min-h-screen text-slate-800">{children}</body></html>;
}
