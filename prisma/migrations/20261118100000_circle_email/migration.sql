ALTER TABLE "CircleProfile" ADD COLUMN "email" TEXT;

CREATE UNIQUE INDEX "CircleProfile_email_key" ON "CircleProfile"("email");
