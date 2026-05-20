# AI 命令 JSON 规范

这份文档用于让 AI 生成一个可以被下面这条命令直接导入的 JSON 文件：

```bash
tm --add ./your-command.json
```

适用对象：

- 其他 CLI 项目的维护者
- 需要整理内部脚本的开发者
- 想把 shell 脚本或命令仓库交给 AI 自动生成 `tm` 描述文件的人

## 1. AI 需要产出什么

AI 必须输出一个合法 JSON 对象，并且这个对象要符合 `tool-manage` 的手工命令描述格式。

这个 JSON 只描述一个命令，后续会被 `tm` 写入本地 sqlite 注册表中。

## 2. 输出规则

AI 生成结果必须满足以下规则：

1. 只输出 JSON
2. JSON 前后不要附加解释文字
3. 字段名必须严格使用本文规定的名字
4. `schemaVersion` 必须保持为 `1`
5. 以下必填字段不能为空：
   - `commandName`
   - `description`
   - `version`
   - `repository`
   - `author`
6. 可选字段如果无法确定，可以写 `null`
7. 如果有不确定信息，写进 `notes`
8. `helpPreview` 应该是可读的多行帮助说明

## 3. 支持字段

必填字段：

- `schemaVersion`
- `commandName`
- `description`
- `version`
- `repository`
- `author`

可选字段：

- `commandPath`
- `scriptPath`
- `packageName`
- `packageJsonPath`
- `homepage`
- `bugs`
- `license`
- `keywords`
- `bin`
- `engines`
- `notes`
- `helpPreview`
- `usage`

别名规则：

- `scriptPath` 可以作为 `commandPath` 的别名
- `usage` 可以作为 `helpPreview` 的别名

格式规则：

- `keywords` 可以是数组，也可以是逗号分隔字符串
- `bin` 可以是字符串，也可以是对象
- `engines` 可以是字符串，也可以是对象
- `repository`、`author`、`homepage`、`bugs` 可以使用常见的 `package.json` 结构

## 4. AI 应该重点提取什么

AI 应该尽量从脚本或项目中提取/推断这些内容：

- 用户真正会输入的命令名
- 命令的核心用途
- 版本信息
- 仓库地址
- 作者或维护团队
- 关键参数和选项
- 运行时依赖，例如 `bash`、`node` 或外部命令
- 典型使用方式
- 风险、注意事项、环境变量或副作用

如果某个字段是可选的，并且确实无法确定，就使用 `null`。

如果某个字段是必填的，但只能近似推断，请填写最合理的值，并在 `notes` 中说明不确定性。

## 5. 推荐喂给 AI 的提示词

```md
你会拿到：
1. 一个 shell 脚本或 CLI 项目
2. 一份 tool-manage 命令 JSON 规范

任务：
- 仔细阅读命令实现
- 只输出一个 JSON 对象
- 严格保持 schema
- 必填字段必须填写真实可用的值
- 不确定信息放到 notes
- 生成一个可读的 helpPreview，包含 usage、options 和 examples
```

## 6. 示例 JSON

```json
{
  "schemaVersion": 1,
  "commandName": "sync-notes",
  "commandPath": "/Users/alucard/bin/sync-notes.sh",
  "packageName": null,
  "packageJsonPath": null,
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

## 7. 生成后如何通过 tm 添加和验证

AI 生成完 JSON 之后，可以这样验证：

```bash
tm --add ./sync-notes.json
tm --show sync-notes
```

重点检查：

- 命令名是否正确
- 描述是否清楚
- `version`、`repository`、`author` 是否完整
- `helpPreview` 是否可读
- `notes` 是否提供了真正有用的上下文
