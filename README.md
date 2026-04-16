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
tm --show <command>
tm --edit <command>
tm --refresh <command>
tm --remove <command>
tm --list
```

## Features

- `tm --help` shows usage plus package metadata
- `tm --register <command>` registers a command into the sqlite registry
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
