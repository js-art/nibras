ALTER TABLE "CircleProfile" ADD COLUMN "banned" BOOLEAN NOT NULL DEFAULT false;

ALTER TABLE "Project" ADD COLUMN "introducedById" TEXT;

UPDATE "Project" AS p
SET "introducedById" = d."profileId"
FROM (
  SELECT DISTINCT ON ("projectId") "projectId", "profileId"
  FROM "CircleDesk"
  ORDER BY "projectId", "createdAt" ASC
) AS d
WHERE p."id" = d."projectId"
  AND p."id" LIKE 'yard-%'
  AND p."introducedById" IS NULL;

UPDATE "Project" AS p
SET "introducedById" = s."authorId"
FROM (
  SELECT DISTINCT ON ("projectId") "projectId", "authorId"
  FROM "CirclePost"
  WHERE "projectId" IS NOT NULL
  ORDER BY "projectId", "createdAt" ASC
) AS s
WHERE p."id" = s."projectId"
  AND p."id" LIKE 'yard-%'
  AND p."introducedById" IS NULL;

CREATE INDEX "Project_introducedById_idx" ON "Project"("introducedById");

ALTER TABLE "Project" ADD CONSTRAINT "Project_introducedById_fkey" FOREIGN KEY ("introducedById") REFERENCES "CircleProfile"("id") ON DELETE SET NULL ON UPDATE CASCADE;
