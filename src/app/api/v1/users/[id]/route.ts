import { NextResponse } from "next/server";
import { getAdminSession } from "@/lib/admin-auth";
import { deleteUser, updateUser } from "@/lib/users-store";

export async function PATCH(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const session = await getAdminSession();
  if (!session) {
    return NextResponse.json({ error: "denied" }, { status: 401 });
  }
  const { id } = await context.params;
  let body: { displayName?: string; password?: string };
  try {
    body = (await request.json()) as typeof body;
  } catch {
    return NextResponse.json({ error: "invalid" }, { status: 400 });
  }
  try {
    const user = await updateUser(id, {
      displayName: body.displayName !== undefined ? String(body.displayName) : undefined,
      password: body.password !== undefined ? String(body.password) : undefined,
    });
    return NextResponse.json(user);
  } catch (error) {
    const code = error instanceof Error ? error.message : "error";
    const status = code === "missing" ? 404 : 400;
    return NextResponse.json({ error: code }, { status });
  }
}

export async function DELETE(
  _request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const session = await getAdminSession();
  if (!session) {
    return NextResponse.json({ error: "denied" }, { status: 401 });
  }
  const { id } = await context.params;
  try {
    await deleteUser(id, session.userId);
    return NextResponse.json({ ok: true });
  } catch (error) {
    const code = error instanceof Error ? error.message : "error";
    const status = code === "missing" ? 404 : code === "self" || code === "last" ? 409 : 400;
    return NextResponse.json({ error: code }, { status });
  }
}
