import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const raw = fs.readFileSync(path.join(__dirname, "languages.json"), "utf8");
const programmingLanguages = new Set(JSON.parse(raw));

// Build tools, task runners, and config formats that Linguist tags as "programming"
// but users typically want excluded in favor of actual programming languages:
const DEFAULT_EXCLUDED_CONFIGS = new Set([
  "Makefile",
  "Dockerfile",
  "Just",
  "DTrace",
  "CMake",
  "QMake",
  "Roff",
  "Ignore List",
  "BitBake",
  "Nginx",
  "ApacheConf",
]);

/**
 * Checks if a language name is a recognized programming language
 * (excluding markup, data, prose, and build/config files).
 *
 * @param {string} name
 * @param {string[]} [customExcluded]
 * @returns {boolean}
 */
export const isProgrammingLanguage = (name, customExcluded = []) => {
  if (!name || typeof name !== "string") return false;
  const trimmed = name.trim();
  if (!programmingLanguages.has(trimmed)) return false;
  if (DEFAULT_EXCLUDED_CONFIGS.has(trimmed)) return false;
  if (customExcluded.some((ex) => ex.toLowerCase() === trimmed.toLowerCase())) {
    return false;
  }
  return true;
};
