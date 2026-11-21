import { NextResponse } from "next/server";
import { circleFail } from "@/lib/circle/http";
import { getCircleViewer } from "@/lib/circle/session";
import { toggleDesk } from "@/lib/circle/store";

export async function POST(request: Request) {
  try {
    const viewer = await getCircleViewer();
    const body = (await request.json()) as { projectId?: string };
    const result = await toggleDesk(viewer, String(body.projectId ?? ""));
    return NextResponse.json(result);
  } catch (error) {
    return circleFail(error);
  }
}
