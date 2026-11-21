import { NextResponse } from "next/server";
import { listMapPlaces } from "@/lib/circle/store";

export async function GET(request: Request) {
  const locale = new URL(request.url).searchParams.get("locale") || "fa";
  const places = await listMapPlaces(locale === "ar" || locale === "en" ? locale : "fa");
  return NextResponse.json({ places });
}
