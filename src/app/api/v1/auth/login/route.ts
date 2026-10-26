import { NextResponse } from "next/server";
import { ADMIN_COOKIE, passwordConfigured, sessionToken } from "@/lib/admin-auth";
import { authenticateUser } from "@/lib/users-store";

export async function POST(request: Request) {
  if (!(await passwordConfigured())) {
    return NextResponse.json({ error: "unconfigured" }, { status: 503 });
  }
  let username = "";
  let password = "";
  try {
    const body = (await request.json()) as { username?: string; password?: string };
    username = String(body.username ?? "");
    password = String(body.password ?? "");
  } catch {
    username = "";
    password = "";
  }
  const user = await authenticateUser(username, password);
  if (!user) {
    return NextResponse.json({ error: "denied" }, { status: 401 });
  }
  const response = NextResponse.json({ ok: true, user });
  response.cookies.set(ADMIN_COOKIE, sessionToken(user.id), {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 12,
  });
  return response;
}
