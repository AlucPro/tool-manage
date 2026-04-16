import fs from "node:fs";
import path from "node:path";
import { TEMPLATE_DIR } from "../lib/constants.js";

function sanitizeCommandName(commandName) {
  return commandName.replace(/[^a-zA-Z0-9_-]+/g, "-");
}

export function getTemplatePath(commandName) {
  const safeName = sanitizeCommandName(commandName);
  return path.join(TEMPLATE_DIR, `${safeName}.metadata.json`);
}

export function writeTemplate(commandName, payload) {
  const filePath = getTemplatePath(commandName);
  fs.writeFileSync(`${filePath}`, `${JSON.stringify(payload, null, 2)}\n`, "utf8");
  return filePath;
}

export function readTemplate(commandName) {
  const filePath = getTemplatePath(commandName);
  const raw = fs.readFileSync(filePath, "utf8");
  return { filePath, payload: JSON.parse(raw) };
}
