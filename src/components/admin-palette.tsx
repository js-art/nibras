import { Suspense } from "react";
import { connection } from "next/server";
import { hasAdminSession } from "@/lib/admin-auth";
import { PalmTuner } from "./palm-tuner";

async function AdminPalette() {
  await connection();
  if (!(await hasAdminSession())) return null;
  return <PalmTuner />;
}

export function AdminPaletteGate() {
  return (
    <Suspense fallback={null}>
      <AdminPalette />
    </Suspense>
  );
}
