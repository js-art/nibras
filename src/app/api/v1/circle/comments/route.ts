import { NextResponse } from "next/server";
import { circleFail } from "@/lib/circle/http";
import { getCircleViewer } from "@/lib/circle/session";
import { addComment, removeComment, updateComment } from "@/lib/circle/store";

export async function POST(request: Request) {
  try {
    const viewer = await getCircleViewer();
    const body = (await request.json()) as { postId?: string; body?: string };
    const result = await addComment(viewer, String(body.postId ?? ""), String(body.body ?? ""));
    return NextResponse.json(result);
  } catch (error) {
    return circleFail(error);
  }
}

export async function PATCH(request: Request) {
  try {
    const viewer = await getCircleViewer();
    const body = (await request.json()) as { commentId?: string; body?: string };
    const result = await updateComment(viewer, String(body.commentId ?? ""), String(body.body ?? ""));
    return NextResponse.json(result);
  } catch (error) {
    return circleFail(error);
  }
}

export async function DELETE(request: Request) {
  try {
    const viewer = await getCircleViewer();
    const body = (await request.json()) as { commentId?: string };
    const result = await removeComment(viewer, String(body.commentId ?? ""));
    return NextResponse.json(result);
  } catch (error) {
    return circleFail(error);
  }
}
