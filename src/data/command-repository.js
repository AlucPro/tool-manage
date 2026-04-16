import { getDatabase } from "./sqlite.js";
import { inferMetadataSource, toTimestamp } from "../lib/metadata.js";

const OVERRIDABLE_FIELDS = [
  "description",
  "version",
  "repository",
  "author",
  "homepage",
  "bugs",
  "license",
  "keywords",
  "bin",
  "engines",
  "notes",
];

function mapCommandRow(row, overrides) {
  const overrideMap = Object.fromEntries(
    overrides.map((item) => [item.field_name, item.field_value])
  );
  const merged = {
    id: Number(row.id),
    commandName: row.command_name,
    commandPath: row.command_path,
    packageName: row.package_name,
    packageJsonPath: row.package_json_path,
    description: overrideMap.description ?? row.description,
    version: overrideMap.version ?? row.version,
    repository: overrideMap.repository ?? row.repository,
    author: overrideMap.author ?? row.author,
    homepage: overrideMap.homepage ?? row.homepage,
    bugs: overrideMap.bugs ?? row.bugs,
    license: overrideMap.license ?? row.license,
    keywords: overrideMap.keywords ?? row.keywords,
    bin: overrideMap.bin ?? row.bin,
    engines: overrideMap.engines ?? row.engines,
    notes: overrideMap.notes ?? null,
    helpPreview: row.help_preview,
    metadataSource: row.metadata_source,
    updatedAt: row.updated_at,
    createdAt: row.created_at,
    overrides: overrideMap,
  };

  return merged;
}

async function readOverrides(database, commandId) {
  return database.all(
    `
      SELECT field_name, field_value, updated_at
      FROM command_overrides
      WHERE command_id = ?
      ORDER BY field_name ASC
    `,
    [commandId]
  );
}

export async function listCommands() {
  const database = await getDatabase();
  const rows = database.all(
    `
      SELECT *
      FROM commands
      ORDER BY command_name COLLATE NOCASE ASC
    `
  );
  const commands = [];

  for (const row of rows) {
    const overrides = await readOverrides(database, row.id);
    commands.push(mapCommandRow(row, overrides));
  }

  return commands;
}

export async function getCommandByName(commandName) {
  const database = await getDatabase();
  const row = database.get("SELECT * FROM commands WHERE command_name = ?", [commandName]);

  if (!row) {
    return null;
  }

  const overrides = await readOverrides(database, row.id);
  return mapCommandRow(row, overrides);
}

export async function upsertCommand(record) {
  const database = await getDatabase();
  const now = toTimestamp();
  const existing = database.get("SELECT id, created_at FROM commands WHERE command_name = ?", [
    record.commandName,
  ]);

  if (existing) {
    database.run(
      `
        UPDATE commands
        SET command_path = ?, package_name = ?, package_json_path = ?,
            description = ?, version = ?, repository = ?, author = ?,
            homepage = ?, bugs = ?, license = ?, keywords = ?, bin = ?, engines = ?,
            help_preview = ?, metadata_source = ?, updated_at = ?
        WHERE command_name = ?
      `,
      [
        record.commandPath ?? null,
        record.packageName ?? null,
        record.packageJsonPath ?? null,
        record.description ?? null,
        record.version ?? null,
        record.repository ?? null,
        record.author ?? null,
        record.homepage ?? null,
        record.bugs ?? null,
        record.license ?? null,
        record.keywords ?? null,
        record.bin ?? null,
        record.engines ?? null,
        record.helpPreview ?? null,
        record.metadataSource ?? "detected",
        now,
        record.commandName,
      ]
    );
  } else {
    database.run(
      `
        INSERT INTO commands (
          command_name, command_path, package_name, package_json_path,
          description, version, repository, author, homepage, bugs, license,
          keywords, bin, engines, help_preview,
          metadata_source, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `,
      [
        record.commandName,
        record.commandPath ?? null,
        record.packageName ?? null,
        record.packageJsonPath ?? null,
        record.description ?? null,
        record.version ?? null,
        record.repository ?? null,
        record.author ?? null,
        record.homepage ?? null,
        record.bugs ?? null,
        record.license ?? null,
        record.keywords ?? null,
        record.bin ?? null,
        record.engines ?? null,
        record.helpPreview ?? null,
        record.metadataSource ?? "detected",
        existing?.created_at ?? now,
        now,
      ]
    );
  }

  return getCommandByName(record.commandName);
}

export async function saveOverrides(commandName, values) {
  const database = await getDatabase();
  const command = database.get("SELECT * FROM commands WHERE command_name = ?", [commandName]);

  if (!command) {
    throw new Error(`Command "${commandName}" is not registered.`);
  }

  const now = toTimestamp();

  for (const field of OVERRIDABLE_FIELDS) {
    if (!Object.hasOwn(values, field)) {
      continue;
    }

    const value = values[field] ? String(values[field]).trim() : null;

    if (value) {
      database.run(
        `
          INSERT INTO command_overrides (command_id, field_name, field_value, updated_at)
          VALUES (?, ?, ?, ?)
          ON CONFLICT(command_id, field_name)
          DO UPDATE SET field_value = excluded.field_value, updated_at = excluded.updated_at
        `,
        [command.id, field, value, now]
      );
    } else {
      database.run(
        "DELETE FROM command_overrides WHERE command_id = ? AND field_name = ?",
        [command.id, field]
      );
    }
  }

  const base = database.get("SELECT * FROM commands WHERE id = ?", [command.id]);
  const overrides = await readOverrides(database, command.id);
  const metadataSource = inferMetadataSource(base, overrides);

  database.run("UPDATE commands SET metadata_source = ?, updated_at = ? WHERE id = ?", [
    metadataSource,
    now,
    command.id,
  ]);

  return getCommandByName(commandName);
}

export async function removeCommand(commandName) {
  const database = await getDatabase();
  const existing = database.get("SELECT id FROM commands WHERE command_name = ?", [commandName]);

  if (!existing) {
    return false;
  }

  database.run("DELETE FROM commands WHERE command_name = ?", [commandName]);
  return true;
}
