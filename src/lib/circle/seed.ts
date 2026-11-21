import type { PrismaClient } from "../../generated/prisma/client";
import { extractTags } from "./richtext";
import { sampleComments, sampleFollows, samplePosts, sampleProfiles, sampleReactions } from "./samples";

function blob(body: { en: string; ar: string; fa: string }) {
  return [body.en, body.ar, body.fa].filter(Boolean).join("\n");
}

/** Upserts the labeled sample circle. Safe to run more than once. */
export async function upsertCircleSamples(db: PrismaClient) {
  for (const person of sampleProfiles) {
    await db.circleProfile.upsert({
      where: { id: person.id },
      create: { ...person, sample: true },
      update: {
        handle: person.handle,
        displayName: person.displayName,
        role: person.role,
        bio: person.bio,
        city: person.city,
        focus: person.focus,
        sample: true,
      },
    });
  }

  const sampleDesks = [
    ["circle-layla", "creek-atelier"],
    ["circle-omar", "southlight"],
    ["circle-nour", "bahr-house"],
    ["circle-nour", "sohar-yard"],
  ] as const;
  for (const [profileId, projectId] of sampleDesks) {
    const project = await db.project.findUnique({ where: { id: projectId }, select: { id: true } });
    if (!project) continue;
    await db.circleDesk.upsert({
      where: { profileId_projectId: { profileId, projectId } },
      create: { profileId, projectId },
      update: {},
    });
  }

  for (const [followerId, followingId] of sampleFollows) {
    await db.circleFollow.upsert({
      where: { followerId_followingId: { followerId, followingId } },
      create: { followerId, followingId },
      update: {},
    });
  }

  for (const post of samplePosts) {
    const project = post.projectId
      ? await db.project.findUnique({ where: { id: post.projectId }, select: { id: true } })
      : null;
    await db.circlePost.upsert({
      where: { id: post.id },
      create: {
        id: post.id,
        authorId: post.authorId,
        body: post.body,
        kind: post.kind,
        visibility: post.visibility,
        projectId: project?.id ?? null,
        sample: true,
        createdAt: new Date(post.createdAt),
      },
      update: {
        body: post.body,
        kind: post.kind,
        visibility: post.visibility,
        projectId: project?.id ?? null,
        sample: true,
      },
    });
    await indexTags(db, post.id, blob(post.body));
  }

  for (const comment of sampleComments) {
    await db.circleComment.upsert({
      where: { id: comment.id },
      create: {
        id: comment.id,
        postId: comment.postId,
        authorId: comment.authorId,
        body: comment.body,
        createdAt: new Date(comment.createdAt),
      },
      update: { body: comment.body },
    });
  }

  for (const [postId, userId, type] of sampleReactions) {
    await db.circleReaction.upsert({
      where: { postId_userId: { postId, userId } },
      create: { postId, userId, type },
      update: {},
    });
  }
}

async function indexTags(db: PrismaClient, postId: string, body: string) {
  const tags = extractTags(body);
  const existing = await db.circlePostTag.findMany({
    where: { postId },
    select: { tagId: true, tag: { select: { tag: true } } },
  });
  const have = existing.map((row) => row.tag.tag).sort().join("\n");
  const want = [...tags].sort().join("\n");
  if (have === want) return;
  if (existing.length) {
    await db.circleTag.updateMany({
      where: { id: { in: existing.map((row) => row.tagId) } },
      data: { useCount: { decrement: 1 } },
    });
    await db.circlePostTag.deleteMany({ where: { postId } });
  }
  for (const tag of tags) {
    const row = await db.circleTag.upsert({
      where: { tag },
      create: { tag, useCount: 1 },
      update: { useCount: { increment: 1 } },
    });
    await db.circlePostTag.create({ data: { postId, tagId: row.id } });
  }
}
