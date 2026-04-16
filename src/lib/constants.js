import os from "node:os";
import path from "node:path";

export const HELP_TIMEOUT_MS = 4000;
export const HELP_PREVIEW_LINES = 12;
export const APP_DIR = path.join(os.homedir(), ".tool-manage");
export const DATABASE_PATH = path.join(APP_DIR, "tool-manage.db");
export const LEGACY_REGISTRY_PATH = path.join(APP_DIR, "registry.json");
export const LEGACY_REGISTRY_BACKUP_PATH = path.join(APP_DIR, "registry.json.bak");
export const TEMPLATE_DIR = path.join(APP_DIR, "templates");
export const REQUIRED_MANUAL_FIELDS = [
  "description",
  "version",
  "repository",
  "author",
];
