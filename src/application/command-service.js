import { confirm, intro, note, outro, spinner } from "@clack/prompts";
import { collectDetectedMetadata, commandExists } from "../lib/command-discovery.js";
import { openEditor } from "../lib/editor.js";
import { REQUIRED_MANUAL_FIELDS } from "../lib/constants.js";
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

    async registerCommand(commandName) {
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
          "register"
        );
      }

      return {
        command: baseRecord,
        templatePath: null,
        wasManualEdit: false,
        missingFields: [],
        mode: "register",
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

    async removeCommand(commandName) {
      requireCommandName(commandName, "removal");
      const removed = await removeCommandRecord(commandName);

      if (!removed) {
        throw new Error(`Command "${commandName}" is not registered.`);
      }

      return { commandName };
    },
  };
}
