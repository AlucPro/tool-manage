中文 | [English](./README.md)

# tool-manage

给你的本地 CLI 工具箱，补上一层“记忆”。

`tool-manage` 是一个基于 sqlite 的本地命令登记工具。它不是安装器，而是帮你管理那些已经存在于电脑里的 CLI 工具、脚本、内部命令和自动化小工具。

通过 `tm` 命令，你可以从 `PATH` 中发现命令，导入手写的 JSON 描述文件，保存命令的描述、版本、仓库、作者、帮助信息，并在之后查看、更新、编辑或归档这些命令。

它适合那些本地工具越来越多，但已经很难靠脑子记住全部上下文的开发者。

---

## 为什么需要它？

现代开发者的电脑里通常会有很多小工具：

- 全局安装的 npm / pnpm 命令
- shell 脚本
- 公司内部 CLI
- AI Coding 工具
- 一次性自动化脚本
- 没有标准包信息的私有命令

时间一长，真正的问题往往不是“怎么安装”，而是：

- 这个命令是干什么的？
- 仓库在哪里？
- 谁维护的？
- 怎么使用？
- 现在还在用吗？
- 当初为什么把它加进来？

`tool-manage` 解决的是这个问题：  
给你的本地命令加一个可以回看的登记库。

---

## 它能做什么？

- 登记你电脑里已经存在的命令
- 尽可能自动读取包元数据
- 保存描述、版本、作者、仓库、帮助输出
- 从本地或远程 JSON 文件导入命令记录
- 给私有脚本生成可补充的 JSON 模板
- 编辑和更新已有命令记录
- 软删除旧命令，保留历史
- 所有数据保存在本地 sqlite 数据库中

---

## 快速演示

### 1. 添加本地命令并查看结果

`tm` 可以直接从 `PATH` 中发现命令，保存元数据，并用表格展示出来。

![添加并查看命令](./docs/assets/help-add-list.gif)

### 2. 查看已登记命令详情

当你想把描述、版本、仓库、作者和帮助预览放到同一个视图里看时，可以使用：

```bash
tm --show <command>
```

![查看命令详情](./docs/assets/help-list-show.gif)

### 3. 生成一个 JSON 模板

对于私有脚本或内部工具，`tm --generate` 会生成一个合法的 JSON 骨架。你补完后，就可以用 `tm --add` 导入。

![生成 JSON 模板](./docs/assets/gen.gif)

### 4. 归档旧命令

`tm --remove <command>` 使用软删除。命令会从当前活动列表中消失，但历史记录不会直接丢失。

![从活动列表移除命令](./docs/assets/help-list-remove-list.gif)

---

## 安装

```bash
npm install -g @alucpro/tool-manage
```

或者：

```bash
pnpm add -g @alucpro/tool-manage
```

要求 Node.js >= 18。

---

## 基本使用

### 添加本机已有命令

```bash
tm --add pnpm
tm --add node
tm --add your-local-script
```

`tm` 会从你的 `PATH` 中找到这个命令，尽可能读取包元数据，并把帮助信息预览保存下来。

### 查看已登记命令列表

```bash
tm
```

### 查看命令详情

```bash
tm --show pnpm
```

### 编辑已保存的元数据

```bash
tm --edit pnpm
```

### 更新命令元数据

```bash
tm --update pnpm
```

### 生成命令描述模板

```bash
tm --generate
tm --generate sync-notes
```

### 从 JSON 文件添加命令

```bash
tm --add ./my-command.json
tm --add https://example.com/my-command.json
```

适合这些场景：

- 私有脚本
- 内部工具
- 没有标准 `package.json` 元数据的命令
- 希望通过 AI 生成描述文件后再导入的命令

### 从活动列表移除命令

```bash
tm --remove pnpm
```

这里是软删除。记录会被归档，而不是直接物理删除。

---

## 典型工作流

```bash
tm --add pnpm
tm --show pnpm
tm --update pnpm

tm --generate sync-notes
tm --add ./sync-notes.json

tm --remove old-script
```

---

## 适合谁？

如果你有下面这些情况，`tool-manage` 会比较适合你：

- 经常忘记本地命令是干什么的
- 有很多个人脚本
- 需要管理公司内部 CLI
- 正在使用 AI Coding 工具和自动化脚本
- 想建立自己的开发者工具箱
- 有一些命令没有标准包信息，但你又想记录它们的上下文

它尤其适合正在搭建个人开发工作流、AI 辅助编程工作流、本地自动化系统的开发者。

---

## 不适合谁？

如果你只是想做下面这些事情，它可能不是最合适的工具：

- 安装 npm 包
- 切换 Node.js 版本
- 替代 `nvm`、`volta`、`mise`
- 做完整任务编排
- 管理复杂 workflow

`tool-manage` 不替代包管理器，也不替代版本管理器。

它做的是：  
在你已经拥有的命令之上，加一层可回看的“记忆”。

---

## 和其他工具有什么区别？

| 工具类型 | 主要用途 | `tool-manage` 补充了什么 |
| --- | --- | --- |
| npm / pnpm 全局安装 | 安装包 | 记录和查看命令上下文 |
| nvm / volta / mise | 管理运行时和版本 | 管理命令元数据 |
| shell alias | 缩短命令 | 保存描述、仓库、作者、帮助信息 |
| README 文档 | 手工记录工具 | 建立本地可维护登记库 |
| task runner | 执行任务流 | 管理命令记录和上下文 |

---

## AI JSON Spec

如果你希望让 AI Coding 工具帮你为某个 CLI 项目、shell 脚本或内部工具生成一个 `tm --add` 可以导入的 JSON 文件，可以使用这两份文档：

- [AI 命令 JSON 规范（中文）](./docs/AI_COMMAND_JSON_SPEC_ZH.md)
- [AI Command JSON Spec (English)](./docs/AI_COMMAND_JSON_SPEC.md)

它们可以直接和源码、shell 脚本一起喂给模型。

示例需求：

> “请阅读这个 shell 脚本，并为它生成一个符合 tool-manage 规范的 JSON 描述文件。”

然后导入：

```bash
tm --add ./generated-command.json
```

---

## 存储位置

运行时数据主要保存在：

- sqlite 数据库：`~/.tool-manage/tool-manage.db`
- 可编辑模板目录：`~/.tool-manage/templates/`
- schema 参考：[schema/sqlite.sql](./schema/sqlite.sql)

`tm --remove` 走的是软删除逻辑，对应 `commands.deleted_at` 字段，所以记录会被归档，而不是直接丢失。

---

## 本地开发

```bash
pnpm install
pnpm test
pnpm start -- --help
```

更多说明：

- [本地测试说明](./docs/LOCAL_TEST_ZH.md)
- [Local Test Guide](./docs/LOCAL_TEST.md)

---

## 兼容说明

V2 仍然兼容几组旧命令别名：

- `tm --register <command>` -> `tm --add <command>`
- `tm --refresh <command>` -> `tm --update <command>`
- `tm --unregister <command>` -> `tm --remove <command>`

---

## 后续可能方向

- 更好的搜索和过滤
- tag 标签支持
- registry 导出 / 导入
- 交互式命令选择器
- 更好的 AI 生成命令描述
- 可选的本地 Web UI

---

## 作者

Built by Xuming.

个人站点：

- [https://dg.aluc.me](https://dg.aluc.me)

如果这个工具对你的 CLI 工作流有帮助，欢迎提 issue 或交流想法。
