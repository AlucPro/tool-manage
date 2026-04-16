# Generic NPM CLI Template

Use this file as the source template for generating a publishable Node.js CLI package.

The template is based on the patterns proven in `tool-manage`:

- plain JavaScript
- ESM by default
- `src/cli.js` as the executable entrypoint
- package metadata surfaced in `--help`
- lightweight manual argument parsing
- minimal file count
- ready for both `npm` and `pnpm` installs

If your goal is specifically "make this repo easy for `tm` to register and inspect", also follow [package-json-registration-spec.md](/Users/alucard/Code/AlucPro/tool-manage/docs/package-json-registration-spec.md).

## 1. Generator Inputs

When generating a new CLI from this template, collect these inputs:

- `packageName`: npm package name, optionally scoped
- `commandName`: executable command name exposed in `bin`
- `description`: short one-line package description
- `author`: author string for `package.json`
- `repositoryUrl`: git repository URL
- `homepageUrl`: homepage URL
- `bugsUrl`: issue tracker URL
- `nodeVersion`: default `>=18`
- `subcommands`: a list of supported commands
- `examples`: a short list of real usage examples

If the user does not specify enough detail, use these defaults:

- package format: ESM
- language: JavaScript
- package manager for local development: `pnpm`
- runtime compatibility: `npm` and `pnpm`
- entrypoint: `src/cli.js`
- version: `0.1.0`
- license: `MIT`

## 2. Output Structure

Generate this structure by default:

```text
project/
├── package.json
├── pnpm-lock.yaml
├── .gitignore
├── README.md
└── src/
    └── cli.js
```

Keep the scaffold lean unless the user explicitly asks for more.

## 3. package.json Template

Replace angle-bracket placeholders before writing the file.

```json
{
  "name": "<packageName>",
  "version": "0.1.0",
  "description": "<description>",
  "type": "module",
  "private": false,
  "bin": {
    "<commandName>": "./src/cli.js"
  },
  "files": [
    "src"
  ],
  "license": "MIT",
  "author": "<author>",
  "homepage": "<homepageUrl>",
  "repository": {
    "type": "git",
    "url": "git+<repositoryUrl>"
  },
  "bugs": {
    "url": "<bugsUrl>"
  },
  "engines": {
    "node": ">=18"
  },
  "packageManager": "pnpm@latest",
  "scripts": {
    "start": "node ./src/cli.js",
    "dev": "node ./src/cli.js --help",
    "check": "node ./src/cli.js --help"
  },
  "keywords": [
    "cli",
    "node",
    "npm",
    "<commandName>"
  ]
}
```

Rules:

- do not add dependencies unless the requested CLI behavior truly needs them
- do not add `preinstall` restrictions unless the user explicitly wants package-manager enforcement
- do not add a self-dependency
- keep `bin` aligned with the actual entry file

## 4. .gitignore Template

```gitignore
node_modules
.DS_Store
*.log
*.tgz
```

## 5. CLI Behavior Contract

Every generated CLI must implement these behaviors:

- `--help` and `-h`
- `--version` and `-v`
- human-readable success messages
- non-zero exit code on user-facing input errors
- direct execution through the package `bin`

For multi-command CLIs:

- bare command may show help or a default action
- unknown commands must print a clear error plus a hint to run `--help`
- each subcommand should be discoverable from the main help output

## 6. src/cli.js Template

Use this as the default starter entrypoint.

Replace placeholders before writing the file.

```js
#!/usr/bin/env node

import fs from "node:fs";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const packageJsonPath = path.resolve(__dirname, "../package.json");
const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, "utf8"));

function exitWithError(message) {
  console.error(`Error: ${message}`);
  console.error(`Run \`${packageJson.bin ? Object.keys(packageJson.bin)[0] : "cli"} --help\` to see available commands.`);
  process.exit(1);
}

function printSection(title) {
  console.log("");
  console.log(title);
}

function printList(items, indent = "  ") {
  for (const item of items) {
    console.log(`${indent}${item}`);
  }
}

function printKeyValue(label, value, indent = "") {
  const normalizedLabel = `${label}:`.padEnd(13, " ");
  console.log(`${indent}${normalizedLabel}${value}`);
}

function printHelp() {
  console.log(`${packageJson.name} v${packageJson.version}`);
  console.log(packageJson.description);
  console.log("");
  printKeyValue("Repository", typeof packageJson.repository === "string" ? packageJson.repository : packageJson.repository?.url ?? "N/A");
  printKeyValue("Author", typeof packageJson.author === "string" ? packageJson.author : packageJson.author?.name ?? "N/A");

  printSection("Usage");
  printList([
    "<commandName>",
    "<commandName> --help",
    "<commandName> --version",
    "<commandName> <subcommand> [options]"
  ]);

  printSection("Options");
  printList([
    "-h, --help          Show help",
    "-v, --version       Show version"
  ]);

  printSection("Commands");
  printList([
    "<subcommand>        <subcommand description>"
  ]);

  printSection("Examples");
  printList([
    "<commandName> --help",
    "<commandName> <subcommand>"
  ]);
}

function printVersion() {
  console.log(packageJson.version);
}

function handleDefaultCommand() {
  printHelp();
}

function handleSubcommand(args) {
  const value = args[0];

  if (!value) {
    exitWithError("Missing required input.");
  }

  console.log(`Handled subcommand input: ${value}`);
}

function parseArgs(args) {
  const [first, second] = args;

  if (!first) {
    return { action: "default" };
  }

  if (first === "-h" || first === "--help" || first === "help") {
    return { action: "help" };
  }

  if (first === "-v" || first === "--version" || first === "version") {
    return { action: "version" };
  }

  if (first === "<subcommand>") {
    return { action: "subcommand", value: second };
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

  if (parsed.action === "default") {
    handleDefaultCommand();
    return;
  }

  if (parsed.action === "subcommand") {
    handleSubcommand([parsed.value]);
    return;
  }

  exitWithError(`Unknown option or command "${parsed.value}".`);
}

main(process.argv);
```

## 7. README Template

Use this as the default README for generated CLIs.

````md
# <packageName>

<description>

## Install

```bash
npm install -g <packageName>
```

or

```bash
pnpm add -g <packageName>
```

## Usage

```bash
<commandName> --help
<commandName> --version
```

## Commands

```bash
<commandName> <subcommand> [options]
```

## Examples

```bash
<commandName> --help
<commandName> <subcommand>
```

## Local Development

```bash
pnpm install
pnpm start -- --help
```
````

## 8. Generation Rules

When using this file to generate a new CLI:

1. infer the package shape from the user's request
2. replace placeholders in `package.json`, `src/cli.js`, and `README.md`
3. keep file count low
4. prefer manual argument parsing unless complexity justifies a dependency
5. ensure the generated command is runnable locally
6. verify at least:
   - `node ./src/cli.js --help`
   - `node ./src/cli.js --version`

## 9. Expansion Guidelines

Only expand beyond the default template when the user asks for more:

- add `src/commands/` for multiple subcommands
- add `src/lib/` when logic becomes shared or complex
- add tests when behavior is non-trivial or explicitly requested
- add a third-party parser like `commander` or `cac` only when manual parsing becomes noisy

## 10. Anti-Patterns

Avoid these when generating the scaffold:

- adding TypeScript without being asked
- adding a bundler without being asked
- creating unnecessary config files
- adding install-time package-manager restrictions by default
- publishing without validating the entrypoint and package metadata
