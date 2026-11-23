// Utilidades compartidas por las rutas de /api/tareas (Cloudflare Pages Functions + D1).
//
// Recurso "tarea":
//   { id, titulo, proyecto, prioridad, fecha, estado, asignado, pasos: [{ t, ok, a }] }
//   prioridad: 'alta' | 'media' | 'baja'
//   estado:    'pendiente' | 'curso' | 'revision' | 'hecho'
//   fecha:     '' o 'AAAA-MM-DD'

export const PRIORIDADES = ['alta', 'media', 'baja'];
export const ESTADOS = ['pendiente', 'curso', 'revision', 'hecho'];
export const MAX_TAREAS = 500;
export const MAX_PASOS = 100;

export const json = (data, status = 200) =>
  new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' },
  });

export const sinContenido = () => new Response(null, { status: 204, headers: { 'Cache-Control': 'no-store' } });
export const error = (status, mensaje, detalles) => json(detalles ? { error: mensaje, detalles } : { error: mensaje }, status);
export const noEncontrada = () => error(404, 'tarea no encontrada');
export const metodoNoPermitido = (permitidos) =>
  new Response(JSON.stringify({ error: 'método no permitido' }), {
    status: 405,
    headers: { 'Content-Type': 'application/json', Allow: permitidos.join(', ') },
  });

// Solo acepta escrituras que vengan de la propia página (misma origen).
export function origenValido(request) {
  const origin = request.headers.get('Origin');
  return !origin || new URL(origin).host === new URL(request.url).host;
}

// Lee el cuerpo JSON de la petición. Devuelve { body } o { fallo: Response }.
export async function leerJson(request) {
  try {
    const body = await request.json();
    if (body === null || typeof body !== 'object' || Array.isArray(body)) {
      return { fallo: error(400, 'el cuerpo debe ser un objeto JSON') };
    }
    return { body };
  } catch {
    return { fallo: error(400, 'JSON inválido') };
  }
}

// Fila de la base de datos -> recurso JSON.
export function aTarea(r) {
  return {
    id: r.id,
    titulo: r.titulo,
    proyecto: r.proyecto,
    prioridad: r.prioridad,
    fecha: r.fecha,
    estado: r.estado,
    asignado: r.asignado,
    pasos: JSON.parse(r.pasos || '[]'),
  };
}

// Reglas de cada campo: devuelven el valor limpio o lanzan un mensaje de error.
const REGLAS = {
  titulo: (v) => {
    if (typeof v !== 'string' || !v.trim()) throw 'obligatorio, texto no vacío';
    if (v.trim().length > 140) throw 'máximo 140 caracteres';
    return v.trim();
  },
  proyecto: (v) => textoCorto(v, 60),
  asignado: (v) => textoCorto(v, 60),
  prioridad: (v) => {
    if (!PRIORIDADES.includes(v)) throw `debe ser uno de: ${PRIORIDADES.join(', ')}`;
    return v;
  },
  estado: (v) => {
    if (!ESTADOS.includes(v)) throw `debe ser uno de: ${ESTADOS.join(', ')}`;
    return v;
  },
  fecha: (v) => {
    if (v !== '' && !(typeof v === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(v) && !Number.isNaN(Date.parse(v)))) {
      throw "debe ser '' o AAAA-MM-DD";
    }
    return v;
  },
  pasos: (v) => {
    if (!Array.isArray(v)) throw 'debe ser una lista';
    if (v.length > MAX_PASOS) throw `máximo ${MAX_PASOS} pasos`;
    return v.map((p, i) => {
      if (p === null || typeof p !== 'object') throw `el paso ${i + 1} debe ser un objeto { t, ok, a }`;
      const t = textoCorto(p.t ?? '', 160);
      if (!t) throw `el paso ${i + 1} necesita texto (t)`;
      return { t, ok: Boolean(p.ok), a: textoCorto(p.a ?? '', 60) };
    });
  },
};

function textoCorto(v, max) {
  if (typeof v !== 'string') throw 'debe ser texto';
  if (v.trim().length > max) throw `máximo ${max} caracteres`;
  return v.trim();
}

const DEFECTOS = { proyecto: '', prioridad: 'media', fecha: '', estado: 'pendiente', asignado: '', pasos: [] };

// completa=true  (POST / PUT): "titulo" es obligatorio y lo demás toma su valor por defecto.
// completa=false (PATCH): solo se validan los campos que vengan; debe venir al menos uno.
// Devuelve { datos } o { fallo: Response 400 }.
export function validar(body, completa) {
  const datos = {};
  const detalles = {};
  for (const campo of Object.keys(REGLAS)) {
    if (body[campo] === undefined) {
      if (completa) {
        if (campo === 'titulo') detalles.titulo = 'obligatorio';
        else datos[campo] = DEFECTOS[campo];
      }
      continue;
    }
    try {
      datos[campo] = REGLAS[campo](body[campo]);
    } catch (m) {
      if (typeof m !== 'string') throw m;
      detalles[campo] = m;
    }
  }
  if (Object.keys(detalles).length) return { fallo: error(400, 'datos inválidos', detalles) };
  if (!completa && !Object.keys(datos).length) {
    return { fallo: error(400, 'no hay campos que actualizar', { campos: Object.keys(REGLAS) }) };
  }
  return { datos };
}

// "123" -> 123; cualquier otra cosa -> null.
export function idDe(valor) {
  return /^[1-9]\d{0,14}$/.test(String(valor)) ? Number(valor) : null;
}
