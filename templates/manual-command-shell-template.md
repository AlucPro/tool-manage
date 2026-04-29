# Shell Script To `tm` JSON Template

Use this document together with `templates/manual-command.template.json`.

Give both files to AI, then paste in the shell script and ask AI to output a completed `xxx.json` that matches the template exactly.

## Goal

Generate a valid manual command spec JSON for `tm --add`.

## Output Rules

- Output JSON only.
- Keep the same field names as `manual-command.template.json`.
- `schemaVersion` must stay `1`.
- Required fields: `commandName`, `description`, `version`, `repository`, `author`.
- If a value is unknown, use `null` for optional fields and explain uncertainty inside `notes`.
- `helpPreview` should be a readable multi-line usage block assembled from the script behavior.
- `commandPath` should be the real absolute path if known. If unknown, use `null`.
- `keywords` should be a short array of practical search terms.
- `bin` should normally be the executable command name.
- `engines` should describe the runtime when it is clear, for example `{ "bash": ">=4.0" }` or `{ "sh": "POSIX" }`.

## What To Read From The Shell Script

Extract and infer these items:

- command name
- main purpose
- input arguments
- flags and options
- required environment variables
- dependent tools or runtimes
- typical usage examples
- side effects, file writes, network calls, or destructive behavior

## Suggested Prompt

```md
You are given:
1. A shell script
2. A JSON template for `tm --add`

Task:
- Read the shell script carefully.
- Fill the JSON template with the script's metadata.
- Return JSON only.
- Preserve the exact schema and field names.
- Put uncertainties into `notes`.
- Build a useful `helpPreview` with usage, options, and examples.
```

## Checklist Before Using `tm --add`

- `commandName` matches the real executable name you want to manage in `tm`
- JSON is valid
- required fields are filled
- `helpPreview` is readable
- paths and URLs are accurate
