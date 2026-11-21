import { NextResponse } from "next/server";
import { CIRCLE_COOKIE, circleCookieOptions, circleSessionToken } from "@/lib/circle/session";
import { CircleError } from "@/lib/circle/store";
import type { CircleViewer } from "@/lib/circle/types";

export function circleFail(error: unknown) {
  const named = error instanceof Error ? error : null;
  const status = named && "status" in named && typeof named.status === "number" ? named.status : 0;
  if (named && (named instanceof CircleError || named.name === "CircleError") && status >= 400) {
    return NextResponse.json({ error: named.message }, { status });
  }
  return NextResponse.json({ error: "error" }, { status: 500 });
}

export function circleSession(viewer: CircleViewer) {
  const token = circleSessionToken(viewer.id);
  if (!token) return NextResponse.json({ error: "unconfigured" }, { status: 503 });
  const response = NextResponse.json({ viewer });
  response.cookies.set(CIRCLE_COOKIE, token, circleCookieOptions());
  return response;
}
