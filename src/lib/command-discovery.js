import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { HELP_TIMEOUT_MS } from "./constants.js";
import {
  formatAuthor,
  formatBin,
  formatEngines,
  formatKeywords,
  formatUrlField,
  normalizeRepositoryUrl,
} from "./metadata.js";

function run(command, args, options = {}) {
  return spawnSync(command, args, {
    encoding: "utf8",
    timeout: HELP_TIMEOUT_MS,
    ...options,
  });
}

export function commandExists(commandName) {
  const result = run("which", [commandName]);
  return result.status === 0 && Boolean(result.stdout.trim());
}

export function resolveCommandPath(commandName) {
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
        return { packageFilePath, pkg: readPackageFromFile(packageFilePath) };
      }

      if (typeof bin === "object" && Object.hasOwn(bin, commandName)) {
        const packageFilePath = path.join(pkg.path, "package.json");
        return { packageFilePath, pkg: readPackageFromFile(packageFilePath) };
      }
    }
  } catch {
    return null;
  }

  return null;
}

function resolveCommandPackage(commandName, commandPath) {
  const packageFilePath = findPackageJsonAbove(commandPath);

  if (packageFilePath) {
    const pkg = readPackageFromFile(packageFilePath);
    if (pkg) {
      return { packageFilePath, pkg };
    }
  }

  return findPackageFromGlobalPnpm(commandName);
}

export function getCommandHelp(commandName) {
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

export function collectDetectedMetadata(commandName) {
  const commandPath = resolveCommandPath(commandName);
  const packageInfo = resolveCommandPackage(commandName, commandPath);
  const pkg = packageInfo?.pkg ?? null;

  return {
    commandName,
    commandPath,
    packageName: pkg?.name ?? null,
    packageJsonPath: packageInfo?.packageFilePath ?? null,
    description: pkg?.description ?? null,
    version: pkg?.version ?? null,
    repository: normalizeRepositoryUrl(pkg?.repository),
    author: formatAuthor(pkg?.author),
    homepage: formatUrlField(pkg?.homepage),
    bugs: formatUrlField(pkg?.bugs),
    license: pkg?.license ?? null,
    keywords: formatKeywords(pkg?.keywords),
    bin: formatBin(pkg?.bin),
    engines: formatEngines(pkg?.engines),
    helpPreview: getCommandHelp(commandName),
  };
}
