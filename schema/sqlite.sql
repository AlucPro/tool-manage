-- tool-manage V2 sqlite schema
-- This file documents the target runtime schema. Runtime migrations remain in src/data/sqlite.js.

PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS commands (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  command_name TEXT NOT NULL UNIQUE,
  command_path TEXT,
  package_name TEXT,
  package_json_path TEXT,
  description TEXT,
  version TEXT,
  repository TEXT,
  author TEXT,
  homepage TEXT,
  bugs TEXT,
  license TEXT,
  keywords TEXT,
  bin TEXT,
  engines TEXT,
  help_preview TEXT,
  metadata_source TEXT NOT NULL DEFAULT 'detected',
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  deleted_at TEXT
);

CREATE TABLE IF NOT EXISTS command_overrides (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  command_id INTEGER NOT NULL,
  field_name TEXT NOT NULL,
  field_value TEXT,
  updated_at TEXT NOT NULL,
  UNIQUE(command_id, field_name),
  FOREIGN KEY(command_id) REFERENCES commands(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS app_meta (
  key TEXT PRIMARY KEY,
  value TEXT
);
