// Una persona del equipo.
//   DELETE /api/personas/:id   -> 204 | 404
//
// Solo la quita de la lista del equipo: las tareas y pasos que tenga asignados no cambian.

import { error, idDe, metodoNoPermitido, origenValido, sinContenido } from '../../../lib/tareas.js';

export async function onRequestDelete({ request, params, env }) {
  if (!origenValido(request)) return error(403, 'origen no permitido');
  const id = idDe(params.id);
  if (id === null) return error(404, 'persona no encontrada');
  const fila = await env.DB.prepare('DELETE FROM personas WHERE id = ? RETURNING id').bind(id).first();
  return fila ? sinContenido() : error(404, 'persona no encontrada');
}

export const onRequest = () => metodoNoPermitido(['DELETE']);
