import { Prisma } from "@/generated/prisma/client";
import { normalizeSite, seedSite, type SiteContent } from "@/data/site";
import { db } from "@/lib/db";

export async function readSite(): Promise<SiteContent> {
  const row = await db.siteSettings.findUnique({ where: { id: "default" } });
  if (!row) {
    await writeSite(seedSite);
    return seedSite;
  }
  return normalizeSite(row.payload) ?? seedSite;
}

export async function writeSite(site: SiteContent) {
  const payload = normalizeSite(site) ?? seedSite;
  await db.siteSettings.upsert({
    where: { id: "default" },
    create: {
      id: "default",
      payload: payload as unknown as Prisma.InputJsonValue,
    },
    update: {
      payload: payload as unknown as Prisma.InputJsonValue,
    },
  });
  return payload;
}
