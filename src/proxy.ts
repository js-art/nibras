import { NextResponse, type NextRequest } from "next/server";
import createMiddleware from "next-intl/middleware";
import { routing } from "./i18n/routing";

const handleI18n = createMiddleware(routing);

function probeAction(request: NextRequest) {
  const id = request.headers.get("next-action");
  if (id === null) return false;
  if (!/^[0-9a-f]{32,}$/i.test(id)) return true;
  return !request.headers.get("origin");
}

export default function proxy(request: NextRequest) {
  if (probeAction(request)) return new NextResponse(null, { status: 400 });
  const path = request.nextUrl.pathname;
  if (path === "/meet" || path.startsWith("/meet/")) return NextResponse.next();
  if (path === "/call" || path.startsWith("/call/")) return NextResponse.next();
  const retired = path.match(/^\/(en|ar|fa)\/circle(\/.*)?$/);
  if (retired) {
    const url = request.nextUrl.clone();
    url.pathname = `/${retired[1]}/majlis${retired[2] ?? ""}`;
    return NextResponse.redirect(url, 308);
  }
  return handleI18n(request);
}

export const config = {
  matcher: "/((?!api|trpc|_next|_vercel|.*\\..*).*)",
};
