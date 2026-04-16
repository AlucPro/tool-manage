import { HELP_PREVIEW_LINES } from "./constants.js";

export function formatRepository(repository) {
  if (!repository) {
    return null;
  }

  if (typeof repository === "string") {
    return repository;
  }

  return repository.url ?? null;
}

export function formatAuthor(author) {
  if (!author) {
    return null;
  }

  if (typeof author === "string") {
    return author;
  }

  const segments = [author.name, author.email, author.url].filter(Boolean);
  return segments.join(" | ") || null;
}

export function normalizeRepositoryUrl(repository) {
  const raw = formatRepository(repository);
  if (!raw) {
    return null;
  }

  if (raw.startsWith("git+ssh://git@github.com/")) {
    return raw.replace("git+ssh://git@github.com/", "https://github.com/");
  }

  if (raw.startsWith("git@github.com:")) {
    return `https://github.com/${raw.slice("git@github.com:".length)}`;
  }

  return raw.replace(/^git\+/, "");
}

export function displayValue(value) {
  return value && String(value).trim() ? String(value).trim() : "N/A";
}

export function formatHelpPreview(helpText) {
  const lines = String(helpText || "No help output was returned.").split("\n");
  const preview = lines.slice(0, HELP_PREVIEW_LINES);
  const truncated = lines.length > HELP_PREVIEW_LINES;
  const formatted = preview.map((line) => `  ${line}`);

  if (truncated) {
    formatted.push("  ...");
  }

  return formatted.join("\n");
}

export function toTimestamp() {
  return new Date().toISOString();
}

export function inferMetadataSource(baseRecord, overrides) {
  const hasDetectedValues = [
    baseRecord.description,
    baseRecord.version,
    baseRecord.repository,
    baseRecord.author,
  ].some(Boolean);
  const hasManualValues = overrides.length > 0;

  if (hasDetectedValues && hasManualValues) {
    return "mixed";
  }

  if (hasManualValues) {
    return "manual";
  }

  return "detected";
}
