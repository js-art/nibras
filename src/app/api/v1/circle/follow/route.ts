import { NextResponse } from "next/server";
import { circleFail } from "@/lib/circle/http";
import { getCircleViewer } from "@/lib/circle/session";
import { toggleFollow } from "@/lib/circle/store";

export async function POST(request: Request) {
  try {
    const viewer = await getCircleViewer();
    const body = (await request.json()) as { handle?: string };
    const result = await toggleFollow(viewer, String(body.handle ?? ""));
    return NextResponse.json(result);
  } catch (error) {
    return circleFail(error);
  }
}
