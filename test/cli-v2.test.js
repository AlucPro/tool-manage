import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const repoRoot = path.resolve(__dirname, "..");
const cliPath = path.join(repoRoot, "src/cli.js");

function createFixtureCommand(workspaceRoot, commandName = "fixture-tool") {
  const packageRoot = path.join(workspaceRoot, "fixture-package");
  const binDir = path.join(packageRoot, "bin");
  fs.mkdirSync(binDir, { recursive: true });

  const packageJson = {
    name: "@fixtures/fixture-tool",
    version: "1.2.3",
    description: "Fixture command for V2 CLI tests.",
    type: "module",
    author: "Fixture Author <fixture@example.com>",
    repository: {
      type: "git",
      url: "git+https://github.com/example/fixture-tool.git",
    },
    homepage: "https://github.com/example/fixture-tool#readme",
    bugs: {
      url: "https://github.com/example/fixture-tool/issues",
    },
    license: "MIT",
    keywords: ["fixture", "tool"],
    bin: {
      [commandName]: "./bin/fixture-tool",
    },
    engines: {
      node: ">=18",
    },
  };

  fs.writeFileSync(
    path.join(packageRoot, "package.json"),
    `${JSON.stringify(packageJson, null, 2)}\n`,
    "utf8"
  );

  const scriptPath = path.join(binDir, "fixture-tool");
  fs.writeFileSync(
    scriptPath,
    `#!/usr/bin/env node
const args = process.argv.slice(2);
if (args.includes("--help")) {
  console.log("Usage: ${commandName} [options]\\n\\nOptions:\\n  --help   Show help");
  process.exit(0);
}
console.log("${commandName} ran");
`,
    "utf8"
  );
  fs.chmodSync(scriptPath, 0o755);

  return { packageRoot, commandName };
}

function createManualSpec(specPath, commandName = "manual-tool") {
  const payload = {
    schemaVersion: 1,
    commandName,
    description: "Manual test command.",
    version: "0.4.0",
    repository: "https://github.com/example/manual-tool",
    author: "Manual Author <manual@example.com>",
  };

  fs.writeFileSync(specPath, `${JSON.stringify(payload, null, 2)}\n`, "utf8");
}

function runCli(args, env) {
  return spawnSync(process.execPath, [cliPath, ...args], {
    cwd: repoRoot,
    env: {
      ...process.env,
      ...env,
    },
    encoding: "utf8",
  });
}

async function openDatabase(databasePath) {
  const initSqlJs = (await import("sql.js")).default;
  const SQL = await initSqlJs();
  const bytes = fs.readFileSync(databasePath);
  return new SQL.Database(bytes);
}

async function createLegacyDatabase(databasePath) {
  const initSqlJs = (await import("sql.js")).default;
  const SQL = await initSqlJs();
  const db = new SQL.Database();
  db.exec(`
    CREATE TABLE commands (
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

    CREATE TABLE command_overrides (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      command_id INTEGER NOT NULL,
      field_name TEXT NOT NULL,
      field_value TEXT,
      updated_at TEXT NOT NULL,
      UNIQUE(command_id, field_name)
    );

    CREATE TABLE app_meta (
      key TEXT PRIMARY KEY,
      value TEXT
    );
  `);
  fs.writeFileSync(databasePath, Buffer.from(db.export()));
}

test("tm --add registers a discovered command from PATH", async () => {
  const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), "tm-v2-add-command-"));
  const homeDir = path.join(tempRoot, "home");
  fs.mkdirSync(homeDir, { recursive: true });
  const { packageRoot, commandName } = createFixtureCommand(tempRoot);

  const result = runCli(["--add", commandName], {
    HOME: homeDir,
    PATH: `${path.join(packageRoot, "bin")}:${process.env.PATH}`,
  });

  assert.equal(result.status, 0);
  assert.match(result.stdout, /Added|Registered/i);
  assert.match(result.stdout, new RegExp(`Command: ${commandName}`));
});

test("tm --update refreshes command metadata through the V2 command name", async () => {
  const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), "tm-v2-update-"));
  const homeDir = path.join(tempRoot, "home");
  fs.mkdirSync(homeDir, { recursive: true });
  const { packageRoot, commandName } = createFixtureCommand(tempRoot);
  const env = {
    HOME: homeDir,
    PATH: `${path.join(packageRoot, "bin")}:${process.env.PATH}`,
  };

  const addResult = runCli(["--add", commandName], env);
  assert.equal(addResult.status, 0);

  const updateResult = runCli(["--update", commandName], env);
  assert.equal(updateResult.status, 0);
  assert.match(updateResult.stdout, /Refreshed|Updated/i);
});

test("tm --remove soft deletes a command and keeps the row in sqlite", async () => {
  const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), "tm-v2-remove-"));
  const homeDir = path.join(tempRoot, "home");
  fs.mkdirSync(homeDir, { recursive: true });
  const { packageRoot, commandName } = createFixtureCommand(tempRoot);
  const env = {
    HOME: homeDir,
    PATH: `${path.join(packageRoot, "bin")}:${process.env.PATH}`,
  };

  const addResult = runCli(["--add", commandName], env);
  assert.equal(addResult.status, 0);

  const removeResult = runCli(["--remove", commandName], env);
  assert.equal(removeResult.status, 0);

  const listResult = runCli([], env);
  assert.equal(listResult.status, 0);
  assert.doesNotMatch(listResult.stdout, new RegExp(commandName));

  const db = await openDatabase(path.join(homeDir, ".tool-manage", "tool-manage.db"));
  const rows = db.exec(
    `SELECT command_name, deleted_at FROM commands WHERE command_name = '${commandName}'`
  );
  assert.equal(rows.length, 1);
  assert.equal(rows[0].values.length, 1);
  assert.equal(rows[0].values[0][0], commandName);
  assert.ok(rows[0].values[0][1]);
});

test("tm --generate creates a minimal manual spec template", () => {
  const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), "tm-v2-generate-"));
  const homeDir = path.join(tempRoot, "home");
  fs.mkdirSync(homeDir, { recursive: true });

  const result = runCli(["--generate", "draft-tool"], {
    HOME: homeDir,
  });

  assert.equal(result.status, 0);
  const generatedPath = path.join(repoRoot, "draft-tool.json");
  assert.ok(fs.existsSync(generatedPath));

  const payload = JSON.parse(fs.readFileSync(generatedPath, "utf8"));
  assert.deepEqual(Object.keys(payload), [
    "schemaVersion",
    "commandName",
    "description",
    "version",
    "repository",
    "author",
  ]);
  assert.equal(payload.commandName, "draft-tool");
  assert.equal(payload.description, "");
  fs.unlinkSync(generatedPath);
});

test("re-adding a soft-deleted command restores the original row", async () => {
  const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), "tm-v2-restore-"));
  const homeDir = path.join(tempRoot, "home");
  fs.mkdirSync(homeDir, { recursive: true });
  const { packageRoot, commandName } = createFixtureCommand(tempRoot);
  const env = {
    HOME: homeDir,
    PATH: `${path.join(packageRoot, "bin")}:${process.env.PATH}`,
  };

  assert.equal(runCli(["--add", commandName], env).status, 0);
  assert.equal(runCli(["--remove", commandName], env).status, 0);
  assert.equal(runCli(["--add", commandName], env).status, 0);

  const db = await openDatabase(path.join(homeDir, ".tool-manage", "tool-manage.db"));
  const rows = db.exec(
    `SELECT id, deleted_at FROM commands WHERE command_name = '${commandName}'`
  );
  assert.equal(rows.length, 1);
  assert.equal(rows[0].values.length, 1);
  assert.equal(rows[0].values[0][1], null);
});

test("tm --show omits empty fields from detail output", () => {
  const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), "tm-v2-show-"));
  const homeDir = path.join(tempRoot, "home");
  fs.mkdirSync(homeDir, { recursive: true });
  const specPath = path.join(tempRoot, "manual-tool.json");
  createManualSpec(specPath);

  const env = {
    HOME: homeDir,
  };

  const addResult = runCli(["--add", specPath], env);
  assert.equal(addResult.status, 0);

  const showResult = runCli(["--show", "manual-tool"], env);
  assert.equal(showResult.status, 0);
  assert.doesNotMatch(showResult.stdout, /Homepage:/);
  assert.doesNotMatch(showResult.stdout, /Bugs:/);
  assert.doesNotMatch(showResult.stdout, /License:/);
});

test("legacy sqlite databases are migrated to include deleted_at", async () => {
  const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), "tm-v2-migrate-"));
  const homeDir = path.join(tempRoot, "home");
  const appDir = path.join(homeDir, ".tool-manage");
  fs.mkdirSync(appDir, { recursive: true });

  const databasePath = path.join(appDir, "tool-manage.db");
  await createLegacyDatabase(databasePath);

  const listResult = runCli([], {
    HOME: homeDir,
  });
  assert.equal(listResult.status, 0);

  const db = await openDatabase(databasePath);
  const columns = db.exec("PRAGMA table_info(commands)");
  const columnNames = columns[0].values.map((row) => row[1]);
  assert.ok(columnNames.includes("deleted_at"));
});
