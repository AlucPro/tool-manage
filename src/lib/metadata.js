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

export function formatUrlField(value) {
  if (!value) {
    return null;
  }

  if (typeof value === "string") {
    return value;
  }

  return value.url ?? null;
}

export function formatBin(bin) {
  if (!bin) {
    return null;
  }

  if (typeof bin === "string") {
    return bin;
  }

  if (typeof bin === "object") {
    const entries = Object.entries(bin)
      .filter(([, value]) => value)
      .map(([commandName, filePath]) => `${commandName}: ${filePath}`);

    return entries.length > 0 ? entries.join(", ") : null;
  }

  return null;
}

export function formatEngines(engines) {
  if (!engines || typeof engines !== "object") {
    return null;
  }

  const entries = Object.entries(engines)
    .filter(([, value]) => value)
    .map(([name, version]) => `${name}: ${version}`);

  return entries.length > 0 ? entries.join(", ") : null;
}

export function formatKeywords(keywords) {
  if (!Array.isArray(keywords)) {
    return null;
  }

  const values = keywords.map((value) => String(value).trim()).filter(Boolean);
  return values.length > 0 ? values.join(", ") : null;
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
    baseRecord.homepage,
    baseRecord.bugs,
    baseRecord.license,
    baseRecord.keywords,
    baseRecord.bin,
    baseRecord.engines,
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
