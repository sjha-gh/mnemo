import { existsSync } from "node:fs";
import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import process from "node:process";

/**
 * Re-applies persistent local secrets that `vercel env pull` does not manage.
 *
 * `vercel env pull .env.local` rewrites .env.local and can drop manually added
 * values like S3_MEDIA_BUCKET and OPENAI_API_KEY. We keep those in .env.local2
 * and merge them back into .env.local with this script:
 *
 *   pnpm restore-env
 *
 * For every KEY=VALUE in .env.local2, the matching line in .env.local is
 * updated in place; missing keys are appended. All other .env.local content is
 * left untouched.
 */

const rootDir = process.cwd();
const sourcePath = path.join(rootDir, ".env.local2");
const targetPath = path.join(rootDir, ".env.local");

const ENV_LINE = /^([A-Za-z_][A-Za-z0-9_]*)=(.*)$/;

function parseEnv(text) {
  const entries = new Map();
  for (const rawLine of text.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith("#")) continue;
    const match = ENV_LINE.exec(line);
    if (!match) continue;
    entries.set(match[1], match[2]);
  }
  return entries;
}

async function main() {
  if (!existsSync(sourcePath)) {
    console.error(
      "No .env.local2 found. Create it with the keys to persist (e.g. S3_MEDIA_BUCKET, OPENAI_API_KEY).",
    );
    process.exitCode = 1;
    return;
  }

  const sourceEntries = parseEnv(await readFile(sourcePath, "utf8"));
  if (sourceEntries.size === 0) {
    console.log("No keys defined in .env.local2. Nothing to restore.");
    return;
  }

  const targetExists = existsSync(targetPath);
  const targetText = targetExists ? await readFile(targetPath, "utf8") : "";
  const lines = targetText.length ? targetText.split(/\r?\n/) : [];

  const seen = new Set();
  const updated = [];
  const restored = [];

  for (const line of lines) {
    const match = ENV_LINE.exec(line.trim());
    if (match && sourceEntries.has(match[1])) {
      const key = match[1];
      seen.add(key);
      updated.push(`${key}=${sourceEntries.get(key)}`);
      restored.push(key);
    } else {
      updated.push(line);
    }
  }

  const missing = [...sourceEntries.keys()].filter((key) => !seen.has(key));
  if (missing.length) {
    if (updated.length && updated[updated.length - 1].trim() !== "") {
      updated.push("");
    }
    for (const key of missing) {
      updated.push(`${key}=${sourceEntries.get(key)}`);
      restored.push(key);
    }
  }

  // Keep a single trailing newline.
  const output = `${updated.join("\n").replace(/\n+$/, "")}\n`;
  await writeFile(targetPath, output, "utf8");

  console.log(
    `Restored ${restored.length} key(s) into .env.local: ${restored.join(", ")}`,
  );
}

main().catch((error) => {
  console.error("restore-env failed:");
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
