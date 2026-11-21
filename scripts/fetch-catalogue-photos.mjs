/**
 * Download the default Unsplash catalogue photos onto this site.
 * Run automatically by `yarn build`. Skips a file that is already on disk.
 */
import { readdir, readFile, mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const outDir = path.join(root, "public", "catalogue");
const sourceDirs = [path.join(root, "src"), path.join(root, "prisma")];

const idPattern = /photo-[\w-]+/g;

async function sourceFiles(dir, found = []) {
  let entries = [];
  try {
    entries = await readdir(dir, { withFileTypes: true });
  } catch {
    return found;
  }
  for (const entry of entries) {
    if (entry.name === "node_modules" || entry.name === ".next" || entry.name === "generated") continue;
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) await sourceFiles(full, found);
    else if (/\.(ts|tsx|js|mjs|json)$/.test(entry.name)) found.push(full);
  }
  return found;
}

async function photoIds() {
  const ids = new Set();
  for (const dir of sourceDirs) {
    for (const file of await sourceFiles(dir)) {
      const text = await readFile(file, "utf8");
      for (const id of text.match(idPattern) || []) ids.add(id);
    }
  }
  return [...ids].sort();
}

async function download(id) {
  const file = path.join(outDir, `${id}.jpg`);
  try {
    const stat = await readFile(file);
    if (stat.byteLength > 1000) {
      console.log(`keep  ${id}`);
      return true;
    }
  } catch {
    /* missing */
  }
  const url = `https://images.unsplash.com/${id}?auto=format&fit=crop&w=1600&q=70`;
  let lastError = "failed";
  for (let attempt = 1; attempt <= 3; attempt += 1) {
    try {
      const response = await fetch(url, {
        redirect: "follow",
        headers: { accept: "image/jpeg,image/*,*/*", "user-agent": "savat-catalogue-photos" },
      });
      if (!response.ok) throw new Error(`${response.status}`);
      const bytes = Buffer.from(await response.arrayBuffer());
      if (bytes.byteLength < 1000) throw new Error("too small");
      await writeFile(file, bytes);
      console.log(`saved ${id} (${Math.round(bytes.byteLength / 1024)} KB)`);
      return true;
    } catch (error) {
      lastError = error instanceof Error ? error.message : "failed";
      await new Promise((resolve) => setTimeout(resolve, attempt * 400));
    }
  }
  console.warn(`skip  ${id} (${lastError})`);
  return false;
}

const ids = await photoIds();
if (!ids.length) {
  console.error("No default photos found.");
  process.exit(1);
}
await mkdir(outDir, { recursive: true });
console.log(`Fetching ${ids.length} catalogue photos into public/catalogue`);
let saved = 0;
for (const id of ids) {
  if (await download(id)) saved += 1;
}
console.log(`Catalogue photos ready: ${saved}/${ids.length}`);
