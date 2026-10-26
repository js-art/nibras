import { mkdir, readdir, stat, writeFile } from "node:fs/promises";
import path from "node:path";
import { connection } from "next/server";
import { hasAdminSession } from "@/lib/admin-auth";

const MAX_BYTES = 5 * 1024 * 1024;
const ALLOWED = new Map([
  ["image/png", "png"],
  ["image/jpeg", "jpg"],
  ["image/webp", "webp"],
  ["image/svg+xml", "svg"],
  ["image/gif", "gif"],
]);
const IMAGE_NAME = /\.(png|jpe?g|webp|gif|svg)$/i;

function uploadsDir() {
  return path.join(process.cwd(), "public", "uploads");
}

function sanitizeFolder(raw: FormDataEntryValue | null) {
  const value = typeof raw === "string" ? raw : "images";
  return value.replace(/[^a-z0-9_-]/gi, "").slice(0, 32) || "images";
}

function sanitizeBaseName(fileName: string) {
  const base = fileName.replace(/\.[^.]+$/, "");
  return base.replace(/[^a-z0-9_-]+/gi, "-").replace(/^-+|-+$/g, "").slice(0, 40) || "image";
}

export async function GET(request: Request) {
  await connection();
  if (!(await hasAdminSession())) {
    return Response.json({ error: "unauthorized" }, { status: 401 });
  }

  const url = new URL(request.url);
  const page = Math.max(1, Number(url.searchParams.get("page") || 1) || 1);
  const limit = Math.min(48, Math.max(1, Number(url.searchParams.get("limit") || 12) || 12));
  const search = (url.searchParams.get("search") || "").toLowerCase().trim();

  const dir = uploadsDir();
  await mkdir(dir, { recursive: true });

  let names = (await readdir(dir)).filter((name) => IMAGE_NAME.test(name));
  if (search) {
    names = names.filter((name) => name.toLowerCase().includes(search));
  }

  const withMeta = await Promise.all(
    names.map(async (name) => {
      const info = await stat(path.join(dir, name));
      return { name, mtimeMs: info.mtimeMs };
    }),
  );
  withMeta.sort((a, b) => b.mtimeMs - a.mtimeMs);

  const total = withMeta.length;
  const start = (page - 1) * limit;
  const slice = withMeta.slice(start, start + limit);
  const data = slice.map(({ name }) => ({
    id: name,
    url: `/uploads/${name}`,
    name,
    title: name,
    altText: name,
  }));

  return Response.json({
    data,
    items: data,
    total,
    page,
    limit,
    totalPages: Math.max(1, Math.ceil(total / limit)),
  });
}

export async function POST(request: Request) {
  await connection();
  if (!(await hasAdminSession())) {
    return Response.json({ error: "unauthorized" }, { status: 401 });
  }

  let form: FormData;
  try {
    form = await request.formData();
  } catch {
    return Response.json({ error: "invalid" }, { status: 400 });
  }

  const file = form.get("file");
  if (!(file instanceof File) || file.size === 0) {
    return Response.json({ error: "missing" }, { status: 400 });
  }
  if (file.size > MAX_BYTES) {
    return Response.json({ error: "too_large" }, { status: 413 });
  }

  const ext = ALLOWED.get(file.type);
  if (!ext) {
    return Response.json({ error: "type" }, { status: 415 });
  }

  const folder = sanitizeFolder(form.get("folder"));
  const base = sanitizeBaseName(file.name);
  const bytes = Buffer.from(await file.arrayBuffer());
  const dir = uploadsDir();
  await mkdir(dir, { recursive: true });
  const name = `${folder}-${base}-${Date.now()}.${ext}`;
  await writeFile(path.join(dir, name), bytes);

  return Response.json({
    url: `/uploads/${name}`,
    id: name,
    name,
    title: file.name,
    altText: file.name,
  });
}
