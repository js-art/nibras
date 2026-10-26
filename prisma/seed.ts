import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../src/generated/prisma/client";
import { seedAtlas } from "../src/data/atlas";
import { seedSite } from "../src/data/site";
import { hashPassword } from "../src/lib/password";

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  throw new Error("DATABASE_URL is not set");
}

const db = new PrismaClient({
  adapter: new PrismaPg({ connectionString }),
});

async function main() {
  const password = process.env.ADMIN_PASSWORD?.trim() || "nibras-atlas";

  await db.suggestion.deleteMany();
  await db.project.deleteMany();
  await db.area.deleteMany();
  await db.developer.deleteMany();
  await db.city.deleteMany();
  await db.siteSettings.deleteMany();

  await db.city.createMany({
    data: seedAtlas.cities.map((city) => ({
      id: city.id,
      country: city.country,
      center: city.center,
      zoom: city.zoom,
      names: city.names,
    })),
  });
  await db.developer.createMany({
    data: seedAtlas.developers.map((developer) => ({
      id: developer.id,
      names: developer.names,
      about: developer.about,
      delivered: developer.delivered,
      image: developer.image,
    })),
  });
  await db.area.createMany({
    data: seedAtlas.areas.map((area) => ({
      id: area.id,
      cityId: area.cityId,
      color: area.color,
      center: area.center,
      ring: area.ring,
      image: area.image,
      names: area.names,
      about: area.about,
    })),
  });
  await db.project.createMany({
    data: seedAtlas.projects.map((project) => ({
      id: project.id,
      areaId: project.areaId,
      developerId: project.developerId,
      kind: project.kind,
      handover: project.handover,
      startPrice: project.startPrice,
      sizeMin: project.sizeMin,
      sizeMax: project.sizeMax,
      unitCount: project.unitCount,
      currency: project.currency,
      point: project.point,
      ring: project.ring,
      image: project.image,
      names: project.names,
      about: project.about,
      whatsapp: project.whatsapp,
      phone: project.phone,
      units: project.units,
      payment: project.payment,
    })),
  });
  await db.suggestion.createMany({
    data: seedAtlas.suggestions.map((suggestion) => ({
      id: suggestion.id,
      kind: suggestion.kind,
      targetId: suggestion.targetId,
      order: suggestion.order,
    })),
  });

  await db.siteSettings.create({
    data: { id: "default", payload: seedSite },
  });

  const admin = await db.adminUser.findUnique({ where: { username: "admin" } });
  if (!admin) {
    await db.adminUser.create({
      data: {
        username: "admin",
        displayName: "Admin",
        passwordHash: hashPassword(password),
      },
    });
  }

  console.log(
    `Seeded atlas (${seedAtlas.projects.length} projects), site settings, and admin user.`,
  );
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await db.$disconnect();
  });
