CREATE TABLE IF NOT EXISTS tareas (
  id        INTEGER PRIMARY KEY AUTOINCREMENT,
  orden     INTEGER NOT NULL,
  hecha     INTEGER NOT NULL DEFAULT 0,
  titulo    TEXT    NOT NULL,
  proyecto  TEXT    NOT NULL DEFAULT '',
  prioridad TEXT    NOT NULL DEFAULT 'media' CHECK (prioridad IN ('alta','media','baja')),
  fecha     TEXT    NOT NULL DEFAULT '',
  pasos     TEXT    NOT NULL DEFAULT '[]'
);

CREATE INDEX IF NOT EXISTS idx_tareas_hecha_orden ON tareas (hecha, orden);

CREATE TABLE IF NOT EXISTS meta (
  k TEXT PRIMARY KEY,
  v TEXT NOT NULL
);
