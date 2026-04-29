#!/usr/bin/env node

import process from "node:process";
import { createCommandService } from "./application/command-service.js";
import {
  exitWithError,
  printCommandDetail,
  printHelp,
  printList,
  printRegistrationResult,
  printRemovalResult,
} from "./presentation/renderers.js";

function parseArgs(args) {
  const [first, second] = args;

  if (!first) {
    return { action: "list" };
  }

  if (first === "-h" || first === "--help" || first === "help") {
    return { action: "help" };
  }

  if (first === "-v" || first === "--version" || first === "version") {
    return { action: "version" };
  }

  if (first === "-l" || first === "--list" || first === "list") {
    return { action: "list" };
  }

  if (first === "-r" || first === "--register" || first === "register") {
    return { action: "register", commandName: second };
  }

  if (first === "-a" || first === "--add" || first === "add") {
    return { action: "add", source: second };
  }

  if (first === "-e" || first === "--edit" || first === "edit") {
    return { action: "edit", commandName: second };
  }

  if (first === "-s" || first === "--show" || first === "show") {
    return { action: "show", commandName: second };
  }

  if (first === "--refresh" || first === "refresh") {
    return { action: "refresh", commandName: second };
  }

  if (
    first === "-d" ||
    first === "--remove" ||
    first === "--unregister" ||
    first === "remove" ||
    first === "unregister"
  ) {
    return { action: "remove", commandName: second };
  }

  return { action: "unknown", value: first };
}

async function main(argv) {
  const parsed = parseArgs(argv.slice(2));
  const service = await createCommandService();

  if (parsed.action === "help") {
    printHelp(service.getProjectMeta());
    return;
  }

  if (parsed.action === "version") {
    console.log(service.getProjectMeta().version);
    return;
  }

  if (parsed.action === "list") {
    const commands = await service.listCommands();
    printList(commands);
    return;
  }

  if (parsed.action === "register") {
    const result = await service.registerCommand(parsed.commandName);
    printRegistrationResult(result);
    return;
  }

  if (parsed.action === "add") {
    const result = await service.addCommandFromSpec(parsed.source);
    printRegistrationResult(result);
    return;
  }

  if (parsed.action === "edit") {
    const result = await service.editCommand(parsed.commandName);
    printRegistrationResult(result);
    return;
  }

  if (parsed.action === "show") {
    const command = await service.inspectCommand(parsed.commandName);
    printCommandDetail(command);
    return;
  }

  if (parsed.action === "refresh") {
    const result = await service.refreshCommand(parsed.commandName);
    printRegistrationResult(result);
    return;
  }

  if (parsed.action === "remove") {
    const result = await service.removeCommand(parsed.commandName);
    printRemovalResult(result);
    return;
  }

  exitWithError(`Unknown option or command "${parsed.value}".`);
}

main(process.argv).catch((error) => {
  exitWithError(error.message);
});
