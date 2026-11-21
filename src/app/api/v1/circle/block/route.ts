import { NextResponse } from "next/server";
import { circleFail } from "@/lib/circle/http";
import { getCircleViewer } from "@/lib/circle/session";
import { toggleBlock } from "@/lib/circle/store";

export async function POST(request: Request) {
  try {
    const viewer = await getCircleViewer();
    const body = (await request.json()) as { handle?: string };
    const result = await toggleBlock(viewer, String(body.handle ?? ""));
    return NextResponse.json(result);
  } catch (error) {
    return circleFail(error);
  }
}