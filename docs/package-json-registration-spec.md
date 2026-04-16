# package.json Registration Spec for `tool-manage`

Use this file as a copyable ruleset in another repository when you want AI to generate or repair a `package.json` so the project can be registered cleanly by `tm`.

The goal is not "any valid package.json". The goal is a package.json that gives `tool-manage` stable, human-usable metadata when it inspects a locally installed CLI command.

## What `tm` reads

`tm` primarily relies on these fields when it discovers a command:

- `name`
- `version`
- `description`
- `author`
- `repository`
- `bin`

These fields should always be present and meaningful for a CLI package.

## Required rules

The generated or repaired `package.json` must satisfy all of the rules below.

1. It must be valid JSON.
2. It must describe a CLI package, not only a library package.
3. It must include a non-empty `name`.
4. It must include a non-empty `version`.
5. It must include a non-empty one-line `description`.
6. It must include `type: "module"` unless the repository already clearly uses CommonJS.
7. It must include a valid `bin` mapping that points to the real executable file.
8. It must include a non-empty `author`.
9. It must include a valid `repository` object with:
   - `type`
   - `url`
10. It must include `engines.node` with a legal semver range.
11. It must not include placeholder values such as:
   - `"TODO"`
   - `"your-name"`
   - `"example"`
   - `"test"`
   - empty strings for required fields
12. It must keep `name`, `bin`, and the actual CLI entry file aligned.

## Field rules

### `name`

- Must be a legal npm package name.
- Prefer a scoped name if the project already belongs to an org or namespace.
- Must match the actual package being published or installed.

Good:

```json
"name": "@acme/project-cli"
```

Bad:

```json
"name": "TODO"
```

### `version`

- Must be a legal semver string.
- Default to `"0.1.0"` for a new unpublished CLI if no version is specified.

### `description`

- Must be one sentence.
- Must describe the CLI's actual purpose.
- Must not be generic filler like `"A CLI tool"` unless that is truly the best known description.

Good:

```json
"description": "Generate and manage Acme deployment manifests from the terminal."
```

### `author`

- Must be a real human or organization string.
- Prefer one of these shapes:

```json
"author": "Your Name <email@example.com>"
```

or

```json
"author": "Acme"
```

### `repository`

- Prefer the object form, not a bare string.
- `url` should be a real Git URL.
- Prefer `git+https://...` for GitHub-style repositories.

Good:

```json
"repository": {
  "type": "git",
  "url": "git+https://github.com/acme/project-cli.git"
}
```

### `bin`

- Must map the terminal command name to the real entry file.
- The command name should be the executable users will type.
- The path should point at the actual CLI entrypoint in the repo.

Good:

```json
"bin": {
  "acme": "./src/cli.js"
}
```

Bad:

```json
"bin": {
  "acme": "./index.js"
}
```

if `./index.js` is not the real executable.

### `engines`

- Must include at least:

```json
"engines": {
  "node": ">=18"
}
```

- If the repo already depends on a newer minimum Node version, use the true version instead of forcing `>=18`.

### `files`

- If the package is publishable, include the shipped runtime files.
- For a simple CLI package, prefer:

```json
"files": [
  "src"
]
```

- Only include additional paths when they are actually needed at runtime.

### `scripts`

For a simple Node CLI, prefer these scripts unless the repo already has a stronger convention:

```json
"scripts": {
  "start": "node ./src/cli.js",
  "dev": "node ./src/cli.js --help",
  "check": "node ./src/cli.js --help"
}
```

### `keywords`

- Include a short set of real discovery keywords.
- Prefer 4-8 items.
- Include the command or domain name when useful.

## Recommended default shape

Use this as the default output when creating a new CLI package and no stronger repo convention exists:

```json
{
  "name": "<legal-package-name>",
  "version": "0.1.0",
  "description": "<one-line-real-description>",
  "type": "module",
  "private": false,
  "bin": {
    "<command-name>": "./src/cli.js"
  },
  "files": [
    "src"
  ],
  "license": "MIT",
  "author": "<real-author>",
  "homepage": "<real-homepage-url>",
  "repository": {
    "type": "git",
    "url": "git+<real-repository-url>"
  },
  "bugs": {
    "url": "<real-issues-url>"
  },
  "engines": {
    "node": ">=18"
  },
  "packageManager": "pnpm@latest",
  "scripts": {
    "start": "node ./src/cli.js",
    "dev": "node ./src/cli.js --help",
    "check": "node ./src/cli.js --help"
  },
  "keywords": [
    "cli",
    "node",
    "npm",
    "<command-name>"
  ]
}
```

## AI instructions

When using this spec in another repository, the AI should follow this process:

1. Inspect the repo to find the real CLI entry file.
2. Inspect the repo to determine whether it is ESM or CommonJS.
3. Infer the actual command name from existing docs, scripts, or user instruction.
4. Repair only the fields needed to make the file valid and registration-friendly.
5. Preserve already-correct real values.
6. Replace placeholders with legal real values.
7. Never invent fake URLs, fake authors, or fake package names if the repo does not provide them.
8. If a required real value cannot be inferred, leave a clearly marked TODO only in the planning step, not in the final package.json.

## Fast checklist

Before finalizing `package.json`, verify:

- `name` is legal
- `version` is legal semver
- `description` is real and non-empty
- `author` is non-empty
- `repository.url` is real
- `bin` points to the real executable
- `engines.node` is set
- JSON parses successfully
- there are no placeholder strings left in required fields
