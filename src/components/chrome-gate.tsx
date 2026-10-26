"use client";

import { usePathname } from "@/i18n/navigation";
import { isDeskPath } from "@/lib/desk";

export function ChromeGate({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  if (isDeskPath(pathname)) return null;
  return children;
}
