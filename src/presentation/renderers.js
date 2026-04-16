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
  console.log("  tm --register <command>");
  console.log("  tm --show <command>");
  console.log("  tm --edit <command>");
  console.log("  tm --refresh <command>");
  console.log("  tm --remove <command>");

  printSection("Options");
  console.log("  -h, --help          Show help and project metadata");
  console.log("  -v, --version       Show the current version");
  console.log("  -r, --register      Register a local command");
  console.log("  -l, --list          List all registered commands");
  console.log("  -s, --show          Show a registered command in detail");
  console.log("  -e, --edit          Edit stored metadata for a command");
  console.log("      --refresh       Re-detect runtime metadata and keep overrides");
  console.log("  -d, --remove        Remove a registered command");

  printSection("Examples");
  console.log("  tm");
  console.log("  tm --register pom");
  console.log("  tm --show pom");
  console.log("  tm --edit pom");
  console.log("  tm --refresh pom");
  console.log("  tm --remove pom");
}

export function printList(commands) {
  if (commands.length === 0) {
    console.log("No commands registered yet.");
    console.log("Use `tm --register <command>` to add one.");
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
  printKeyValue("Description", command.description, "  ");
  printKeyValue("Version", command.version, "  ");
  printKeyValue("Repository", command.repository, "  ");
  printKeyValue("Author", command.author, "  ");
  printKeyValue("Homepage", command.homepage, "  ");
  printKeyValue("Bugs", command.bugs, "  ");
  printKeyValue("License", command.license, "  ");
  printKeyValue("Keywords", command.keywords, "  ");
  printKeyValue("Bin", command.bin, "  ");
  printKeyValue("Engines", command.engines, "  ");
  printKeyValue("Metadata Source", command.metadataSource, "  ");
  printKeyValue("Command Path", command.commandPath, "  ");
  printKeyValue("Package", command.packageName, "  ");
  printKeyValue("Package JSON", command.packageJsonPath, "  ");
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
  } else if (result.mode === "edit") {
    suffix = "Updated stored metadata.";
  } else if (result.mode === "refresh") {
    suffix = "Refreshed detected metadata.";
  }

  console.log(suffix);
  printCommandDetail(result.command);

  if (result.templatePath) {
    printSection("Template");
    console.log(result.templatePath);
  }
}

export function printRemovalResult(result) {
  console.log(`Removed command "${result.commandName}".`);
}
