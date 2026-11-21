import { NextResponse } from "next/server";
import { circleFail } from "@/lib/circle/http";
import { getCircleViewer } from "@/lib/circle/session";
import { introduceProject, updateIntroducedProject } from "@/lib/circle/store";

type ProjectBody = {
  id?: string;
  name?: string;
  body?: string;
  locale?: string;
  areaId?: string;
  point?: unknown;
  kind?: unknown;
  startPrice?: unknown;
  handover?: unknown;
  sizeMin?: unknown;
  sizeMax?: unknown;
  unitCount?: unknown;
};

export async function POST(request: Request) {
  try {
    const viewer = await getCircleViewer();
    const body = (await request.json()) as ProjectBody;
    const result = await introduceProject(viewer, {
      name: String(body.name ?? ""),
      body: String(body.body ?? ""),
      locale: String(body.locale ?? "en"),
      areaId: String(body.areaId ?? ""),
      point: body.point,
      kind: body.kind,
      startPrice: body.startPrice,
      handover: body.handover,
      sizeMin: body.sizeMin,
      sizeMax: body.sizeMax,
      unitCount: body.unitCount,
    });
    return NextResponse.json(result);
  } catch (error) {
    return circleFail(error);
  }
}

export async function PATCH(request: Request) {
  try {
    const viewer = await getCircleViewer();
    const body = (await request.json()) as ProjectBody;
    const result = await updateIntroducedProject(viewer, String(body.id ?? ""), {
      kind: body.kind,
      startPrice: body.startPrice,
      handover: body.handover,
      sizeMin: body.sizeMin,
      sizeMax: body.sizeMax,
      unitCount: body.unitCount,
    });
    return NextResponse.json(result);
  } catch (error) {
    return circleFail(error);
  }
}
