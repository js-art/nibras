import { NextResponse } from "next/server";
import { circleFail } from "@/lib/circle/http";
import { getCircleViewer } from "@/lib/circle/session";
import { toggleBookmark } from "@/lib/circle/store";

export async function POST(request: Request) {
  try {
    const viewer = await getCircleViewer();
    const body = (await request.json()) as { postId?: string };
    const result = await toggleBookmark(viewer, String(body.postId ?? ""));
    return NextResponse.json(result);
  } catch (error) {
    return circleFail(error);
  }
}
