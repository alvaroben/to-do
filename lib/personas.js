// Utilidades compartidas por las rutas de /api/personas.
import { error } from './tareas.js';

// Limpia y valida un nombre. Devuelve { nombre } o { fallo: Response 400 }.
export function validarNombre(valor) {
  const nombre = typeof valor === 'string' ? valor.trim().replace(/\s+/g, ' ') : '';
  if (!nombre) return { fallo: error(400, 'datos inválidos', { nombre: 'obligatorio, texto no vacío' }) };
  if (nombre.length > 60) return { fallo: error(400, 'datos inválidos', { nombre: 'máximo 60 caracteres' }) };
  return { nombre };
}

// Mismo criterio que la página: sin espacios sobrantes y sin distinguir mayúsculas (también con tildes).
export const mismaPersona = (a, b) => String(a || '').trim().toLowerCase() === String(b || '').trim().toLowerCase();
