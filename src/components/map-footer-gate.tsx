"use client";

import { Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { usePathname } from "@/i18n/navigation";
import { isDeskPath } from "@/lib/desk";

export function MapFooterGate({ children }: { children: React.ReactNode }) {
  return (
    <Suspense fallback={children}>
      <FooterGate>{children}</FooterGate>
    </Suspense>
  );
}

function FooterGate({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const view = useSearchParams().get("view");
  if (pathname === "/map" || isDeskPath(pathname)) return null;
  if (pathname === "/projects" && view !== "grid") return null;
  return children;
}
