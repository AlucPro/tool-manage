# 本地测试说明

这份文档用于说明 `tool-manage` 的本地开发、验证和发布前检查流程。

## 1. 安装依赖

```bash
pnpm install
```

或者：

```bash
npm install
```

## 2. 运行自动化测试

```bash
pnpm test
```

或者：

```bash
npm test
```

当前测试重点覆盖 V2 命令流：

- `tm --add <command>`
- `tm --add <json>`
- `tm --update <command>`
- `tm --remove <command>`
- `tm --generate [commandName]`
- 旧版 sqlite 自动迁移到 `deleted_at`

## 3. 本地运行 CLI

```bash
pnpm start -- --help
pnpm start -- --add pnpm
pnpm start -- --show pnpm
pnpm start -- --update pnpm
pnpm start -- --generate sync-notes
```

## 4. 建议手工检查的内容

如果你改动了 CLI 行为，建议再手工确认这些点：

1. `--help` 是否准确反映当前公开命令面
2. 空参数执行 `tm` 时是否仍然列出活动命令
3. `tm --show <command>` 是否隐藏空字段
4. `tm --remove <command>` 是否变成软删除，而不是直接删除数据
5. 同名命令重新 `add` 后，是否正确恢复原记录

## 5. 查看本地 sqlite 数据库

```bash
sqlite3 ~/.tool-manage/tool-manage.db
```

常用查询：

```sql
.tables
.schema commands
SELECT id, command_name, deleted_at, metadata_source, updated_at FROM commands;
SELECT command_id, field_name, field_value, updated_at FROM command_overrides;
```

## 6. 发布前检查清单

发布前建议按这个顺序检查：

```bash
git status
pnpm test
pnpm start -- --help
npm whoami
npm view @alucpro/tool-manage version --registry=https://registry.npmjs.org/
```

确认没有问题后，再执行：

```bash
npm publish --access public --registry=https://registry.npmjs.org/
```
