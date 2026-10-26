-- Persist last create/edit time so desk tables can sort newest first.
-- Full atlas rewrites pass these timestamps explicitly from the payload.

ALTER TABLE "City" ADD COLUMN "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;
ALTER TABLE "Area" ADD COLUMN "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;
ALTER TABLE "Developer" ADD COLUMN "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;
ALTER TABLE "Project" ADD COLUMN "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;
ALTER TABLE "Suggestion" ADD COLUMN "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

CREATE INDEX "City_updatedAt_idx" ON "City"("updatedAt");
CREATE INDEX "Area_updatedAt_idx" ON "Area"("updatedAt");
CREATE INDEX "Developer_updatedAt_idx" ON "Developer"("updatedAt");
CREATE INDEX "Project_updatedAt_idx" ON "Project"("updatedAt");
CREATE INDEX "Suggestion_updatedAt_idx" ON "Suggestion"("updatedAt");
