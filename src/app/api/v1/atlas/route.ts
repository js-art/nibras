import { connection } from "next/server";
import { normalizeAtlas } from "@/data/atlas";
import { hasAdminSession } from "@/lib/admin-auth";
import { readAtlas, writeAtlas } from "@/lib/atlas-store";

export async function GET() {
  await connection();
  return Response.json(await readAtlas());
}

export async function PUT(request: Request) {
  await connection();
  if (!(await hasAdminSession())) {
    return Response.json({ error: "unauthorized" }, { status: 401 });
  }
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "invalid", message: "Invalid JSON body." }, { status: 400 });
  }
  const atlas = normalizeAtlas(body);
  if (!atlas) {
    return Response.json(
      { error: "invalid", message: "Atlas payload failed validation and was rejected." },
      { status: 400 },
    );
  }
  try {
    await writeAtlas(atlas);
  } catch (cause) {
    const detail = cause instanceof Error ? cause.message : "Unknown database error";
    console.error("[atlas.put]", cause);
    return Response.json(
      {
        error: "save_failed",
        message: detail.slice(0, 400),
      },
      { status: 500 },
    );
  }
  return Response.json(await readAtlas());
}
