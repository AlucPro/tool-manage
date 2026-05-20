中文 | [English](./README.md)

# tool-manage

给你本地的 CLI 工具箱，补上一层“记忆”。

`tool-manage` 不是安装器，而是命令登记与管理工具。它会把你机器里已经存在的命令、脚本和小工具，用 `tm` 统一登记起来：自动发现、手工补录、查看详情、更新元数据、软删除归档，最后形成一个你自己看得懂、找得到、维护得住的本地命令资产库。

如果你经常遇到这些情况，它就很适合你：

- 电脑里装了很多 CLI，但过一阵就忘了它们是干什么的
- 内部脚本没有标准 `package.json`，只能靠脑子记
- 同一个命令是谁写的、仓库在哪、怎么用，查起来很费劲
- 想保留历史，又不想让无效命令继续污染列表

## 它能解决什么

- 把零散命令整理成可回看的个人命令目录
- 自动抓取版本、描述、仓库、作者、帮助输出
- 对没有包元数据的脚本，支持手工 JSON 描述
- 删除时使用软删除，不会直接把记录物理抹掉
- 可以先生成 JSON 模板，再逐步补齐后导入

## 快速预览

典型工作流非常短：

```bash
tm --add pnpm
tm --show pnpm
tm --update pnpm
tm --generate sync-notes
tm --add ./sync-notes.json
tm --remove pnpm
```

核心命令面也保持得很克制：

```bash
tm --help
tm --add <command-or-json>
tm --show <command>
tm --edit <command>
tm --update <command>
tm --remove <command>
tm --generate [command]
```

## 演示

### 1. 添加本地命令并查看结果

`tm` 可以直接从 `PATH` 里发现命令，保存元数据，再把这条命令的完整信息展示出来。

![添加并查看命令](./docs/assets/help-add-list.gif)

### 2. 查看已登记命令详情

当你想把描述、版本、仓库、作者和帮助预览放到同一个视图里看时，用 `tm --show <command>` 就很顺手。

![查看命令详情](./docs/assets/help-list-show.gif)

### 3. 生成一个可继续补充的 JSON 模板

对于私有脚本或内部工具，`tm --generate` 会先给你一个合法 JSON 骨架，补完后再用 `tm --add` 导入即可。

![生成 JSON 模板](./docs/assets/gen.gif)

### 4. 清理当前命令列表

`tm --remove <command>` 采用软删除，命令会从当前活动列表里消失，但历史记录不会直接丢掉。

![从活动列表移除命令](./docs/assets/help-list-remove-list.gif)

## 安装

```bash
npm install -g @alucpro/tool-manage
```

或者：

```bash
pnpm add -g @alucpro/tool-manage
```

## 使用说明

### 1. 把本机已有命令登记进来

```bash
tm --add pnpm
tm --add pom
```

`tm` 会从你的 `PATH` 里找到这个命令，尽可能读取 `package.json` 元数据，并把 `--help` 的预览一起存起来。

### 2. 通过 JSON 描述文件添加命令

```bash
tm --add ./my-command.json
tm --add https://example.com/my-command.json
```

适合：

- 私有脚本
- 内部工具
- 没有标准 npm 包元数据的命令

### 3. 先生成一个可用模板

```bash
tm --generate
tm --generate sync-notes
```

这个命令会生成一个最小 JSON 骨架，后续补完后就可以继续用 `tm --add` 导入。

### 4. 查看和维护命令库

```bash
tm
tm --show pnpm
tm --edit pnpm
tm --update pnpm
tm --remove pnpm
```

## AI 生成 JSON 说明

如果你希望把别的 CLI 项目交给 AI，让 AI 直接生成一个 `tm --add` 可以吃进去的 JSON 文件，可以看这两份文档：

- [AI 命令 JSON 规范（中文）](./docs/AI_COMMAND_JSON_SPEC_ZH.md)
- [AI Command JSON Spec (English)](./docs/AI_COMMAND_JSON_SPEC.md)

它们就是专门给 AI 工作流准备的说明文档，可以和 shell 脚本、CLI 项目源码一起喂给模型使用。

## 本地开发

本地安装、测试、验证和发布前检查，请看：

- [本地测试说明](./docs/LOCAL_TEST_ZH.md)
- [Local Test Guide](./docs/LOCAL_TEST.md)

快速开始：

```bash
pnpm install
pnpm test
pnpm start -- --help
```

## 存储说明

运行时数据主要在这几个地方：

- sqlite 数据库：`~/.tool-manage/tool-manage.db`
- 可编辑模板目录：`~/.tool-manage/templates/`
- schema 参考： [schema/sqlite.sql](./schema/sqlite.sql)

`tm --remove` 走的是软删除逻辑，对应 `commands.deleted_at` 字段，所以记录会被归档，而不是直接丢失。

## 兼容说明

V2 仍然兼容几组旧命令别名：

- `tm --register <command>` -> `tm --add <command>`
- `tm --refresh <command>` -> `tm --update <command>`
- `tm --unregister <command>` -> `tm --remove <command>`

## 联系开发者

如果这个工具对你有帮助，或者你想交流 CLI 工具链、内部工具管理、开发者体验方面的想法，可以在这里找到作者：

- [https://dg.aluc.me](https://dg.aluc.me)
