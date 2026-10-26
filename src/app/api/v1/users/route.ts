import { NextResponse } from "next/server";
import { getAdminSession } from "@/lib/admin-auth";
import { createUser, listUsers } from "@/lib/users-store";

export async function GET() {
  if (!(await getAdminSession())) {
    return NextResponse.json({ error: "denied" }, { status: 401 });
  }
  return NextResponse.json(await listUsers());
}

export async function POST(request: Request) {
  if (!(await getAdminSession())) {
    return NextResponse.json({ error: "denied" }, { status: 401 });
  }
  let body: { username?: string; displayName?: string; password?: string };
  try {
    body = (await request.json()) as typeof body;
  } catch {
    return NextResponse.json({ error: "invalid" }, { status: 400 });
  }
  try {
    const user = await createUser({
      username: String(body.username ?? ""),
      displayName: String(body.displayName ?? ""),
      password: String(body.password ?? ""),
    });
    return NextResponse.json(user);
  } catch (error) {
    const code = error instanceof Error ? error.message : "error";
    const status = code === "taken" ? 409 : 400;
    return NextResponse.json({ error: code }, { status });
  }
}
