// Equipo (personas que se pueden asignar como responsables).
//   GET  /api/personas   -> 200 [ { id, nombre }, ... ]   (orden alfabético)
//   POST /api/personas   cuerpo: { nombre }
//                        -> 201 { id, nombre } (Location: /api/personas/:id)
//                        -> 200 { id, nombre } si ya existía (sin distinguir mayúsculas)
//
// Quitar a una persona: ver [id].js.

import { error, json, leerJson, metodoNoPermitido, origenValido } from '../../../lib/tareas.js';

export const MAX_PERSONAS = 200;

export async function onRequestGet({ env }) {
  const { results } = await env.DB.prepare('SELECT id, nombre FROM personas ORDER BY nombre COLLATE NOCASE').all();
  return json(results);
}

export async function onRequestPost({ request, env }) {
  if (!origenValido(request)) return error(403, 'origen no permitido');
  const { body, fallo } = await leerJson(request);
  if (fallo) return fallo;

  const nombre = typeof body.nombre === 'string' ? body.nombre.trim().replace(/\s+/g, ' ') : '';
  if (!nombre) return error(400, 'datos inválidos', { nombre: 'obligatorio, texto no vacío' });
  if (nombre.length > 60) return error(400, 'datos inválidos', { nombre: 'máximo 60 caracteres' });

  const existente = await env.DB.prepare('SELECT id, nombre FROM personas WHERE nombre = ?').bind(nombre).first();
  if (existente) return json(existente);

  const { n } = await env.DB.prepare('SELECT COUNT(*) AS n FROM personas').first();
  if (n >= MAX_PERSONAS) return error(409, `límite de ${MAX_PERSONAS} personas alcanzado`);

  // ON CONFLICT cubre la carrera de dos altas simultáneas con el mismo nombre.
  const fila = await env.DB
    .prepare('INSERT INTO personas (nombre) VALUES (?) ON CONFLICT (nombre) DO UPDATE SET nombre = nombre RETURNING id, nombre')
    .bind(nombre)
    .first();
  const respuesta = json(fila, 201);
  respuesta.headers.set('Location', `/api/personas/${fila.id}`);
  return respuesta;
}

export const onRequest = () => metodoNoPermitido(['GET', 'POST']);
