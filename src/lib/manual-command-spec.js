import fs from "node:fs";
import path from "node:path";
import {
  formatAuthor,
  formatBin,
  formatEngines,
  formatKeywords,
  formatUrlField,
  normalizeRepositoryUrl,
} from "./metadata.js";
import { REQUIRED_MANUAL_SPEC_FIELDS } from "./constants.js";

function isHttpUrl(value) {
  return /^https?:\/\//i.test(String(value || "").trim());
}

function toOptionalString(value) {
  if (value === null || value === undefined) {
    return null;
  }

  const normalized = String(value).trim();
  return normalized || null;
}

function formatFlexibleKeywords(value) {
  if (Array.isArray(value)) {
    return formatKeywords(value);
  }

  return toOptionalString(value);
}

function formatFlexibleBin(value) {
  if (value && typeof value === "object" && !Array.isArray(value)) {
    return formatBin(value);
  }

  return toOptionalString(value);
}

function formatFlexibleEngines(value) {
  if (value && typeof value === "object" && !Array.isArray(value)) {
    return formatEngines(value);
  }

  return toOptionalString(value);
}

function formatHelpPreview(value) {
  if (typeof value === "string") {
    return value.trim() || null;
  }

  if (Array.isArray(value)) {
    const lines = value.map((item) => String(item).trim()).filter(Boolean);
    return lines.length > 0 ? lines.join("\n") : null;
  }

  return null;
}

function assertRequiredFields(record) {
  for (const fieldName of REQUIRED_MANUAL_SPEC_FIELDS) {
    if (!record[fieldName]) {
      throw new Error(`Manual spec is missing required field "${fieldName}".`);
    }
  }
}

export function normalizeManualSpec(payload) {
  if (!payload || typeof payload !== "object" || Array.isArray(payload)) {
    throw new Error("Manual spec must be a JSON object.");
  }

  const normalized = {
    schemaVersion: Number(payload.schemaVersion ?? 1),
    commandName: toOptionalString(payload.commandName),
    commandPath: toOptionalString(payload.commandPath ?? payload.scriptPath),
    packageName: toOptionalString(payload.packageName),
    packageJsonPath: toOptionalString(payload.packageJsonPath),
    description: toOptionalString(payload.description),
    version: toOptionalString(payload.version),
    repository: normalizeRepositoryUrl(payload.repository),
    author: formatAuthor(payload.author),
    homepage: formatUrlField(payload.homepage),
    bugs: formatUrlField(payload.bugs),
    license: toOptionalString(payload.license),
    keywords: formatFlexibleKeywords(payload.keywords),
    bin: formatFlexibleBin(payload.bin),
    engines: formatFlexibleEngines(payload.engines),
    notes: toOptionalString(payload.notes),
    helpPreview: formatHelpPreview(payload.helpPreview ?? payload.usage),
  };

  if (!Number.isFinite(normalized.schemaVersion) || normalized.schemaVersion < 1) {
    throw new Error("Manual spec field \"schemaVersion\" must be a positive number.");
  }

  assertRequiredFields(normalized);
  return normalized;
}

export async function loadManualSpec(specSource) {
  const source = String(specSource ?? "").trim();

  if (!source) {
    throw new Error("Missing JSON file path or URL for manual add.");
  }

  let raw;
  let resolvedSource;

  if (isHttpUrl(source)) {
    const response = await fetch(source);

    if (!response.ok) {
      throw new Error(`Failed to fetch manual spec: ${response.status} ${response.statusText}`);
    }

    raw = await response.text();
    resolvedSource = source;
  } else {
    const absolutePath = path.resolve(source);

    if (!fs.existsSync(absolutePath)) {
      throw new Error(`Manual spec file was not found: ${absolutePath}`);
    }

    raw = fs.readFileSync(absolutePath, "utf8");
    resolvedSource = absolutePath;
  }

  let payload;

  try {
    payload = JSON.parse(raw);
  } catch (error) {
    throw new Error(`Manual spec is not valid JSON: ${error.message}`);
  }

  return {
    source: resolvedSource,
    payload,
    spec: normalizeManualSpec(payload),
  };
}
