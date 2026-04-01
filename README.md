# tool-manage

Register, inspect, list, and remove locally available CLI commands with `tm`.

`tool-manage` is designed for developers who have multiple local npm CLI tools installed and want a simple registry to keep track of them. It works especially well in a `pnpm`-based environment and can show command metadata such as description, version, repository, author, and `--help` output.

## Install

```bash
pnpm add -g @alucpro/tool-manage
```

This package only supports `pnpm`.

## Usage

```bash
tm --help
tm
tm --register pom
tm --remove pom
```

## Commands

```bash
tm --help
tm --version
tm --register <command>
tm --remove <command>
tm --list
```

## Features

- `tm --help` shows usage plus package metadata
- `tm --register <command>` registers a command into the local registry
- `tm --list` or bare `tm` lists all registered commands
- `tm --remove <command>` removes a registered command
- command listing includes `--help` output, description, version, repository, and author when available
- only `pnpm` is supported for installation

## Examples

Register a locally available command:

```bash
tm -r pom
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

- registered command names are stored in `~/.tool-manage/registry.json`
- `tm` resolves each command from your local `PATH`
- when available, `tm` reads the command package metadata from its `package.json`
- `tm` also executes `<command> --help` to display a help preview in the list view

## Local Development

```bash
pnpm install
pnpm start -- --help
pnpm start -- --register pom
pnpm start -- --list
```

## Publish

Before publishing, make sure you are logged in to npm and the package name is still available:

```bash
npm whoami
npm view @alucpro/tool-manage version --registry=https://registry.npmjs.org/
pnpm publish --access public
```
