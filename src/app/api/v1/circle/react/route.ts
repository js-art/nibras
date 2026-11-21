import { NextResponse } from "next/server";
import { circleFail } from "@/lib/circle/http";
import { getCircleViewer } from "@/lib/circle/session";
import { toggleReaction } from "@/lib/circle/store";

export async function POST(request: Request) {
  try {
    const viewer = await getCircleViewer();
    const body = (await request.json()) as { postId?: string; type?: string };
    const result = await toggleReaction(viewer, String(body.postId ?? ""), String(body.type ?? ""));
    return NextResponse.json(result);
  } catch (error) {
    return circleFail(error);
  }
}
