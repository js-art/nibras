import { connection } from "next/server";
import { normalizeSite } from "@/data/site";
import { hasAdminSession } from "@/lib/admin-auth";
import { readSite, writeSite } from "@/lib/site-store";

export async function GET() {
  await connection();
  return Response.json(await readSite());
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
    return Response.json({ error: "invalid" }, { status: 400 });
  }
  const site = normalizeSite(body);
  if (!site) return Response.json({ error: "invalid" }, { status: 400 });
  await writeSite(site);
  return Response.json(site);
}
