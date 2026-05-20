import process from "node:process";
import Table from "cli-table3";
import {
  displayValue,
  formatHelpPreview,
  normalizeRepositoryUrl,
} from "../lib/metadata.js";

export function exitWithError(message) {
  console.error(`Error: ${message}`);
  console.error("Run `tm --help` to see available commands.");
  process.exit(1);
}

function printSection(title) {
  console.log("");
  console.log(title);
}

function printKeyValue(label, value, indent = "") {
  const normalizedLabel = `${label}:`.padEnd(18, " ");
  console.log(`${indent}${normalizedLabel}${displayValue(value)}`);
}

function hasDisplayValue(value) {
  return value !== null && value !== undefined && String(value).trim() !== "";
}

function printOptionalKeyValue(label, value, indent = "") {
  if (!hasDisplayValue(value)) {
    return;
  }

  printKeyValue(label, value, indent);
}

function formatUpdatedAt(value) {
  if (!value) {
    return "N/A";
  }

  return value.replace("T", " ").replace(/\.\d+Z$/, "Z");
}

export function printHelp(projectMeta) {
  console.log(`${projectMeta.name} v${projectMeta.version}`);
  console.log(projectMeta.description);

  printSection("Project");
  printKeyValue(
    "Repository",
    typeof projectMeta.repository === "string"
      ? projectMeta.repository
      : normalizeRepositoryUrl(projectMeta.repository)
  );
  printKeyValue("Author", projectMeta.author);

  printSection("Usage");
  console.log("  tm");
  console.log("  tm --add <command-or-json>");
  console.log("  tm --show <command>");
  console.log("  tm --edit <command>");
  console.log("  tm --update <command>");
  console.log("  tm --remove <command>");
  console.log("  tm --generate [command]");

  printSection("Options");
  console.log("  -h, --help          Show help and project metadata");
  console.log("  -v, --version       Show the current version");
  console.log("  -a, --add           Add from PATH command discovery or a JSON spec");
  console.log("  -l, --list          List all registered commands");
  console.log("  -s, --show          Show a registered command in detail");
  console.log("  -e, --edit          Edit stored metadata for a command");
  console.log("  -u, --update        Re-detect runtime metadata and keep overrides");
  console.log("  -d, --remove        Remove a registered command");
  console.log("  -g, --generate      Generate a minimal JSON spec template");

  printSection("Examples");
  console.log("  tm");
  console.log("  tm --add pnpm");
  console.log("  tm --add ./templates/manual-command.template.json");
  console.log("  tm --show pom");
  console.log("  tm --edit pom");
  console.log("  tm --update pom");
  console.log("  tm --remove pom");
  console.log("  tm --generate sync-notes");
}

export function printList(commands) {
  if (commands.length === 0) {
    console.log("No commands registered yet.");
    console.log("Use `tm --add <command-or-json>` to add one.");
    return;
  }

  const table = new Table({
    head: ["Command", "Description", "Version", "Source", "Updated"],
    wordWrap: true,
    colWidths: [18, 42, 12, 12, 22],
  });

  for (const command of commands) {
    table.push([
      command.commandName,
      displayValue(command.description),
      displayValue(command.version),
      displayValue(command.metadataSource),
      formatUpdatedAt(command.updatedAt),
    ]);
  }

  console.log(`Registered Commands (${commands.length})`);
  console.log(table.toString());
}

export function printCommandDetail(command) {
  console.log(`Command: ${command.commandName}`);
  printOptionalKeyValue("Description", command.description, "  ");
  printOptionalKeyValue("Version", command.version, "  ");
  printOptionalKeyValue("Repository", command.repository, "  ");
  printOptionalKeyValue("Author", command.author, "  ");
  printOptionalKeyValue("Homepage", command.homepage, "  ");
  printOptionalKeyValue("Bugs", command.bugs, "  ");
  printOptionalKeyValue("License", command.license, "  ");
  printOptionalKeyValue("Keywords", command.keywords, "  ");
  printOptionalKeyValue("Bin", command.bin, "  ");
  printOptionalKeyValue("Engines", command.engines, "  ");
  printOptionalKeyValue("Metadata Source", command.metadataSource, "  ");
  printOptionalKeyValue("Command Path", command.commandPath, "  ");
  printOptionalKeyValue("Package", command.packageName, "  ");
  printOptionalKeyValue("Package JSON", command.packageJsonPath, "  ");
  printKeyValue("Updated", formatUpdatedAt(command.updatedAt), "  ");

  if (command.notes) {
    printKeyValue("Notes", command.notes, "  ");
  }

  printSection("Help Preview");
  console.log(formatHelpPreview(command.helpPreview));
}

export function printRegistrationResult(result) {
  let suffix = "Saved command metadata.";

  if (result.mode === "register") {
    suffix = result.wasManualEdit
      ? "Registered with manual metadata completion."
      : "Registered with detected metadata.";
  } else if (result.mode === "add") {
    suffix = result.source
      ? "Added command from manual JSON spec."
      : result.wasManualEdit
        ? "Added command with manual metadata completion."
        : "Added command.";
  } else if (result.mode === "edit") {
    suffix = "Updated stored metadata.";
  } else if (result.mode === "refresh") {
    suffix = "Refreshed detected metadata.";
  } else if (result.mode === "update") {
    suffix = "Updated command metadata from runtime detection.";
  }

  console.log(suffix);
  printCommandDetail(result.command);

  if (result.templatePath) {
    printSection("Template");
    console.log(result.templatePath);
  }

  if (result.source) {
    printSection("Source");
    console.log(result.source);
  }
}

export function printRemovalResult(result) {
  console.log(`Removed command "${result.commandName}".`);
}

export function printGenerationResult(result) {
  console.log("Generated manual command spec template.");
  printSection("File");
  console.log(result.filePath);
}
