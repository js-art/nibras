import { NextResponse } from "next/server";
import { getAdminSession } from "@/lib/admin-auth";
import { circleFail } from "@/lib/circle/http";
import { adminRemovePost, adminUpdatePost, setCircleBan } from "@/lib/circle/store";

async function allowed() {
  const session = await getAdminSession();
  if (!session) return NextResponse.json({ error: "denied" }, { status: 401 });
  return null;
}

export async function PATCH(request: Request) {
  const denied = await allowed();
  if (denied) return denied;
  try {
    const body = (await request.json()) as { postId?: string; body?: string };
    const result = await adminUpdatePost(String(body.postId ?? ""), String(body.body ?? ""));
    return NextResponse.json(result);
  } catch (error) {
    return circleFail(error);
  }
}

export async function DELETE(request: Request) {
  const denied = await allowed();
  if (denied) return denied;
  try {
    const body = (await request.json()) as { postId?: string };
    const result = await adminRemovePost(String(body.postId ?? ""));
    return NextResponse.json(result);
  } catch (error) {
    return circleFail(error);
  }
}

export async function POST(request: Request) {
  const denied = await allowed();
  if (denied) return denied;
  try {
    const body = (await request.json()) as { profileId?: string; banned?: boolean };
    const result = await setCircleBan(String(body.profileId ?? ""), Boolean(body.banned));
    return NextResponse.json(result);
  } catch (error) {
    return circleFail(error);
  }
}
