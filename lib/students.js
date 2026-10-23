import { clean, HttpError } from './api';
export function validateStudent(b) {
  const s = {
    dni: clean(b.dni, 12).toUpperCase().replace(/[\s.-]/g, ''),
    nombres: clean(b.nombres, 80), apellidos: clean(b.apellidos, 80),
    grado: clean(b.grado, 40), seccion: clean(b.seccion, 10).toUpperCase(), aula: clean(b.aula, 40),
    apoderado_nombre: clean(b.apoderado_nombre, 100), apoderado_email: clean(b.apoderado_email, 120).toLowerCase(),
    apoderado_telefono: clean(b.apoderado_telefono, 20),
    hora_entrada: clean(b.hora_entrada, 5) || null, hora_salida: clean(b.hora_salida, 5) || null,
    foto: b.foto === undefined ? undefined : (b.foto || null),
  };
  if (!/^[A-Z0-9]{6,12}$/.test(s.dni)) throw new HttpError(400, `Documento inválido "${s.dni}" (DNI de 8 dígitos o CE/pasaporte de 6-12 caracteres)`);
  if (!s.nombres || !s.apellidos) throw new HttpError(400, 'Nombres y apellidos son obligatorios');
  if (s.apoderado_email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s.apoderado_email)) throw new HttpError(400, 'Correo del apoderado inválido: ' + s.apoderado_email);
  for (const k of ['hora_entrada', 'hora_salida']) if (s[k] && !/^([01]\d|2[0-3]):[0-5]\d$/.test(s[k])) throw new HttpError(400, 'Hora inválida');
  if (s.foto && (!/^data:image\/(jpeg|png|webp);base64,[A-Za-z0-9+/=]+$/.test(s.foto) || s.foto.length > 200000)) throw new HttpError(400, 'Foto inválida o muy pesada');
  return s;
}
