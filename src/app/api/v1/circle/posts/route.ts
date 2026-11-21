import { NextResponse } from "next/server";
import { circleFail } from "@/lib/circle/http";
import { getCircleViewer } from "@/lib/circle/session";
import { createPost, removePost, updatePost } from "@/lib/circle/store";

export async function POST(request: Request) {
  try {
    const viewer = await getCircleViewer();
    const body = (await request.json()) as {
      body?: string;
      kind?: string;
      visibility?: string;
      projectId?: string;
      locale?: string;
      place?: unknown;
    };
    const post = await createPost(viewer, {
      body: String(body.body ?? ""),
      kind: body.kind,
      visibility: body.visibility,
      projectId: body.projectId || undefined,
      locale: String(body.locale ?? "en"),
      place: body.place,
    });
    return NextResponse.json({ post });
  } catch (error) {
    return circleFail(error);
  }
}

export async function PATCH(request: Request) {
  try {
    const viewer = await getCircleViewer();
    const body = (await request.json()) as { postId?: string; body?: string; locale?: string };
    const result = await updatePost(viewer, String(body.postId ?? ""), String(body.body ?? ""), String(body.locale ?? "en"));
    return NextResponse.json(result);
  } catch (error) {
    return circleFail(error);
  }
}

export async function DELETE(request: Request) {
  try {
    const viewer = await getCircleViewer();
    const body = (await request.json()) as { postId?: string };
    const result = await removePost(viewer, String(body.postId ?? ""));
    return NextResponse.json(result);
  } catch (error) {
    return circleFail(error);
  }
}
