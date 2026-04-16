# Manual npm Publish

Use this file when you want to publish `@alucpro/tool-manage` manually from your own terminal.

## 1. Pre-checks

Confirm your npm login:

```bash
npm whoami
```

Check the current published version:

```bash
npm view @alucpro/tool-manage version --registry=https://registry.npmjs.org/
```

If you need to inspect package access for the current account:

```bash
npm access ls-packages
```

## 2. Publish command

Run this from the repository root:

```bash
npm publish --access public --registry=https://registry.npmjs.org/
```

If your local npm cache has permission problems, use a temporary cache directory:

```bash
npm publish --access public --registry=https://registry.npmjs.org/ --cache /tmp/tm-npm-cache
```

## 3. Common failures

### Not logged in

If you see `ENEEDAUTH`, log in first:

```bash
npm login
```

Then rerun:

```bash
npm whoami
npm publish --access public --registry=https://registry.npmjs.org/
```

### Cache permission problem

If you see cache errors under `~/.npm`, either fix the directory ownership or publish with a temporary cache:

```bash
npm publish --access public --registry=https://registry.npmjs.org/ --cache /tmp/tm-npm-cache
```

### Scope or permission problem

If you see a `404` or permission-related publish failure for `@alucpro/tool-manage`, confirm that the current npm account has publish access to the `@alucpro` scope.

Useful checks:

```bash
npm whoami
npm access ls-packages
npm view @alucpro/tool-manage --registry=https://registry.npmjs.org/
```

## 4. Recommended release flow

Run these in order:

```bash
git status
node ./src/cli.js --help
npm whoami
npm view @alucpro/tool-manage version --registry=https://registry.npmjs.org/
npm publish --access public --registry=https://registry.npmjs.org/
```
