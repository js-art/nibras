-- Agent–investor circle. Social graph ported from Dinka onto the catalogue.

CREATE TABLE "CircleProfile" (
    "id" TEXT NOT NULL,
    "handle" TEXT NOT NULL,
    "displayName" TEXT NOT NULL,
    "role" TEXT NOT NULL,
    "bio" TEXT NOT NULL DEFAULT '',
    "city" TEXT NOT NULL DEFAULT '',
    "focus" TEXT NOT NULL DEFAULT '',
    "passwordHash" TEXT,
    "sample" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CircleProfile_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "CircleProfile_handle_key" ON "CircleProfile"("handle");
CREATE INDEX "CircleProfile_role_idx" ON "CircleProfile"("role");
CREATE INDEX "CircleProfile_createdAt_idx" ON "CircleProfile"("createdAt");

CREATE TABLE "CircleFollow" (
    "id" TEXT NOT NULL,
    "followerId" TEXT NOT NULL,
    "followingId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CircleFollow_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "CircleFollow_followerId_followingId_key" ON "CircleFollow"("followerId", "followingId");
CREATE INDEX "CircleFollow_followingId_idx" ON "CircleFollow"("followingId");

CREATE TABLE "CircleBlock" (
    "id" TEXT NOT NULL,
    "blockerId" TEXT NOT NULL,
    "blockedId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CircleBlock_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "CircleBlock_blockerId_blockedId_key" ON "CircleBlock"("blockerId", "blockedId");
CREATE INDEX "CircleBlock_blockedId_idx" ON "CircleBlock"("blockedId");

CREATE TABLE "CirclePost" (
    "id" TEXT NOT NULL,
    "authorId" TEXT NOT NULL,
    "body" JSONB NOT NULL,
    "kind" TEXT NOT NULL DEFAULT 'note',
    "visibility" TEXT NOT NULL DEFAULT 'circle',
    "projectId" TEXT,
    "sample" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CirclePost_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "CirclePost_authorId_createdAt_idx" ON "CirclePost"("authorId", "createdAt");
CREATE INDEX "CirclePost_projectId_idx" ON "CirclePost"("projectId");
CREATE INDEX "CirclePost_visibility_createdAt_idx" ON "CirclePost"("visibility", "createdAt");
CREATE INDEX "CirclePost_kind_idx" ON "CirclePost"("kind");

CREATE TABLE "CircleComment" (
    "id" TEXT NOT NULL,
    "postId" TEXT NOT NULL,
    "authorId" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CircleComment_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "CircleComment_postId_createdAt_idx" ON "CircleComment"("postId", "createdAt");
CREATE INDEX "CircleComment_authorId_idx" ON "CircleComment"("authorId");

CREATE TABLE "CircleReaction" (
    "id" TEXT NOT NULL,
    "postId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CircleReaction_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "CircleReaction_postId_userId_key" ON "CircleReaction"("postId", "userId");
CREATE INDEX "CircleReaction_userId_idx" ON "CircleReaction"("userId");

CREATE TABLE "CircleBookmark" (
    "id" TEXT NOT NULL,
    "postId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CircleBookmark_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "CircleBookmark_postId_userId_key" ON "CircleBookmark"("postId", "userId");
CREATE INDEX "CircleBookmark_userId_idx" ON "CircleBookmark"("userId");

CREATE TABLE "CircleTag" (
    "id" TEXT NOT NULL,
    "tag" TEXT NOT NULL,
    "useCount" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "CircleTag_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "CircleTag_tag_key" ON "CircleTag"("tag");
CREATE INDEX "CircleTag_useCount_idx" ON "CircleTag"("useCount");

CREATE TABLE "CirclePostTag" (
    "postId" TEXT NOT NULL,
    "tagId" TEXT NOT NULL,

    CONSTRAINT "CirclePostTag_pkey" PRIMARY KEY ("postId","tagId")
);

CREATE INDEX "CirclePostTag_tagId_idx" ON "CirclePostTag"("tagId");

CREATE TABLE "CircleNotice" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "actorId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "postId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "readAt" TIMESTAMP(3),

    CONSTRAINT "CircleNotice_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "CircleNotice_userId_createdAt_idx" ON "CircleNotice"("userId", "createdAt");

ALTER TABLE "CircleFollow" ADD CONSTRAINT "CircleFollow_followerId_fkey" FOREIGN KEY ("followerId") REFERENCES "CircleProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "CircleFollow" ADD CONSTRAINT "CircleFollow_followingId_fkey" FOREIGN KEY ("followingId") REFERENCES "CircleProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "CircleBlock" ADD CONSTRAINT "CircleBlock_blockerId_fkey" FOREIGN KEY ("blockerId") REFERENCES "CircleProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "CircleBlock" ADD CONSTRAINT "CircleBlock_blockedId_fkey" FOREIGN KEY ("blockedId") REFERENCES "CircleProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "CirclePost" ADD CONSTRAINT "CirclePost_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "CircleProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "CirclePost" ADD CONSTRAINT "CirclePost_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "CircleComment" ADD CONSTRAINT "CircleComment_postId_fkey" FOREIGN KEY ("postId") REFERENCES "CirclePost"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "CircleComment" ADD CONSTRAINT "CircleComment_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "CircleProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "CircleReaction" ADD CONSTRAINT "CircleReaction_postId_fkey" FOREIGN KEY ("postId") REFERENCES "CirclePost"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "CircleReaction" ADD CONSTRAINT "CircleReaction_userId_fkey" FOREIGN KEY ("userId") REFERENCES "CircleProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "CircleBookmark" ADD CONSTRAINT "CircleBookmark_postId_fkey" FOREIGN KEY ("postId") REFERENCES "CirclePost"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "CircleBookmark" ADD CONSTRAINT "CircleBookmark_userId_fkey" FOREIGN KEY ("userId") REFERENCES "CircleProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "CirclePostTag" ADD CONSTRAINT "CirclePostTag_postId_fkey" FOREIGN KEY ("postId") REFERENCES "CirclePost"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "CirclePostTag" ADD CONSTRAINT "CirclePostTag_tagId_fkey" FOREIGN KEY ("tagId") REFERENCES "CircleTag"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "CircleNotice" ADD CONSTRAINT "CircleNotice_userId_fkey" FOREIGN KEY ("userId") REFERENCES "CircleProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "CircleNotice" ADD CONSTRAINT "CircleNotice_actorId_fkey" FOREIGN KEY ("actorId") REFERENCES "CircleProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "CircleNotice" ADD CONSTRAINT "CircleNotice_postId_fkey" FOREIGN KEY ("postId") REFERENCES "CirclePost"("id") ON DELETE CASCADE ON UPDATE CASCADE;
