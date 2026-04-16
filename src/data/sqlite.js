import fs from "node:fs";
import { createRequire } from "node:module";
import initSqlJs from "sql.js";
import {
  APP_DIR,
  DATABASE_PATH,
  LEGACY_REGISTRY_BACKUP_PATH,
  LEGACY_REGISTRY_PATH,
  TEMPLATE_DIR,
} from "../lib/constants.js";
import { collectDetectedMetadata, commandExists } from "../lib/command-discovery.js";

const require = createRequire(import.meta.url);
let databaseContextPromise;

function ensureAppDirs() {
  fs.mkdirSync(APP_DIR, { recursive: true });
  fs.mkdirSync(TEMPLATE_DIR, { recursive: true });
}

function createDatabaseApi(SQL, db) {
  function persist() {
    const data = db.export();
    fs.writeFileSync(DATABASE_PATH, Buffer.from(data));
  }

  function run(sql, params = []) {
    db.run(sql, params);
    persist();
  }

  function get(sql, params = []) {
    const rows = all(sql, params);
    return rows[0] ?? null;
  }

  function all(sql, params = []) {
    const statement = db.prepare(sql, params);
    const rows = [];

    try {
      while (statement.step()) {
        rows.push(statement.getAsObject());
      }
    } finally {
      statement.free();
    }

    return rows;
  }

  function exec(sql) {
    db.exec(sql);
    persist();
  }

  return { SQL, db, run, get, all, exec, persist };
}

function applyMigrations(database) {
  database.exec(`
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
      updated_at TEXT NOT NULL
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
  `);

  const columns = [
    ["homepage", "TEXT"],
    ["bugs", "TEXT"],
    ["license", "TEXT"],
    ["keywords", "TEXT"],
    ["bin", "TEXT"],
    ["engines", "TEXT"],
  ];
  const existingColumns = new Set(
    database.all("PRAGMA table_info(commands)").map((row) => row.name)
  );

  for (const [columnName, definition] of columns) {
    if (!existingColumns.has(columnName)) {
      database.exec(`ALTER TABLE commands ADD COLUMN ${columnName} ${definition};`);
    }
  }
}

function readLegacyRegistry() {
  if (!fs.existsSync(LEGACY_REGISTRY_PATH)) {
    return [];
  }

  try {
    const parsed = JSON.parse(fs.readFileSync(LEGACY_REGISTRY_PATH, "utf8"));
    return Array.isArray(parsed.commands) ? [...new Set(parsed.commands.filter(Boolean))] : [];
  } catch {
    return [];
  }
}

function migrateLegacyRegistry(database) {
  const alreadyMigrated = database.get(
    "SELECT value FROM app_meta WHERE key = ?",
    ["legacy_registry_migrated"]
  );

  if (alreadyMigrated?.value === "true") {
    return;
  }

  const legacyCommands = readLegacyRegistry();
  const existing = database.get("SELECT COUNT(*) AS count FROM commands");

  if (legacyCommands.length > 0 && Number(existing?.count ?? 0) === 0) {
    const now = new Date().toISOString();

    for (const commandName of legacyCommands) {
      database.run(
        `
          INSERT INTO commands (
            command_name, metadata_source, created_at, updated_at
          ) VALUES (?, 'detected', ?, ?)
        `,
        [commandName, now, now]
      );
    }

    if (fs.existsSync(LEGACY_REGISTRY_PATH) && !fs.existsSync(LEGACY_REGISTRY_BACKUP_PATH)) {
      fs.copyFileSync(LEGACY_REGISTRY_PATH, LEGACY_REGISTRY_BACKUP_PATH);
    }
  }

  database.run(
    "INSERT OR REPLACE INTO app_meta (key, value) VALUES (?, ?)",
    ["legacy_registry_migrated", "true"]
  );
}

function hydrateLegacyCommandMetadata(database) {
  const rows = database.all(
    `
      SELECT id, command_name, metadata_source
      FROM commands
      WHERE
        command_path IS NULL
        OR help_preview IS NULL
        OR (
          description IS NULL
          AND version IS NULL
          AND repository IS NULL
          AND author IS NULL
          AND homepage IS NULL
          AND bugs IS NULL
          AND license IS NULL
          AND keywords IS NULL
          AND bin IS NULL
          AND engines IS NULL
        )
    `
  );

  if (rows.length === 0) {
    return;
  }

  const now = new Date().toISOString();

  for (const row of rows) {
    if (!commandExists(row.command_name)) {
      continue;
    }

    const detected = collectDetectedMetadata(row.command_name);
    database.run(
      `
        UPDATE commands
        SET command_path = ?, package_name = ?, package_json_path = ?,
            description = ?, version = ?, repository = ?, author = ?,
            homepage = ?, bugs = ?, license = ?, keywords = ?, bin = ?, engines = ?,
            help_preview = ?, updated_at = ?
        WHERE id = ?
      `,
      [
        detected.commandPath ?? null,
        detected.packageName ?? null,
        detected.packageJsonPath ?? null,
        detected.description ?? null,
        detected.version ?? null,
        detected.repository ?? null,
        detected.author ?? null,
        detected.homepage ?? null,
        detected.bugs ?? null,
        detected.license ?? null,
        detected.keywords ?? null,
        detected.bin ?? null,
        detected.engines ?? null,
        detected.helpPreview ?? null,
        now,
        row.id,
      ]
    );
  }
}

export async function getDatabase() {
  if (!databaseContextPromise) {
    databaseContextPromise = (async () => {
      ensureAppDirs();
      const wasmPath = require.resolve("sql.js/dist/sql-wasm.wasm");
      const SQL = await initSqlJs({
        locateFile: () => wasmPath,
      });
      const existingBytes = fs.existsSync(DATABASE_PATH)
        ? fs.readFileSync(DATABASE_PATH)
        : undefined;
      const db = existingBytes ? new SQL.Database(existingBytes) : new SQL.Database();
      const database = createDatabaseApi(SQL, db);

      applyMigrations(database);
      migrateLegacyRegistry(database);
      hydrateLegacyCommandMetadata(database);

      return database;
    })();
  }

  return databaseContextPromise;
}
