CREATE TABLE "CircleDesk" (
    "profileId" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CircleDesk_pkey" PRIMARY KEY ("profileId","projectId")
);

CREATE INDEX "CircleDesk_projectId_idx" ON "CircleDesk"("projectId");

ALTER TABLE "CircleDesk" ADD CONSTRAINT "CircleDesk_profileId_fkey" FOREIGN KEY ("profileId") REFERENCES "CircleProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "CircleDesk" ADD CONSTRAINT "CircleDesk_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;
