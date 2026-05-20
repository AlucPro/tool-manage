# Local Test Guide

This guide covers the normal local workflow for developing and validating `tool-manage`.

## 1. Install dependencies

```bash
pnpm install
```

or

```bash
npm install
```

## 2. Run the automated tests

```bash
pnpm test
```

or

```bash
npm test
```

Current test coverage focuses on the V2 command flow:

- `tm --add <command>`
- `tm --add <json>`
- `tm --update <command>`
- `tm --remove <command>`
- `tm --generate [commandName]`
- legacy sqlite migration to `deleted_at`

## 3. Run the CLI locally

```bash
pnpm start -- --help
pnpm start -- --add pnpm
pnpm start -- --show pnpm
pnpm start -- --update pnpm
pnpm start -- --generate sync-notes
```

## 4. Manual checks worth doing

When you change CLI behavior, verify these manually:

1. Help output reflects the public command surface
2. `tm` with no arguments still lists active commands
3. `tm --show <command>` hides empty fields
4. `tm --remove <command>` soft deletes instead of destroying the row
5. Re-adding the same command restores it cleanly

## 5. Inspect the local sqlite database

```bash
sqlite3 ~/.tool-manage/tool-manage.db
```

Useful queries:

```sql
.tables
.schema commands
SELECT id, command_name, deleted_at, metadata_source, updated_at FROM commands;
SELECT command_id, field_name, field_value, updated_at FROM command_overrides;
```

## 6. Release-time checklist

Before publishing:

```bash
git status
pnpm test
pnpm start -- --help
npm whoami
npm view @alucpro/tool-manage version --registry=https://registry.npmjs.org/
```

If all looks good:

```bash
npm publish --access public --registry=https://registry.npmjs.org/
```
