#!/usr/bin/env node

import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import process from "node:process";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const packageJsonPath = path.resolve(__dirname, "../package.json");
const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, "utf8"));
const registryDir = path.join(os.homedir(), ".tool-manage");
const registryPath = path.join(registryDir, "registry.json");
const HELP_TIMEOUT_MS = 4000;
const HELP_PREVIEW_LINES = 12;

function formatRepository(repository) {
  if (!repository) {
    return "N/A";
  }

  if (typeof repository === "string") {
    return repository;
  }

  return repository.url ?? "N/A";
}

function formatAuthor(author) {
  if (!author) {
    return "N/A";
  }

  if (typeof author === "string") {
    return author;
  }

  const segments = [author.name, author.email, author.url].filter(Boolean);
  return segments.join(" | ") || "N/A";
}

function ensureRegistryDir() {
  fs.mkdirSync(registryDir, { recursive: true });
}

function readRegistry() {
  ensureRegistryDir();

  if (!fs.existsSync(registryPath)) {
    return { commands: [] };
  }

  try {
    const parsed = JSON.parse(fs.readFileSync(registryPath, "utf8"));
    const commands = Array.isArray(parsed.commands) ? parsed.commands : [];
    return { commands: [...new Set(commands.filter(Boolean))] };
  } catch {
    return { commands: [] };
  }
}

function writeRegistry(registry) {
  ensureRegistryDir();
  const uniqueCommands = [...new Set((registry.commands ?? []).filter(Boolean))];
  fs.writeFileSync(
    registryPath,
    `${JSON.stringify({ commands: uniqueCommands }, null, 2)}\n`,
    "utf8"
  );
}

function exitWithError(message) {
  console.error(`Error: ${message}`);
  console.error("Run `tm --help` to see available commands.");
  process.exit(1);
}

function run(command, args, options = {}) {
  return spawnSync(command, args, {
    encoding: "utf8",
    timeout: HELP_TIMEOUT_MS,
    ...options,
  });
}

function commandExists(commandName) {
  const result = run("which", [commandName]);
  return result.status === 0 && Boolean(result.stdout.trim());
}

function resolveCommandPath(commandName) {
  const result = run("which", [commandName]);
  if (result.status !== 0) {
    return null;
  }

  const rawPath = result.stdout.trim();
  if (!rawPath) {
    return null;
  }

  try {
    return fs.realpathSync(rawPath);
  } catch {
    return rawPath;
  }
}

function findPackageJsonAbove(filePath) {
  if (!filePath) {
    return null;
  }

  let currentDir = path.dirname(filePath);

  while (currentDir !== path.dirname(currentDir)) {
    const candidate = path.join(currentDir, "package.json");
    if (fs.existsSync(candidate)) {
      return candidate;
    }
    currentDir = path.dirname(currentDir);
  }

  return null;
}

function normalizeRepositoryUrl(repository) {
  const raw = formatRepository(repository);

  if (raw.startsWith("git+ssh://git@github.com/")) {
    return raw.replace("git+ssh://git@github.com/", "https://github.com/");
  }

  if (raw.startsWith("git@github.com:")) {
    return `https://github.com/${raw.slice("git@github.com:".length)}`;
  }

  return raw.replace(/^git\+/, "");
}

function readPackageFromFile(packageFilePath) {
  try {
    return JSON.parse(fs.readFileSync(packageFilePath, "utf8"));
  } catch {
    return null;
  }
}

function findPackageFromGlobalPnpm(commandName) {
  const result = run("pnpm", ["ls", "-g", "--json", "--depth", "-1"]);
  if (result.status !== 0 || !result.stdout.trim()) {
    return null;
  }

  try {
    const entries = JSON.parse(result.stdout);
    const packages = Array.isArray(entries)
      ? entries.flatMap((entry) => Object.values(entry.dependencies ?? {}))
      : [];

    for (const pkg of packages) {
      const bin = pkg?.bin;
      if (!bin) {
        continue;
      }

      if (typeof bin === "string" && pkg.name === commandName) {
        const packageFilePath = path.join(pkg.path, "package.json");
        return readPackageFromFile(packageFilePath);
      }

      if (typeof bin === "object" && Object.hasOwn(bin, commandName)) {
        const packageFilePath = path.join(pkg.path, "package.json");
        return readPackageFromFile(packageFilePath);
      }
    }
  } catch {
    return null;
  }

  return null;
}

function resolveCommandPackage(commandName) {
  const commandPath = resolveCommandPath(commandName);
  const packageFilePath = findPackageJsonAbove(commandPath);

  if (packageFilePath) {
    const pkg = readPackageFromFile(packageFilePath);
    if (pkg) {
      return pkg;
    }
  }

  return findPackageFromGlobalPnpm(commandName);
}

function getCommandHelp(commandName) {
  const result = run(commandName, ["--help"]);

  if (result.error) {
    return `Failed to execute \`${commandName} --help\`: ${result.error.message}`;
  }

  const output = `${result.stdout}${result.stderr}`.trim();
  if (!output) {
    return "No help output was returned.";
  }

  return output;
}

function buildCommandInfo(commandName) {
  const pkg = resolveCommandPackage(commandName);

  return {
    commandName,
    help: getCommandHelp(commandName),
    description: pkg?.description ?? "N/A",
    version: pkg?.version ?? "N/A",
    repository: normalizeRepositoryUrl(pkg?.repository),
    author: formatAuthor(pkg?.author),
  };
}

function printProjectMeta() {
  console.log(`${packageJson.name} v${packageJson.version}`);
  console.log(`${packageJson.description}`);
  console.log("");
  printKeyValue("Repository", normalizeRepositoryUrl(packageJson.repository));
  printKeyValue("Author", formatAuthor(packageJson.author));
}

function printSection(title) {
  console.log("");
  console.log(`${title}`);
}

function printKeyValue(label, value, indent = "") {
  const normalizedLabel = `${label}:`.padEnd(13, " ");
  console.log(`${indent}${normalizedLabel}${value}`);
}

function printList(items, indent = "  ") {
  for (const item of items) {
    console.log(`${indent}${item}`);
  }
}

function formatHelpPreview(helpText) {
  const lines = helpText.split("\n");
  const preview = lines.slice(0, HELP_PREVIEW_LINES);
  const truncated = lines.length > HELP_PREVIEW_LINES;
  const formatted = preview.map((line) => `    ${line}`);

  if (truncated) {
    formatted.push("    ...");
  }

  return formatted.join("\n");
}

function printHelp() {
  printProjectMeta();
  printSection("Usage");
  printList([
    "tm",
    "tm --help",
    "tm --version",
    "tm --register <command>",
    "tm --remove <command>",
    "tm --list",
  ]);

  printSection("Options");
  printList([
    "-h, --help          Show help and project metadata",
    "-v, --version       Show the current version",
    "-r, --register      Register a local command",
    "-d, --remove        Remove a registered command",
    "-l, --list          List all registered commands",
  ]);

  printSection("Examples");
  printList([
    "tm",
    "tm -r pom",
    "tm --register pom",
    "tm --remove pom",
    "tm -l",
  ]);
}

function printVersion() {
  console.log(packageJson.version);
}

function registerCommand(commandName) {
  if (!commandName) {
    exitWithError("Missing command name for registration.");
  }

  if (commandName === "tm") {
    exitWithError("You cannot register `tm` itself.");
  }

  if (!commandExists(commandName)) {
    exitWithError(`Command "${commandName}" was not found in your PATH.`);
  }

  const registry = readRegistry();

  if (registry.commands.includes(commandName)) {
    console.log(`Command "${commandName}" is already registered.`);
    return;
  }

  registry.commands.push(commandName);
  registry.commands.sort((left, right) => left.localeCompare(right));
  writeRegistry(registry);

  console.log(`Registered command "${commandName}".`);
}

function removeCommand(commandName) {
  if (!commandName) {
    exitWithError("Missing command name for removal.");
  }

  const registry = readRegistry();
  const nextCommands = registry.commands.filter((item) => item !== commandName);

  if (nextCommands.length === registry.commands.length) {
    exitWithError(`Command "${commandName}" is not registered.`);
  }

  writeRegistry({ commands: nextCommands });
  console.log(`Removed command "${commandName}".`);
}

function printCommandInfo(info) {
  console.log(`Command: ${info.commandName}`);
  printKeyValue("Description", info.description, "  ");
  printKeyValue("Version", info.version, "  ");
  printKeyValue("Repository", info.repository, "  ");
  printKeyValue("Author", info.author, "  ");
  console.log("  Help Preview:");
  console.log(formatHelpPreview(info.help));
}

function listCommands() {
  const registry = readRegistry();

  if (registry.commands.length === 0) {
    console.log("No commands registered yet.");
    console.log("Use `tm --register <command>` to add one.");
    return;
  }

  console.log(`Registered Commands (${registry.commands.length})`);

  registry.commands.forEach((commandName, index) => {
    printSection(`${String(index + 1).padStart(2, "0")}. ${commandName}`);
    printCommandInfo(buildCommandInfo(commandName));
  });
}

function parseArgs(args) {
  const [first, second] = args;

  if (!first) {
    return { action: "list" };
  }

  if (first === "-h" || first === "--help" || first === "help") {
    return { action: "help" };
  }

  if (first === "-v" || first === "--version" || first === "version") {
    return { action: "version" };
  }

  if (first === "-l" || first === "--list" || first === "list") {
    return { action: "list" };
  }

  if (first === "-r" || first === "--register" || first === "register") {
    return { action: "register", commandName: second };
  }

  if (
    first === "-d" ||
    first === "--remove" ||
    first === "--unregister" ||
    first === "remove" ||
    first === "unregister"
  ) {
    return { action: "remove", commandName: second };
  }

  return { action: "unknown", value: first };
}

function main(argv) {
  const parsed = parseArgs(argv.slice(2));

  if (parsed.action === "help") {
    printHelp();
    return;
  }

  if (parsed.action === "version") {
    printVersion();
    return;
  }

  if (parsed.action === "register") {
    registerCommand(parsed.commandName);
    return;
  }

  if (parsed.action === "remove") {
    removeCommand(parsed.commandName);
    return;
  }

  if (parsed.action === "list") {
    listCommands();
    return;
  }

  exitWithError(`Unknown option or command "${parsed.value}".`);
}

main(process.argv);
