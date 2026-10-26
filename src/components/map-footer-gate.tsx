"use client";

import { usePathname } from "@/i18n/navigation";
import { isDeskPath } from "@/lib/desk";

export function MapFooterGate({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  if (pathname === "/map" || isDeskPath(pathname)) return null;
  return children;
}
