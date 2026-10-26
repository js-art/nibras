import { Prisma } from "@/generated/prisma/client";
import {
  normalizeAtlas,
  seedAtlas,
  type Area,
  type Atlas,
  type City,
  type Developer,
  type Project,
  type Suggestion,
} from "@/data/atlas";
import { db } from "@/lib/db";

function asJson<T>(value: unknown, fallback: T): T {
  return (value as T) ?? fallback;
}

function fromDate(value: Date | null | undefined) {
  return value instanceof Date && !Number.isNaN(value.getTime()) ? value.getTime() : 0;
}

/** Prefer payload stamp; else keep DB value so a full rewrite does not reset every row to "now". */
function resolveUpdatedAt(id: string, payload: number | undefined, existing: Map<string, Date>) {
  const prev = existing.get(id)?.getTime() ?? 0;
  if (payload && payload > 0) return new Date(Math.max(payload, prev));
  if (prev > 0) return new Date(prev);
  return new Date(0);
}

export async function readAtlas(): Promise<Atlas> {
  const [cities, areas, developers, projects, suggestions] = await Promise.all([
    db.city.findMany({ orderBy: [{ updatedAt: "desc" }, { id: "asc" }] }),
    db.area.findMany({ orderBy: [{ updatedAt: "desc" }, { id: "asc" }] }),
    db.developer.findMany({ orderBy: [{ updatedAt: "desc" }, { id: "asc" }] }),
    db.project.findMany({ orderBy: [{ updatedAt: "desc" }, { id: "asc" }] }),
    db.suggestion.findMany({ orderBy: { order: "asc" } }),
  ]);

  if (cities.length === 0) {
    await writeAtlas(seedAtlas);
    return seedAtlas;
  }

  const atlas: Atlas = {
    cities: cities.map(
      (row): City => ({
        id: row.id,
        country: row.country as City["country"],
        center: asJson(row.center, [0, 0]),
        zoom: row.zoom,
        names: asJson(row.names, { en: "", ar: "", fa: "" }),
        updatedAt: fromDate(row.updatedAt),
      }),
    ),
    areas: areas.map(
      (row): Area => ({
        id: row.id,
        cityId: row.cityId,
        color: row.color,
        center: asJson(row.center, [0, 0]),
        ring: asJson(row.ring, []),
        image: row.image,
        names: asJson(row.names, { en: "", ar: "", fa: "" }),
        about: asJson(row.about, { en: "", ar: "", fa: "" }),
        updatedAt: fromDate(row.updatedAt),
      }),
    ),
    developers: developers.map(
      (row): Developer => ({
        id: row.id,
        names: asJson(row.names, { en: "", ar: "", fa: "" }),
        about: asJson(row.about, { en: "", ar: "", fa: "" }),
        delivered: row.delivered,
        image: row.image,
        updatedAt: fromDate(row.updatedAt),
      }),
    ),
    projects: projects.map(
      (row): Project => ({
        id: row.id,
        areaId: row.areaId,
        developerId: row.developerId,
        kind: row.kind as Project["kind"],
        handover: row.handover,
        startPrice: row.startPrice,
        sizeMin: row.sizeMin,
        sizeMax: row.sizeMax,
        unitCount: row.unitCount,
        currency: row.currency as Project["currency"],
        point: asJson(row.point, [0, 0]),
        ring: asJson(row.ring, []),
        image: row.image,
        names: asJson(row.names, { en: "", ar: "", fa: "" }),
        about: asJson(row.about, { en: "", ar: "", fa: "" }),
        whatsapp: row.whatsapp,
        phone: row.phone,
        units: asJson(row.units, []),
        payment: asJson(row.payment, []),
        updatedAt: fromDate(row.updatedAt),
      }),
    ),
    suggestions: suggestions.map(
      (row): Suggestion => ({
        id: row.id,
        kind: row.kind as Suggestion["kind"],
        targetId: row.targetId,
        order: row.order,
        updatedAt: fromDate(row.updatedAt),
      }),
    ),
  };

  return normalizeAtlas(atlas) ?? seedAtlas;
}

export async function writeAtlas(input: Atlas) {
  const atlas = normalizeAtlas(input) ?? seedAtlas;

  const [cityRows, areaRows, developerRows, projectRows, suggestionRows] = await Promise.all([
    db.city.findMany({ select: { id: true, updatedAt: true } }),
    db.area.findMany({ select: { id: true, updatedAt: true } }),
    db.developer.findMany({ select: { id: true, updatedAt: true } }),
    db.project.findMany({ select: { id: true, updatedAt: true } }),
    db.suggestion.findMany({ select: { id: true, updatedAt: true } }),
  ]);
  const cityStamp = new Map(cityRows.map((row) => [row.id, row.updatedAt]));
  const areaStamp = new Map(areaRows.map((row) => [row.id, row.updatedAt]));
  const developerStamp = new Map(developerRows.map((row) => [row.id, row.updatedAt]));
  const projectStamp = new Map(projectRows.map((row) => [row.id, row.updatedAt]));
  const suggestionStamp = new Map(suggestionRows.map((row) => [row.id, row.updatedAt]));

  await db.$transaction(async (tx) => {
    await tx.suggestion.deleteMany();
    await tx.project.deleteMany();
    await tx.area.deleteMany();
    await tx.developer.deleteMany();
    await tx.city.deleteMany();

    // createMany + @default(now()) can collapse every row to the same clock tick.
    // Insert rows first, then set updatedAt explicitly per id.
    if (atlas.cities.length) {
      await tx.city.createMany({
        data: atlas.cities.map((city) => ({
          id: city.id,
          country: city.country,
          center: city.center as unknown as Prisma.InputJsonValue,
          zoom: city.zoom,
          names: city.names as unknown as Prisma.InputJsonValue,
        })),
      });
      await Promise.all(
        atlas.cities.map((city) =>
          tx.city.update({
            where: { id: city.id },
            data: { updatedAt: resolveUpdatedAt(city.id, city.updatedAt, cityStamp) },
          }),
        ),
      );
    }

    if (atlas.developers.length) {
      await tx.developer.createMany({
        data: atlas.developers.map((developer) => ({
          id: developer.id,
          names: developer.names as unknown as Prisma.InputJsonValue,
          about: developer.about as unknown as Prisma.InputJsonValue,
          delivered: developer.delivered,
          image: developer.image,
        })),
      });
      await Promise.all(
        atlas.developers.map((developer) =>
          tx.developer.update({
            where: { id: developer.id },
            data: { updatedAt: resolveUpdatedAt(developer.id, developer.updatedAt, developerStamp) },
          }),
        ),
      );
    }

    if (atlas.areas.length) {
      await tx.area.createMany({
        data: atlas.areas.map((area) => ({
          id: area.id,
          cityId: area.cityId,
          color: area.color,
          center: area.center as unknown as Prisma.InputJsonValue,
          ring: area.ring as unknown as Prisma.InputJsonValue,
          image: area.image,
          names: area.names as unknown as Prisma.InputJsonValue,
          about: area.about as unknown as Prisma.InputJsonValue,
        })),
      });
      await Promise.all(
        atlas.areas.map((area) =>
          tx.area.update({
            where: { id: area.id },
            data: { updatedAt: resolveUpdatedAt(area.id, area.updatedAt, areaStamp) },
          }),
        ),
      );
    }

    if (atlas.projects.length) {
      await tx.project.createMany({
        data: atlas.projects.map((project) => ({
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
          point: project.point as unknown as Prisma.InputJsonValue,
          ring: project.ring as unknown as Prisma.InputJsonValue,
          image: project.image,
          names: project.names as unknown as Prisma.InputJsonValue,
          about: project.about as unknown as Prisma.InputJsonValue,
          whatsapp: project.whatsapp,
          phone: project.phone,
          units: project.units as unknown as Prisma.InputJsonValue,
          payment: project.payment as unknown as Prisma.InputJsonValue,
        })),
      });
      await Promise.all(
        atlas.projects.map((project) =>
          tx.project.update({
            where: { id: project.id },
            data: { updatedAt: resolveUpdatedAt(project.id, project.updatedAt, projectStamp) },
          }),
        ),
      );
    }

    if (atlas.suggestions.length) {
      await tx.suggestion.createMany({
        data: atlas.suggestions.map((suggestion) => ({
          id: suggestion.id,
          kind: suggestion.kind,
          targetId: suggestion.targetId,
          order: suggestion.order,
        })),
      });
      await Promise.all(
        atlas.suggestions.map((suggestion) =>
          tx.suggestion.update({
            where: { id: suggestion.id },
            data: { updatedAt: resolveUpdatedAt(suggestion.id, suggestion.updatedAt, suggestionStamp) },
          }),
        ),
      );
    }
  });

  return atlas;
}
