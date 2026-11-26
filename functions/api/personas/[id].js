// Una persona del equipo.
//   PATCH  /api/personas/:id   cuerpo: { nombre }
//          -> 200 { id, nombre, tareas }   (tareas: cuántas tareas cambiaron)
//          -> 404 | 409 si ya hay otra persona con ese nombre
//          Cambia el nombre en el equipo y en todas las tareas y pasos asignados con el nombre anterior.
//   DELETE /api/personas/:id   -> 204 | 404
//          Solo la quita de la lista del equipo: las tareas y pasos que tenga asignados no cambian.

import { error, idDe, json, leerJson, metodoNoPermitido, origenValido, sinContenido } from '../../../lib/tareas.js';
import { mismaPersona, validarNombre } from '../../../lib/personas.js';

const noEncontrada = () => error(404, 'persona no encontrada');

export async function onRequestPatch({ request, params, env }) {
  if (!origenValido(request)) return error(403, 'origen no permitido');
  const id = idDe(params.id);
  if (id === null) return noEncontrada();
  const { body, fallo } = await leerJson(request);
  if (fallo) return fallo;
  const { nombre, fallo: invalido } = validarNombre(body.nombre);
  if (invalido) return invalido;

  const actual = await env.DB.prepare('SELECT id, nombre FROM personas WHERE id = ?').bind(id).first();
  if (!actual) return noEncontrada();
  if (actual.nombre === nombre) return json({ id, nombre, tareas: 0 });

  const { results: equipo } = await env.DB.prepare('SELECT id, nombre FROM personas WHERE id <> ?').bind(id).all();
  if (equipo.some((p) => mismaPersona(p.nombre, nombre))) return error(409, 'ya hay otra persona con ese nombre');

  // Tareas y pasos con el nombre anterior pasan al nuevo; todo en un solo lote (atómico).
  const cambiar = (n) => (mismaPersona(n, actual.nombre) ? nombre : n);
  const { results: filas } = await env.DB.prepare('SELECT id, asignado, pasos FROM tareas').all();
  const actualizarTarea = env.DB.prepare('UPDATE tareas SET asignado = ?, pasos = ? WHERE id = ?');
  const lote = [env.DB.prepare('UPDATE personas SET nombre = ? WHERE id = ?').bind(nombre, id)];
  for (const f of filas) {
    const pasos = JSON.parse(f.pasos || '[]');
    const asignado = cambiar(f.asignado);
    let distinto = asignado !== f.asignado;
    for (const p of pasos) {
      const a = cambiar(p.a || '');
      if (a !== (p.a || '')) { p.a = a; distinto = true; }
    }
    if (distinto) lote.push(actualizarTarea.bind(asignado, JSON.stringify(pasos), f.id));
  }
  try {
    await env.DB.batch(lote);
  } catch (e) {
    if (String(e && e.message).includes('UNIQUE')) return error(409, 'ya hay otra persona con ese nombre');
    throw e;
  }
  return json({ id, nombre, tareas: lote.length - 1 });
}

export async function onRequestDelete({ request, params, env }) {
  if (!origenValido(request)) return error(403, 'origen no permitido');
  const id = idDe(params.id);
  if (id === null) return noEncontrada();
  const fila = await env.DB.prepare('DELETE FROM personas WHERE id = ? RETURNING id').bind(id).first();
  return fila ? sinContenido() : noEncontrada();
}

export const onRequest = () => metodoNoPermitido(['PATCH', 'DELETE']);
