# AI Command JSON Spec

Use this document when you want an AI to generate a JSON file that can be imported by:

```bash
tm --add ./your-command.json
```

This guide is meant for:

- maintainers of other CLI projects
- developers documenting internal scripts
- AI workflows that need to turn shell scripts or command repos into `tm` specs

## 1. What the AI should produce

The AI must output one valid JSON object that matches the `tm` manual command spec.

That JSON should describe a single command so `tool-manage` can store it inside the local sqlite registry.

## 2. Required output rules

The generated JSON must follow these rules:

1. Output JSON only
2. Do not add commentary before or after the JSON
3. Keep field names exactly as defined below
4. `schemaVersion` must stay `1`
5. Required fields must be non-empty:
   - `commandName`
   - `description`
   - `version`
   - `repository`
   - `author`
6. Optional unknown values may be `null`
7. If there is uncertainty, explain it in `notes`
8. `helpPreview` should be a readable multi-line usage block

## 3. Supported fields

Required:

- `schemaVersion`
- `commandName`
- `description`
- `version`
- `repository`
- `author`

Optional:

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

Alias rules:

- `scriptPath` is accepted as an alias of `commandPath`
- `usage` is accepted as an alias of `helpPreview`

Formatting rules:

- `keywords` may be an array or a comma-separated string
- `bin` may be a string or an object
- `engines` may be a string or an object
- `repository`, `author`, `homepage`, and `bugs` may use common `package.json` shapes

## 4. Field guidance for AI

The AI should infer or extract:

- the executable command name users actually type
- the main purpose of the command
- version information if it exists
- repository URL
- author or owning team
- important flags and options
- runtime requirements such as `bash`, `node`, or external tools
- example usage
- operational warnings or caveats

If a field is optional and cannot be confidently inferred, use `null`.

If a field is required but uncertain, fill the best available value and explain the uncertainty in `notes`.

## 5. Recommended prompt for AI

```md
You are given:
1. A shell script or CLI project
2. The spec for a tool-manage command JSON

Task:
- Read the command carefully
- Output one JSON object only
- Keep the schema exactly
- Fill required fields with real values
- Put uncertainty in notes
- Build a useful helpPreview with usage, options, and examples
```

## 6. Example JSON

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

## 7. Add and verify with tm

After the AI generates the JSON:

```bash
tm --add ./sync-notes.json
tm --show sync-notes
```

What to verify:

- the command name is correct
- description is meaningful
- version, repository, and author are present
- `helpPreview` is readable
- optional runtime notes are useful
