import { NextResponse } from "next/server";
import { circleFail, circleSession } from "@/lib/circle/http";
import { CIRCLE_COOKIE, circleCookieOptions } from "@/lib/circle/session";
import { enterCircle } from "@/lib/circle/store";
import { getCircleViewer } from "@/lib/circle/session";

export async function GET() {
  const viewer = await getCircleViewer();
  return NextResponse.json({ viewer });
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as { handle?: string; password?: string };
    const viewer = await enterCircle({
      handle: String(body.handle ?? ""),
      password: body.password ? String(body.password) : undefined,
    });
    return circleSession(viewer);
  } catch (error) {
    return circleFail(error);
  }
}

export async function DELETE() {
  const response = NextResponse.json({ ok: true });
  response.cookies.set(CIRCLE_COOKIE, "", { ...circleCookieOptions(), maxAge: 0 });
  return response;
}
