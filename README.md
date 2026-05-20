[中文](./README_ZH.md) | English

# tool-manage

Give your local CLI toolbox a memory.

`tool-manage` adds a clean registry on top of the commands already living on your machine. With `tm`, you can discover a command from `PATH`, import a hand-written JSON spec, keep important metadata in sqlite, and come back later to inspect, update, or retire it without losing context.

It is built for developers who have more scripts and CLIs than they can comfortably remember.

## Why It Helps

- Turn scattered local commands into a searchable personal catalog
- Keep descriptions, versions, authors, repos, and help output in one place
- Mix automatic discovery with manual specs for private or internal tools
- Soft-delete commands instead of losing history
- Generate starter JSON specs for scripts that do not expose package metadata

## Quick Preview

The core loop is intentionally small:

```bash
tm --add pnpm
tm --show pnpm
tm --update pnpm
tm --generate sync-notes
tm --add ./sync-notes.json
tm --remove pnpm
```

And the help surface stays compact:

```bash
tm --help
tm --add <command-or-json>
tm --show <command>
tm --edit <command>
tm --update <command>
tm --remove <command>
tm --generate [command]
```

## Install

```bash
npm install -g @alucpro/tool-manage
```

or

```bash
pnpm add -g @alucpro/tool-manage
```

## Usage

### Add what already exists on your machine

```bash
tm --add pnpm
tm --add pom
```

`tm` will resolve the command from your `PATH`, inspect package metadata when possible, and store a help preview for later lookup.

### Add a command from a JSON spec

```bash
tm --add ./my-command.json
tm --add https://example.com/my-command.json
```

This is ideal for private scripts, internal tools, or anything that does not expose a useful `package.json`.

### Generate a starter spec

```bash
tm --generate
tm --generate sync-notes
```

Use this when you want a blank, valid JSON skeleton that can later be imported with `tm --add`.

### Inspect and maintain your registry

```bash
tm
tm --show pnpm
tm --edit pnpm
tm --update pnpm
tm --remove pnpm
```

## AI JSON Spec Docs

If you want another CLI project to generate a JSON file that `tm --add` can ingest, use these docs:

- [AI Command JSON Spec](./docs/AI_COMMAND_JSON_SPEC.md)
- [AI Command JSON Spec (Chinese)](./docs/AI_COMMAND_JSON_SPEC_ZH.md)

They are written to be pasted directly into an AI workflow along with a shell script or CLI project.

## Local Development

For local setup, testing, and release-time checks:

- [Local Test Guide](./docs/LOCAL_TEST.md)
- [本地测试说明](./docs/LOCAL_TEST_ZH.md)

Quick start:

```bash
pnpm install
pnpm test
pnpm start -- --help
```

## Storage Notes

Runtime data lives in:

- sqlite database: `~/.tool-manage/tool-manage.db`
- editable templates: `~/.tool-manage/templates/`
- schema reference: [schema/sqlite.sql](./schema/sqlite.sql)

`tm --remove` uses soft deletion through `commands.deleted_at`, so records can be retired without losing their history.

## Compatibility Notes

V2 still accepts a few older aliases:

- `tm --register <command>` -> `tm --add <command>`
- `tm --refresh <command>` -> `tm --update <command>`
- `tm --unregister <command>` -> `tm --remove <command>`

## Contact

Built by Xuming.

If this tool helps your CLI workflow and you want to talk about improvements, ideas, or custom tooling, reach out here:

- [https://dg.aluc.me](https://dg.aluc.me)
