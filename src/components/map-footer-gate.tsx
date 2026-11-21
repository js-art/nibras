"use client";

import { Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { usePathname } from "@/i18n/navigation";
import { isDeskPath } from "@/lib/desk";

export function MapFooterGate({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  if (pathname === "/map" || pathname === "/rooms" || pathname === "/majlis" || pathname.startsWith("/majlis/") || isDeskPath(pathname)) return null;
  // The project list is the only page that reads ?view=. Calling
  // useSearchParams on every route suspends the footer and replaces it
  // after hydration, which reloads the project sheet in a loop.
  if (pathname === "/projects") {
    return (
      <Suspense fallback={null}>
        <ProjectListFooter>{children}</ProjectListFooter>
      </Suspense>
    );
  }
  return children;
}

function ProjectListFooter({ children }: { children: React.ReactNode }) {
  const view = useSearchParams().get("view");
  if (view !== "grid") return null;
  return children;
}
