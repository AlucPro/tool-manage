import { spawnSync } from "node:child_process";

export function openEditor(filePath) {
  const editor = process.env.VISUAL || process.env.EDITOR;
  if (!editor) {
    return false;
  }

  const needsShell = /[\s"'`|&;<>()$]/.test(editor);
  const result = needsShell
    ? spawnSync(`${editor} "${filePath.replace(/"/g, '\\"')}"`, {
        stdio: "inherit",
        shell: true,
      })
    : spawnSync(editor, [filePath], {
        stdio: "inherit",
      });

  return result.status === 0;
}
