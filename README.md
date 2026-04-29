# tool-manage

Register, inspect, enrich, and manage locally available CLI commands with `tm`.

`tool-manage` is designed for developers who have multiple local CLI tools installed and want a richer local registry to keep track of them. It stores command metadata in sqlite, can recover old `registry.json` data, and supports manual metadata completion when a command does not expose a usable `package.json`.

## Install

```bash
npm install -g @alucpro/tool-manage
```

or

```bash
pnpm add -g @alucpro/tool-manage
```

## Usage

```bash
tm --help
tm
tm --register pom
tm --add ./templates/manual-command.template.json
tm --show pom
tm --edit pom
tm --refresh pom
tm --remove pom
```

## Commands

```bash
tm --help
tm --version
tm --register <command>
tm --add <file-or-url>
tm --show <command>
tm --edit <command>
tm --refresh <command>
tm --remove <command>
tm --list
```

## Features

- `tm --help` shows usage plus package metadata
- `tm --register <command>` registers a command into the sqlite registry
- `tm --add <file-or-url>` adds a command from a manual JSON spec, even if that command is not discoverable from `PATH`
- `tm --show <command>` prints a full command record, including `description`, `version`, `repository`, `author`, `homepage`, `bugs`, `license`, `keywords`, `bin`, `engines`, and a `--help` preview
- `tm --edit <command>` opens a metadata template so you can fill missing fields or override detected metadata
- `tm --refresh <command>` re-detects runtime metadata and keeps manual overrides
- `tm --list` or bare `tm` lists all registered commands in a table view
- `tm --remove <command>` removes a registered command

## Storage

- sqlite database: `~/.tool-manage/tool-manage.db`
- metadata templates: `~/.tool-manage/templates/`
- legacy backup after migration: `~/.tool-manage/registry.json.bak`

Inspect the sqlite database directly:

```bash
sqlite3 ~/.tool-manage/tool-manage.db
```

Useful sqlite commands:

```sql
.tables
.schema commands
.headers on
.mode column
SELECT id, command_name, description, version, repository, author, homepage, bugs, license, keywords, bin, engines, metadata_source, updated_at FROM commands;
SELECT command_id, field_name, field_value, updated_at FROM command_overrides;
```

One-shot query from the shell:

```bash
sqlite3 ~/.tool-manage/tool-manage.db "SELECT id, command_name, description, version, repository, author, homepage, bugs, license, keywords, bin, engines, metadata_source FROM commands;"
```

## Examples

Register a locally available command:

```bash
tm -r pom
```

Add a manually documented script:

```bash
tm --add ./your-script.json
```

Add from a remote JSON URL:

```bash
tm --add https://example.com/your-script.json
```

Show one registered command:

```bash
tm --show pom
```

Edit metadata for a command:

```bash
tm --edit pom
```

Refresh detected metadata:

```bash
tm --refresh pom
```

List all registered commands:

```bash
tm
```

Remove a command from the registry:

```bash
tm --remove pom
```

## How It Works

- command data is stored in `~/.tool-manage/tool-manage.db`
- editable metadata templates are stored in `~/.tool-manage/templates/`
- legacy `~/.tool-manage/registry.json` data is auto-imported on first run
- `tm` resolves commands from your local `PATH`
- when available, `tm` reads command package metadata from `package.json`
- detected package metadata currently includes `name`, `version`, `description`, `author`, `repository`, `homepage`, `bugs`, `license`, `keywords`, `bin`, and `engines`
- `tm` stores a `--help` preview in sqlite so later list and show commands stay fast
- if metadata is missing, `tm` can generate a JSON template for you to complete manually
- `tm --add` skips auto-detection and writes a fully manual record from your JSON spec

## Manual JSON Spec For `tm --add`

Use `tm --add <file-or-url>` when you have your own script and want to register it with a hand-written description file.

Required fields:

- `commandName`
- `description`
- `version`
- `repository`
- `author`

Supported fields:

- `schemaVersion`
- `commandName`
- `commandPath`
- `scriptPath`
- `packageName`
- `packageJsonPath`
- `description`
- `version`
- `repository`
- `author`
- `homepage`
- `bugs`
- `license`
- `keywords`
- `bin`
- `engines`
- `notes`
- `helpPreview`
- `usage`

Notes:

- `schemaVersion` currently should be `1`
- `scriptPath` is accepted as an alias of `commandPath`
- `usage` is accepted as an alias of `helpPreview`
- `keywords` can be either an array or a comma-separated string
- `bin` can be either a string or an object like package.json's `bin`
- `engines` can be either a string or an object
- `repository`, `author`, `homepage`, and `bugs` accept the same shapes commonly used in `package.json`

Example:

```json
{
  "schemaVersion": 1,
  "commandName": "sync-notes",
  "commandPath": "/Users/alucard/bin/sync-notes.sh",
  "description": "Sync local markdown notes into a workspace folder.",
  "version": "0.3.0",
  "repository": "https://github.com/your-org/internal-scripts",
  "author": "Your Name <you@example.com>",
  "homepage": "https://github.com/your-org/internal-scripts#readme",
  "bugs": "https://github.com/your-org/internal-scripts/issues",
  "license": "MIT",
  "keywords": ["shell", "notes", "sync"],
  "bin": "sync-notes",
  "engines": {
    "bash": ">=4.0"
  },
  "notes": "Requires rsync and SSH access to the target workspace.",
  "helpPreview": "Usage: sync-notes <source> <target>\n\nOptions:\n  --dry-run    Preview only\n  --help       Show help"
}
```

Then add it with:

```bash
tm --add ./sync-notes.json
```

## AI Templates For Manual Specs

These two files are included in the repo for AI-assisted generation:

- JSON template: [templates/manual-command.template.json](/Users/alucard/Code/AlucPro/tool-manage/templates/manual-command.template.json)
- shell-to-JSON instruction template: [templates/manual-command-shell-template.md](/Users/alucard/Code/AlucPro/tool-manage/templates/manual-command-shell-template.md)

Recommended workflow:

1. Give AI your shell script.
2. Also give AI those two template files.
3. Ask AI to return a filled `xxx.json` matching the JSON template exactly.
4. Run `tm --add ./xxx.json`.

## Registration-Friendly package.json

If you want another repo to be easy for `tm` to register and inspect, use the spec in [docs/package-json-registration-spec.md](/Users/alucard/Code/AlucPro/tool-manage/docs/package-json-registration-spec.md).

That file is written so you can copy it into another repository and let AI generate or repair a `package.json` that exposes the fields `tm` relies on: `name`, `version`, `description`, `author`, `repository`, `homepage`, `bugs`, `license`, `keywords`, `bin`, and `engines`.

For best results, make sure the `bin` entry matches the actual executable name on your `PATH`, and keep URLs in a machine-readable shape such as:

```json
{
  "homepage": "https://github.com/your-org/your-tool",
  "repository": {
    "type": "git",
    "url": "git+https://github.com/your-org/your-tool.git"
  },
  "bugs": {
    "url": "https://github.com/your-org/your-tool/issues"
  }
}
```

## Local Development

```bash
npm install
npm run start -- --help
```

or

```bash
pnpm install
pnpm start -- --help
pnpm start -- --register pom
pnpm start -- --add ./templates/manual-command.template.json
pnpm start -- --show pom
pnpm start -- --list
```

## Publish

For the full manual release flow, see [docs/npm-publish.md](/Users/alucard/Code/AlucPro/tool-manage/docs/npm-publish.md).

Quick publish commands:

```bash
npm whoami
npm view @alucpro/tool-manage version --registry=https://registry.npmjs.org/
npm publish --access public --registry=https://registry.npmjs.org/
```
