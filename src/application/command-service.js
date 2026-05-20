import fs from "node:fs";
import path from "node:path";
import { confirm, intro, note, outro, spinner } from "@clack/prompts";
import { collectDetectedMetadata, commandExists } from "../lib/command-discovery.js";
import { openEditor } from "../lib/editor.js";
import { REQUIRED_MANUAL_FIELDS } from "../lib/constants.js";
import { loadManualSpec } from "../lib/manual-command-spec.js";
import { inferMetadataSource } from "../lib/metadata.js";
import { getProjectMeta } from "../lib/package-meta.js";
import {
  getCommandByName,
  listCommands as listCommandRecords,
  removeCommand as removeCommandRecord,
  saveOverrides,
  upsertCommand,
} from "../data/command-repository.js";
import { readTemplate, writeTemplate } from "../data/template-store.js";

function isHttpUrl(value) {
  return /^https?:\/\//i.test(String(value ?? "").trim());
}

function looksLikeFileInput(value) {
  return /\.json$/i.test(value) || value.includes("/") || value.startsWith(".");
}

function requireCommandName(commandName, action) {
  if (!commandName) {
    throw new Error(`Missing command name for ${action}.`);
  }
}

function ensureNotSelf(commandName) {
  if (commandName === "tm") {
    throw new Error("You cannot register `tm` itself.");
  }
}

function buildTemplatePayload(commandName, mergedRecord, missingFields = []) {
  return {
    commandName,
    description: mergedRecord.description ?? "",
    version: mergedRecord.version ?? "",
    repository: mergedRecord.repository ?? "",
    author: mergedRecord.author ?? "",
    homepage: mergedRecord.homepage ?? "",
    bugs: mergedRecord.bugs ?? "",
    license: mergedRecord.license ?? "",
    keywords: mergedRecord.keywords ?? "",
    bin: mergedRecord.bin ?? "",
    engines: mergedRecord.engines ?? "",
    notes: mergedRecord.notes ?? "",
    requiredFields: missingFields,
    instructions: "Fill in any missing values, save the file, then return to the terminal.",
  };
}

function getMissingFields(record) {
  return REQUIRED_MANUAL_FIELDS.filter((field) => !record[field]);
}

function normalizeManualPayload(payload, fallbackCommandName) {
  const commandName = String(payload.commandName ?? fallbackCommandName ?? "").trim();

  if (!commandName) {
    throw new Error("Template is missing `commandName`.");
  }

  return {
    commandName,
    description: String(payload.description ?? "").trim(),
    version: String(payload.version ?? "").trim(),
    repository: String(payload.repository ?? "").trim(),
    author: String(payload.author ?? "").trim(),
    homepage: String(payload.homepage ?? "").trim(),
    bugs: String(payload.bugs ?? "").trim(),
    license: String(payload.license ?? "").trim(),
    keywords: String(payload.keywords ?? "").trim(),
    bin: String(payload.bin ?? "").trim(),
    engines: String(payload.engines ?? "").trim(),
    notes: String(payload.notes ?? "").trim(),
  };
}

async function runEditableTemplateFlow(
  commandName,
  currentRecord,
  missingFields,
  title,
  mode
) {
  intro(title);
  const templatePath = writeTemplate(
    commandName,
    buildTemplatePayload(commandName, currentRecord, missingFields)
  );

  note(templatePath, "Metadata template");

  const opened = openEditor(templatePath);

  if (!opened) {
    note(
      "No editor was launched automatically. Open the file, save your changes, then return here.",
      "Editor fallback"
    );
  }

  let shouldContinue = true;

  if (process.stdin.isTTY && process.stdout.isTTY) {
    shouldContinue = await confirm({
      message: "Have you finished editing the metadata template?",
      initialValue: true,
    });
  } else if (!opened) {
    throw new Error(`Template saved at ${templatePath}. Edit it, then rerun the command.`);
  }

  if (!shouldContinue) {
    throw new Error(`Template saved at ${templatePath}. Re-run the command after editing it.`);
  }

  const { payload } = readTemplate(commandName);
  const manualValues = normalizeManualPayload(payload, commandName);

  for (const field of missingFields) {
    if (!manualValues[field]) {
      throw new Error(`Template field "${field}" is required before registration can complete.`);
    }
  }

  const saved = await saveOverrides(commandName, manualValues);
  outro(`Saved manual metadata for "${commandName}".`);

  return {
    command: saved,
    templatePath,
    wasManualEdit: true,
    missingFields,
    mode,
  };
}

function buildGeneratedTemplate(commandName = "") {
  return {
    schemaVersion: 1,
    commandName,
    description: "",
    version: "",
    repository: "",
    author: "",
    helpPreview: "",
  };
}

export async function createCommandService() {
  const projectMeta = getProjectMeta();

  return {
    getProjectMeta() {
      return projectMeta;
    },

    async listCommands() {
      return listCommandRecords();
    },

    async inspectCommand(commandName) {
      requireCommandName(commandName, "inspection");
      const command = await getCommandByName(commandName);

      if (!command) {
        throw new Error(`Command "${commandName}" is not registered.`);
      }

      return command;
    },

    async addCommand(input) {
      const normalizedInput = String(input ?? "").trim();

      if (!normalizedInput) {
        throw new Error("Missing command name or JSON file path for add.");
      }

      if (isHttpUrl(normalizedInput) || fs.existsSync(path.resolve(normalizedInput))) {
        return this.addCommandFromSpec(normalizedInput);
      }

      if (!commandExists(normalizedInput)) {
        if (looksLikeFileInput(normalizedInput)) {
          throw new Error(`Manual spec file was not found: ${path.resolve(normalizedInput)}`);
        }

        throw new Error(
          `Input "${normalizedInput}" is neither a local JSON spec nor a command available in your PATH.`
        );
      }

      return this.registerCommand(normalizedInput, { mode: "add" });
    },

    async registerCommand(commandName, options = {}) {
      requireCommandName(commandName, "registration");
      ensureNotSelf(commandName);

      if (!commandExists(commandName)) {
        throw new Error(`Command "${commandName}" was not found in your PATH.`);
      }

      const progress = spinner();
      progress.start(`Inspecting "${commandName}"`);
      const detected = collectDetectedMetadata(commandName);
      const baseRecord = await upsertCommand({
        ...detected,
        metadataSource: "detected",
      });
      progress.stop(`Saved detected metadata for "${commandName}"`);

      const missingFields = getMissingFields(baseRecord);

      if (missingFields.length > 0) {
        return runEditableTemplateFlow(
          commandName,
          baseRecord,
          missingFields,
          `Complete metadata for "${commandName}"`,
          options.mode ?? "register"
        );
      }

      return {
        command: baseRecord,
        templatePath: null,
        wasManualEdit: false,
        missingFields: [],
        mode: options.mode ?? "register",
      };
    },

    async addCommandFromSpec(specSource) {
      const progress = spinner();
      progress.start("Loading manual command spec");
      const { source, spec } = await loadManualSpec(specSource);

      ensureNotSelf(spec.commandName);

      const saved = await upsertCommand({
        ...spec,
        metadataSource: "manual",
      });
      progress.stop(`Added manual command "${spec.commandName}"`);

      return {
        command: saved,
        templatePath: null,
        wasManualEdit: false,
        missingFields: [],
        mode: "add",
        source,
      };
    },

    async editCommand(commandName) {
      requireCommandName(commandName, "edit");
      const command = await getCommandByName(commandName);

      if (!command) {
        throw new Error(`Command "${commandName}" is not registered.`);
      }

      return runEditableTemplateFlow(
        commandName,
        command,
        [],
        `Edit metadata for "${commandName}"`,
        "edit"
      );
    },

    async refreshCommand(commandName) {
      requireCommandName(commandName, "refresh");
      const existing = await getCommandByName(commandName);

      if (!existing) {
        throw new Error(`Command "${commandName}" is not registered.`);
      }

      if (!commandExists(commandName)) {
        throw new Error(`Command "${commandName}" was not found in your PATH.`);
      }

      const progress = spinner();
      progress.start(`Refreshing "${commandName}"`);
      const detected = collectDetectedMetadata(commandName);
      const overrides = Object.entries(existing.overrides ?? {}).map(([fieldName, fieldValue]) => ({
        field_name: fieldName,
        field_value: fieldValue,
      }));

      const refreshed = await upsertCommand({
        ...detected,
        metadataSource: inferMetadataSource(detected, overrides),
      });
      progress.stop(`Refreshed detected metadata for "${commandName}"`);

      return {
        command: refreshed,
        templatePath: null,
        wasManualEdit: false,
        missingFields: getMissingFields(refreshed),
        mode: "refresh",
      };
    },

    async updateCommand(commandName) {
      const result = await this.refreshCommand(commandName);
      return {
        ...result,
        mode: "update",
      };
    },

    async removeCommand(commandName) {
      requireCommandName(commandName, "removal");
      const removed = await removeCommandRecord(commandName);

      if (!removed) {
        throw new Error(`Command "${commandName}" is not registered.`);
      }

      return { commandName };
    },

    async generateTemplate(commandName) {
      const normalizedCommandName = String(commandName ?? "").trim();
      const targetName = normalizedCommandName || `tm-command-${Date.now()}`;

      if (normalizedCommandName) {
        const existing = await getCommandByName(normalizedCommandName);
        if (existing) {
          throw new Error(`Command "${normalizedCommandName}" is already registered.`);
        }
      }

      const outputPath = path.resolve(`${targetName}.json`);
      const payload = buildGeneratedTemplate(normalizedCommandName);
      fs.writeFileSync(outputPath, `${JSON.stringify(payload, null, 2)}\n`, "utf8");

      return {
        commandName: normalizedCommandName || null,
        filePath: outputPath,
        payload,
      };
    },
  };
}
