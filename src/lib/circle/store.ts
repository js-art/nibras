import { FALLBACK_IMAGE, pick, type LocaleText } from "@/data/atlas";
import { db } from "@/lib/db";
import { hashPassword, verifyPassword } from "@/lib/password";
import { upsertCircleSamples } from "@/lib/circle/seed";
import { extractMentions, extractTags } from "@/lib/circle/richtext";
import type {
  CircleAuthor,
  CircleNoticeView,
  CirclePerson,
  CirclePostView,
  CircleRole,
  CircleTagView,
  CircleViewer,
  FeedScope,
  NeighbourhoodChoice,
  PostKind,
  ProjectChoice,
  ReactionKind,
  Visibility,
} from "@/lib/circle/types";
import { CIRCLE_ROLES, POST_KINDS, REACTION_KINDS, VISIBILITIES } from "@/lib/circle/types";
import { inCountry, parsePlace, pointRing, type CirclePlace, type LngLat } from "@/lib/circle/place";
import { noteHtml, notePlain } from "@/lib/circle/html";
import { meetPerson } from "@/lib/circle/meet-login";

export class CircleError extends Error {
  status: number;
  constructor(code: string, status = 400) {
    super(code);
    this.name = "CircleError";
    this.status = status;
  }
}

const HANDLE = /^[a-z0-9._]{3,24}$/;
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

let ready: Promise<void> | null = null;

export function ensureCircleSeed() {
  ready ??= upsertCircleSamples(db).catch((error: unknown) => {
    ready = null;
    throw error;
  });
  return ready;
}

function asRole(value: string): CircleRole {
  return CIRCLE_ROLES.includes(value as CircleRole) ? (value as CircleRole) : "agent";
}

function asKind(value: string): PostKind {
  return POST_KINDS.includes(value as PostKind) ? (value as PostKind) : "note";
}

function asVisibility(value: string): Visibility {
  return VISIBILITIES.includes(value as Visibility) ? (value as Visibility) : "circle";
}

function asReaction(value: string): ReactionKind | null {
  return REACTION_KINDS.includes(value as ReactionKind) ? (value as ReactionKind) : null;
}

function asText(value: unknown): LocaleText {
  if (value && typeof value === "object") {
    const row = value as Partial<LocaleText>;
    return {
      en: typeof row.en === "string" ? row.en : "",
      ar: typeof row.ar === "string" ? row.ar : "",
      fa: typeof row.fa === "string" ? row.fa : "",
    };
  }
  if (typeof value === "string") return { en: value, ar: "", fa: "" };
  return { en: "", ar: "", fa: "" };
}

function authorOf(row: {
  id: string;
  handle: string;
  displayName: string;
  role: string;
  city: string;
  sample: boolean;
}): CircleAuthor {
  return {
    id: row.id,
    handle: row.handle,
    displayName: row.displayName,
    role: asRole(row.role),
    city: row.city,
    sample: row.sample,
  };
}

const postInclude = {
  author: true,
  project: { select: { id: true, names: true, point: true } },
  reactions: { select: { type: true, userId: true } },
  bookmarks: { select: { userId: true } },
  comments: {
    orderBy: { createdAt: "asc" as const },
    take: 30,
    include: { author: true },
  },
  _count: { select: { comments: true } },
};

type PostRow = {
  id: string;
  body: unknown;
  kind: string;
  visibility: string;
  sample: boolean;
  createdAt: Date;
  author: {
    id: string;
    handle: string;
    displayName: string;
    role: string;
    city: string;
    sample: boolean;
    banned: boolean;
  };
  project: { id: string; names: unknown; point: unknown } | null;
  reactions: { type: string; userId: string }[];
  bookmarks: { userId: string }[];
  comments: {
    id: string;
    body: string;
    createdAt: Date;
    author: {
      id: string;
      handle: string;
      displayName: string;
      role: string;
      city: string;
      sample: boolean;
      banned: boolean;
    };
  }[];
  _count: { comments: number };
  place?: unknown;
};

function formatWhen(locale: string, date: Date) {
  return new Intl.DateTimeFormat(locale === "fa" ? "fa-IR" : locale === "ar" ? "ar-AE" : "en-GB", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "Asia/Dubai",
  }).format(date);
}

async function answerSets(projectIds: string[]) {
  const ids = [...new Set(projectIds.filter(Boolean))];
  if (!ids.length) return new Map<string, Set<string>>();
  const rows = await db.circleDesk.findMany({
    where: { projectId: { in: ids } },
    select: { projectId: true, profileId: true },
  });
  const map = new Map<string, Set<string>>();
  for (const row of rows) {
    const set = map.get(row.projectId) ?? new Set<string>();
    set.add(row.profileId);
    map.set(row.projectId, set);
  }
  return map;
}

async function present(rows: PostRow[], locale: string, viewerId?: string) {
  const holders = await answerSets(rows.flatMap((row) => (row.project ? [row.project.id] : [])));
  return rows.map((row) => serializePost(row, locale, viewerId, row.project ? holders.get(row.project.id) : undefined));
}

function serializePost(row: PostRow, locale: string, viewerId?: string, holders?: Set<string>): CirclePostView {
  const reactions = Object.fromEntries(REACTION_KINDS.map((kind) => [kind, 0])) as CirclePostView["reactions"];
  let myReaction: ReactionKind | null = null;
  for (const reaction of row.reactions) {
    const kind = asReaction(reaction.type);
    if (!kind) continue;
    reactions[kind] += 1;
    if (viewerId && reaction.userId === viewerId) myReaction = kind;
  }
  return {
    id: row.id,
    body: noteHtml(pick(asText(row.body), locale)),
    kind: asKind(row.kind),
    visibility: asVisibility(row.visibility),
    createdAt: row.createdAt.toISOString(),
    when: formatWhen(locale, row.createdAt),
    sample: row.sample,
    canAnswer: Boolean(viewerId && holders?.has(viewerId)),
    author: authorOf(row.author),
    project: row.project
      ? { id: row.project.id, name: pick(asText(row.project.names), locale), point: asPoint(row.project.point) ?? null }
      : null,
    place: parsePlace(row.place) ?? null,
    reactions,
    myReaction,
    commentCount: row._count.comments,
    comments: row.comments.filter((comment) => !comment.author.banned).map((comment) => ({
      id: comment.id,
      body: comment.body,
      createdAt: comment.createdAt.toISOString(),
      answer: Boolean(holders?.has(comment.author.id)),
      author: authorOf(comment.author),
    })),
    bookmarked: Boolean(viewerId && row.bookmarks.some((mark) => mark.userId === viewerId)),
  };
}

async function blockedIds(userId: string): Promise<string[]> {
  const rows = await db.circleBlock.findMany({
    where: { OR: [{ blockerId: userId }, { blockedId: userId }] },
    select: { blockerId: true, blockedId: true },
  });
  const ids = new Set<string>();
  for (const row of rows) {
    if (row.blockerId !== userId) ids.add(row.blockerId);
    if (row.blockedId !== userId) ids.add(row.blockedId);
  }
  return [...ids];
}

async function followingIds(userId: string): Promise<string[]> {
  const rows = await db.circleFollow.findMany({
    where: { followerId: userId },
    select: { followingId: true },
  });
  return [userId, ...rows.map((row) => row.followingId)];
}

async function notify(userId: string, actorId: string, type: string, postId?: string | null) {
  if (!userId || userId === actorId) return;
  try {
    await db.circleNotice.create({
      data: { userId, actorId, type, postId: postId ?? null },
    });
  } catch {
    // A notice must not fail the action that produced it.
  }
}

async function notifyMentions(body: string, actorId: string, postId: string) {
  const handles = extractMentions(body);
  if (!handles.length) return;
  const users = await db.circleProfile.findMany({
    where: { handle: { in: handles } },
    select: { id: true },
  });
  await Promise.all(users.map((user) => notify(user.id, actorId, "mention", postId)));
}

async function indexHashtags(postId: string, body: string) {
  const tags = extractTags(body);
  for (const tag of tags) {
    const existing = await db.circleTag.findUnique({ where: { tag }, select: { id: true } });
    if (existing) {
      const link = await db.circlePostTag.findUnique({
        where: { postId_tagId: { postId, tagId: existing.id } },
        select: { postId: true },
      });
      if (link) continue;
      await db.circleTag.update({ where: { id: existing.id }, data: { useCount: { increment: 1 } } });
      await db.circlePostTag.create({ data: { postId, tagId: existing.id } });
      continue;
    }
    const created = await db.circleTag.create({ data: { tag, useCount: 1 } });
    await db.circlePostTag.create({ data: { postId, tagId: created.id } });
  }
}

function packPeople(
  rows: {
    id: string;
    handle: string;
    displayName: string;
    role: string;
    bio: string;
    city: string;
    focus: string;
    sample: boolean;
  }[],
  edges: { followerId: string; followingId: string }[],
  viewerId?: string,
): CirclePerson[] {
  const followers = new Map<string, number>();
  const following = new Map<string, number>();
  const mine = new Set<string>();
  for (const edge of edges) {
    followers.set(edge.followingId, (followers.get(edge.followingId) ?? 0) + 1);
    following.set(edge.followerId, (following.get(edge.followerId) ?? 0) + 1);
    if (viewerId && edge.followerId === viewerId) mine.add(edge.followingId);
  }
  return rows.map((row) => ({
    id: row.id,
    handle: row.handle,
    displayName: row.displayName,
    role: asRole(row.role),
    bio: row.bio,
    city: row.city,
    focus: row.focus,
    sample: row.sample,
    followers: followers.get(row.id) ?? 0,
    following: following.get(row.id) ?? 0,
    followedByMe: mine.has(row.id),
  }));
}

export async function listPeople(viewerId?: string, role?: CircleRole): Promise<CirclePerson[]> {
  await ensureCircleSeed();
  const hidden = viewerId ? await blockedIds(viewerId) : [];
  const rows = await db.circleProfile.findMany({
    where: {
      ...(role ? { role } : {}),
      banned: false,
      ...(hidden.length ? { id: { notIn: hidden } } : {}),
    },
    orderBy: [{ sample: "desc" }, { displayName: "asc" }],
  });
  const ids = rows.map((row) => row.id);
  const edges = ids.length
    ? await db.circleFollow.findMany({
        where: { OR: [{ followerId: { in: ids } }, { followingId: { in: ids } }] },
        select: { followerId: true, followingId: true },
      })
    : [];
  return packPeople(rows, edges, viewerId);
}

export async function listTags(viewerId?: string): Promise<CircleTagView[]> {
  await ensureCircleSeed();
  const hidden = viewerId ? await blockedIds(viewerId) : [];
  const followed = viewerId ? await followingIds(viewerId) : [];
  const seen = viewerId ? [...new Set([...followed, viewerId])] : [];
  const links = await db.circlePostTag.findMany({
    where: {
      post: {
        AND: [
          ...(hidden.length ? [{ authorId: { notIn: hidden } }] : []),
          viewerId
            ? { OR: [{ visibility: "circle" }, { visibility: "followers", authorId: { in: seen } }] }
            : { visibility: "circle" },
        ],
      },
    },
    select: { tag: { select: { tag: true } } },
  });
  const counts = new Map<string, number>();
  for (const link of links) counts.set(link.tag.tag, (counts.get(link.tag.tag) ?? 0) + 1);
  return [...counts.entries()]
    .filter(([, useCount]) => useCount > 0)
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
    .slice(0, 12)
    .map(([tag, useCount]) => ({ tag, useCount }));
}

function asPoint(value: unknown): [number, number] | undefined {
  if (!Array.isArray(value) || value.length < 2) return undefined;
  const lng = Number(value[0]);
  const lat = Number(value[1]);
  if (!Number.isFinite(lng) || !Number.isFinite(lat)) return undefined;
  return [lng, lat];
}

function asRing(value: unknown): LngLat[] {
  if (!Array.isArray(value)) return [];
  const ring = value.map(asPoint).filter((item): item is LngLat => Boolean(item));
  const open =
    ring.length >= 2 && ring[0][0] === ring[ring.length - 1][0] && ring[0][1] === ring[ring.length - 1][1]
      ? ring.slice(0, -1)
      : ring;
  return open;
}

export async function listNeighbourhoods(locale: string): Promise<NeighbourhoodChoice[]> {
  const rows = await db.area.findMany({
    select: {
      id: true,
      names: true,
      center: true,
      ring: true,
      city: { select: { id: true, country: true, names: true } },
    },
    orderBy: { id: "asc" },
  });
  const choices: NeighbourhoodChoice[] = [];
  for (const row of rows) {
    const country = row.city.country === "om" ? "om" : row.city.country === "ae" ? "ae" : null;
    const center = asPoint(row.center);
    const ring = asRing(row.ring);
    if (!country || !center || ring.length < 3) continue;
    choices.push({
      id: row.id,
      name: pick(asText(row.names), locale),
      cityId: row.city.id,
      cityName: pick(asText(row.city.names), locale),
      country,
      center,
      ring,
    });
  }
  return choices;
}

export async function listProjects(locale: string): Promise<ProjectChoice[]> {
  const rows = await db.project.findMany({
    where: { OR: [{ introducedById: null }, { introducedBy: { banned: false } }] },
    select: {
      id: true,
      names: true,
      point: true,
      introducedBy: { select: { handle: true, displayName: true } },
      area: { select: { id: true, names: true, center: true, city: { select: { country: true } } } },
    },
    orderBy: { id: "asc" },
  });
  return rows.map((row) => {
    const country = row.area.city.country === "om" ? "om" : row.area.city.country === "ae" ? "ae" : undefined;
    return {
      id: row.id,
      name: pick(asText(row.names), locale),
      areaId: row.area.id,
      areaName: pick(asText(row.area.names), locale),
      country,
      point: asPoint(row.point) ?? asPoint(row.area.center),
      areaPoint: asPoint(row.area.center),
      introducedBy: row.introducedBy,
    };
  });
}

export async function listFeed(input: {
  locale: string;
  viewerId?: string;
  scope?: FeedScope;
  tag?: string;
  projectId?: string;
}): Promise<CirclePostView[]> {
  await ensureCircleSeed();
  const scope = input.scope ?? "circle";
  const hidden = input.viewerId ? await blockedIds(input.viewerId) : [];
  const followed = input.viewerId ? await followingIds(input.viewerId) : [];
  const and: Record<string, unknown>[] = [];
  if (hidden.length) and.push({ authorId: { notIn: hidden } });
  and.push({ author: { banned: false } });
  if (input.tag) and.push({ tags: { some: { tag: { tag: input.tag.toLowerCase() } } } });
  if (input.projectId) and.push({ projectId: input.projectId });

  if (scope === "following") {
    if (!input.viewerId) return [];
    and.push({ authorId: { in: followed } });
  } else if (scope === "agents" || scope === "investors" || scope === "buyers" || scope === "sellers") {
    const role = scope === "agents" ? "agent" : scope === "investors" ? "investor" : scope === "buyers" ? "buyer" : "seller";
    and.push({ visibility: "circle", author: { role } });
  } else if (input.viewerId) {
    const seen = [...new Set([...followed, input.viewerId])];
    and.push({
      OR: [{ visibility: "circle" }, { visibility: "followers", authorId: { in: seen } }],
    });
  } else {
    and.push({ visibility: "circle" });
  }

  const rows = await db.circlePost.findMany({
    where: and.length ? { AND: and } : {},
    orderBy: { createdAt: "desc" },
    take: 40,
    include: postInclude,
  });
  return present(rows, input.locale, input.viewerId);
}

export async function listSaved(locale: string, viewerId: string): Promise<CirclePostView[]> {
  await ensureCircleSeed();
  const hidden = await blockedIds(viewerId);
  const marks = await db.circleBookmark.findMany({
    where: {
      userId: viewerId,
      post: { author: { banned: false }, ...(hidden.length ? { authorId: { notIn: hidden } } : {}) },
    },
    orderBy: { createdAt: "desc" },
    take: 40,
    select: { postId: true },
  });
  if (!marks.length) return [];
  const rows = await db.circlePost.findMany({
    where: { id: { in: marks.map((mark) => mark.postId) } },
    include: postInclude,
  });
  const order = new Map(marks.map((mark, index) => [mark.postId, index]));
  rows.sort((a, b) => (order.get(a.id) ?? 0) - (order.get(b.id) ?? 0));
  return present(rows, locale, viewerId);
}

export async function getPost(id: string, locale: string, viewerId?: string): Promise<CirclePostView | null> {
  await ensureCircleSeed();
  const row = await db.circlePost.findUnique({ where: { id }, include: postInclude });
  if (!row || row.author.banned) return null;
  if (row.visibility === "followers") {
    if (!viewerId) return null;
    const followed = await followingIds(viewerId);
    if (!followed.includes(row.authorId)) return null;
  }
  if (viewerId) {
    const hidden = await blockedIds(viewerId);
    if (hidden.includes(row.authorId)) return null;
  }
  const [post] = await present([row], locale, viewerId);
  return post;
}

export async function listMapPlaces(locale: string) {
  await ensureCircleSeed();
  const rows = await db.circlePost.findMany({
    where: { visibility: "circle", author: { banned: false } },
    orderBy: { createdAt: "desc" },
    take: 300,
    select: {
      id: true,
      body: true,
      place: true,
      createdAt: true,
      author: { select: { handle: true, displayName: true } },
    },
  });
  const places: {
    id: string;
    body: string;
    createdAt: string;
    author: { handle: string; displayName: string };
    place: CirclePlace;
  }[] = [];
  for (const row of rows) {
    const place = parsePlace(row.place);
    if (!place) continue;
    places.push({
      id: row.id,
      body: notePlain(pick(asText(row.body), locale)),
      createdAt: row.createdAt.toISOString(),
      author: row.author,
      place,
    });
    if (places.length >= 180) break;
  }
  return places;
}

export async function getProfile(handle: string, locale: string, viewerId?: string) {
  await ensureCircleSeed();
  const row = await db.circleProfile.findUnique({ where: { handle: handle.toLowerCase() } });
  if (!row || row.banned) return null;
  const hidden = viewerId ? await blockedIds(viewerId) : [];
  const blocked = hidden.includes(row.id);
  const edges = await db.circleFollow.findMany({
    where: { OR: [{ followerId: row.id }, { followingId: row.id }] },
    select: { followerId: true, followingId: true },
  });
  const [person] = packPeople([row], edges, viewerId);
  if (blocked) return { person, posts: [] as CirclePostView[], desks: [] as ProjectChoice[], blocked: true };
  const followed = viewerId ? await followingIds(viewerId) : [];
  const posts = await db.circlePost.findMany({
    where: {
      authorId: row.id,
      OR: [
        { visibility: "circle" },
        ...(viewerId && followed.includes(row.id) ? [{ visibility: "followers" as const }] : []),
      ],
    },
    orderBy: { createdAt: "desc" },
    include: postInclude,
  });
  return {
    person,
    posts: await present(posts, locale, viewerId),
    desks: await listProfileDesks(row.id, locale),
    blocked: false,
  };
}

export async function listProfileDesks(profileId: string, locale: string): Promise<ProjectChoice[]> {
  const rows = await db.circleDesk.findMany({
    where: { profileId },
    include: { project: { select: { id: true, names: true } } },
    orderBy: { createdAt: "asc" },
  });
  return rows.map((row) => ({ id: row.project.id, name: pick(asText(row.project.names), locale) }));
}

export async function listProjectDesk(projectId: string) {
  const rows = await db.circleDesk.findMany({
    where: { projectId, profile: { banned: false } },
    include: { profile: { select: { handle: true, displayName: true, role: true } } },
    orderBy: { createdAt: "asc" },
  });
  return rows.map((row) => ({
    handle: row.profile.handle,
    displayName: row.profile.displayName,
    role: asRole(row.profile.role),
  }));
}

export async function toggleDesk(viewer: CircleViewer | null, projectId: string) {
  const actor = await requireViewer(viewer);
  if (actor.role !== "agent" && actor.role !== "seller") throw new CircleError("role", 403);
  const project = await db.project.findUnique({ where: { id: projectId }, select: { id: true } });
  if (!project) throw new CircleError("project", 400);
  const key = { profileId: actor.id, projectId: project.id };
  const existing = await db.circleDesk.findUnique({ where: { profileId_projectId: key } });
  if (existing) {
    await db.circleDesk.delete({ where: { profileId_projectId: key } });
    return { claimed: false };
  }
  await db.circleDesk.create({ data: key });
  return { claimed: true };
}

function ringHolds(ring: LngLat[], point: LngLat) {
  const [x, y] = point;
  let inside = false;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const [xi, yi] = ring[i];
    const [xj, yj] = ring[j];
    const crosses = yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi + 0.0) + xi;
    if (crosses) inside = !inside;
  }
  return inside;
}

function ringAroundPin(pin: LngLat, yard: LngLat[]) {
  const base = pointRing(pin).slice(0, -1);
  let scale = 1;
  for (let step = 0; step < 8; step += 1) {
    const ring = base.map(
      ([lng, lat]) => [pin[0] + (lng - pin[0]) * scale, pin[1] + (lat - pin[1]) * scale] as LngLat,
    );
    if (ring.every((point) => ringHolds(yard, point))) return [...ring, ring[0]];
    scale *= 0.5;
  }
  return null;
}

const PROJECT_KINDS = ["apartment", "villa", "townhouse"] as const;

function boundedNumber(value: unknown, max: number) {
  const folded = String(value ?? "")
    .replace(/[۰-۹]/g, (digit) => String("۰۱۲۳۴۵۶۷۸۹".indexOf(digit)))
    .replace(/[٠-٩]/g, (digit) => String("٠١٢٣٤٥٦٧٨٩".indexOf(digit)))
    .replace(/,/g, "")
    .trim();
  const number = typeof value === "number" ? value : Number(folded);
  if (!Number.isFinite(number) || number <= 0) return 0;
  return Math.min(max, number);
}

export function projectDetails(input: {
  kind?: unknown;
  startPrice?: unknown;
  handover?: unknown;
  sizeMin?: unknown;
  sizeMax?: unknown;
  unitCount?: unknown;
}) {
  const kind = PROJECT_KINDS.includes(input.kind as (typeof PROJECT_KINDS)[number])
    ? (input.kind as (typeof PROJECT_KINDS)[number])
    : "apartment";
  let sizeMin = boundedNumber(input.sizeMin, 1_000_000);
  let sizeMax = boundedNumber(input.sizeMax, 1_000_000);
  if (sizeMin > 0 && sizeMax === 0) sizeMax = sizeMin;
  if (sizeMax > 0 && sizeMin === 0) sizeMin = sizeMax;
  if (sizeMin > sizeMax) [sizeMin, sizeMax] = [sizeMax, sizeMin];
  return {
    kind,
    startPrice: boundedNumber(input.startPrice, 1_000_000_000_000),
    handover: String(input.handover ?? "").trim().slice(0, 40),
    sizeMin,
    sizeMax,
    unitCount: Math.round(boundedNumber(input.unitCount, 100_000)),
  };
}

export async function introduceProject(
  viewer: CircleViewer | null,
  input: {
    name: string;
    body: string;
    locale: string;
    areaId?: string;
    point?: unknown;
    kind?: unknown;
    startPrice?: unknown;
    handover?: unknown;
    sizeMin?: unknown;
    sizeMax?: unknown;
    unitCount?: unknown;
  },
) {
  const actor = await requireViewer(viewer);
  const profile = await db.circleProfile.findUnique({ where: { id: actor.id }, select: { sample: true } });
  if (!profile || profile.sample) throw new CircleError("role", 403);
  const name = input.name.trim();
  const intro = input.body.trim();
  if (name.length < 2 || name.length > 80) throw new CircleError("name", 400);
  if (intro.length < 1 || intro.length > 2000) throw new CircleError("body", 400);
  const area = await db.area.findUnique({
    where: { id: String(input.areaId ?? "") },
    select: { id: true, ring: true, city: { select: { country: true } } },
  });
  const country = area?.city.country === "om" ? "om" : area?.city.country === "ae" ? "ae" : null;
  const yard = asRing(area?.ring);
  const pin = asPoint(input.point);
  if (!area || !country || yard.length < 3 || !pin || !inCountry(country, pin) || !ringHolds(yard, pin)) throw new CircleError("place", 400);
  const ring = ringAroundPin(pin, yard);
  if (!ring) throw new CircleError("place", 400);
  const point = pin;
  const developer = await db.developer.findFirst({ select: { id: true }, orderBy: { id: "asc" } });
  if (!developer) throw new CircleError("project", 400);
  const id = `yard-${crypto.randomUUID().slice(0, 8)}`;
  const text = { en: name, ar: name, fa: name };
  const about = { en: intro, ar: intro, fa: intro };
  const facts = projectDetails(input);
  await db.project.create({
    data: {
      id,
      areaId: area.id,
      introducedById: actor.id,
      developerId: developer.id,
      kind: facts.kind,
      handover: facts.handover,
      startPrice: facts.startPrice,
      sizeMin: facts.sizeMin,
      sizeMax: facts.sizeMax,
      unitCount: facts.unitCount,
      currency: country === "om" ? "OMR" : "AED",
      point,
      ring,
      image: FALLBACK_IMAGE,
      names: text,
      about,
      whatsapp: "",
      phone: "",
      units: [],
      payment: [],
      brochure: {},
    },
  });
  await db.circleDesk.create({ data: { profileId: actor.id, projectId: id } });
  try {
    const post = await createPost(viewer, {
      body: intro,
      kind: "note",
      visibility: "circle",
      projectId: id,
      locale: input.locale,
    });
    const { ensureProjectChannel } = await import("@/lib/meet-channel");
    await ensureProjectChannel({ id, name });
    return { id, name, postId: post?.id ?? "" };
  } catch (error) {
    await db.project.delete({ where: { id } }).catch(() => undefined);
    throw error;
  }
}

export async function listNotices(viewerId: string, locale: string): Promise<CircleNoticeView[]> {
  await ensureCircleSeed();
  const rows = await db.circleNotice.findMany({
    where: { userId: viewerId },
    orderBy: { createdAt: "desc" },
    take: 20,
    include: { actor: true },
  });
  return rows.map((row) => ({
    id: row.id,
    type: row.type,
    createdAt: row.createdAt.toISOString(),
    when: formatWhen(locale, row.createdAt),
    postId: row.postId,
    actor: authorOf(row.actor),
  }));
}

export async function listProjectNotes(projectId: string, locale: string, viewerId?: string) {
  return listFeed({ locale, viewerId, projectId, scope: "circle" });
}

async function requireViewer(viewer: CircleViewer | null): Promise<CircleViewer> {
  if (!viewer) throw new CircleError("auth", 401);
  const row = await db.circleProfile.findUnique({ where: { id: viewer.id }, select: { banned: true } });
  if (!row || row.banned) throw new CircleError("banned", 403);
  return viewer;
}

export async function communityVoices() {
  const rows = await db.project.findMany({
    where: { introducedById: { not: null }, introducedBy: { banned: false } },
    select: { id: true, introducedBy: { select: { handle: true, displayName: true } } },
  });
  const voices: Record<string, { handle: string; displayName: string }> = {};
  for (const row of rows) {
    if (row.introducedBy) voices[row.id] = row.introducedBy;
  }
  return voices;
}

export async function updateIntroducedProject(
  viewer: CircleViewer | null,
  projectId: string,
  input: {
    kind?: unknown;
    startPrice?: unknown;
    handover?: unknown;
    sizeMin?: unknown;
    sizeMax?: unknown;
    unitCount?: unknown;
  },
) {
  const actor = await requireViewer(viewer);
  const profile = await db.circleProfile.findUnique({ where: { id: actor.id }, select: { sample: true } });
  if (!profile || profile.sample) throw new CircleError("role", 403);
  const row = await db.project.findUnique({ where: { id: projectId }, select: { introducedById: true } });
  if (!row?.introducedById || row.introducedById !== actor.id) throw new CircleError("role", 403);
  const facts = projectDetails(input);
  await db.project.update({
    where: { id: projectId },
    data: { ...facts, updatedAt: new Date() },
  });
  return { id: projectId, ...facts };
}

export async function projectFacts(projectId: string) {
  const row = await db.project.findUnique({
    where: { id: projectId },
    select: {
      introducedById: true,
      kind: true,
      startPrice: true,
      handover: true,
      sizeMin: true,
      sizeMax: true,
      unitCount: true,
      currency: true,
    },
  });
  if (!row?.introducedById) return null;
  const kind: "apartment" | "villa" | "townhouse" =
    row.kind === "villa" ? "villa" : row.kind === "townhouse" ? "townhouse" : "apartment";
  return {
    kind,
    startPrice: row.startPrice,
    handover: row.handover,
    sizeMin: row.sizeMin,
    sizeMax: row.sizeMax,
    unitCount: row.unitCount,
    currency: row.currency === "OMR" ? "OMR" as const : "AED" as const,
  };
}

export async function projectVoice(projectId: string) {
  const row = await db.project.findUnique({
    where: { id: projectId },
    select: { introducedBy: { select: { id: true, handle: true, displayName: true, banned: true } } },
  });
  return row?.introducedBy ?? null;
}

export async function listIntroducedProjects(locale: string) {
  const rows = await db.project.findMany({
    where: { introducedById: { not: null } },
    orderBy: { updatedAt: "desc" },
    include: {
      introducedBy: { select: { id: true, handle: true, displayName: true, banned: true, sample: true } },
      area: { select: { names: true } },
      circlePosts: {
        orderBy: { createdAt: "desc" },
        take: 12,
        select: {
          id: true,
          body: true,
          sample: true,
          author: { select: { id: true, handle: true, displayName: true } },
        },
      },
    },
  });
  return rows.flatMap((row) => {
    if (!row.introducedBy) return [];
    return [{
      id: row.id,
      name: pick(asText(row.names), locale),
      area: pick(asText(row.area.names), locale),
      person: row.introducedBy,
      posts: row.circlePosts.map((post) => ({
        id: post.id,
        body: notePlain(pick(asText(post.body), locale)),
        sample: post.sample,
        author: post.author,
      })),
    }];
  });
}

export async function adminUpdatePost(postId: string, body: string) {
  const text = noteHtml(body);
  const plain = notePlain(text);
  if (plain.length < 1 || plain.length > 2000 || text.length > 20000) throw new CircleError("body", 400);
  const post = await db.circlePost.findUnique({ where: { id: postId }, select: { sample: true } });
  if (!post || post.sample) throw new CircleError("own", 403);
  const next = { en: text, ar: text, fa: text };
  await db.circlePost.update({ where: { id: postId }, data: { body: next } });
  await indexHashtags(postId, text);
  return { ok: true };
}

export async function adminRemovePost(postId: string) {
  const post = await db.circlePost.findUnique({ where: { id: postId }, select: { sample: true } });
  if (!post || post.sample) throw new CircleError("own", 403);
  await db.circlePost.delete({ where: { id: postId } });
  return { ok: true };
}

export async function setCircleBan(profileId: string, banned: boolean) {
  const profile = await db.circleProfile.findUnique({ where: { id: profileId }, select: { sample: true } });
  if (!profile || profile.sample) throw new CircleError("own", 403);
  await db.circleProfile.update({ where: { id: profileId }, data: { banned } });
  return { banned };
}

function viewerFrom(row: {
  id: string;
  handle: string;
  displayName: string;
  role: string;
  city: string;
  focus: string;
  sample: boolean;
}): CircleViewer {
  return {
    id: row.id,
    handle: row.handle,
    displayName: row.displayName,
    role: asRole(row.role),
    city: row.city,
    focus: row.focus,
    sample: row.sample,
  };
}

async function openFromMeet(email: string, password: string) {
  const meet = await meetPerson(email, password);
  if (!meet) return null;
  const wanted = meet.username.trim().toLowerCase();
  const sameHandle = HANDLE.test(wanted) ? await db.circleProfile.findUnique({ where: { handle: wanted } }) : null;
  if (sameHandle && !sameHandle.email && sameHandle.passwordHash && verifyPassword(password, sameHandle.passwordHash)) {
    return db.circleProfile.update({ where: { id: sameHandle.id }, data: { email } });
  }
  let handle = sameHandle ? "" : wanted;
  if (!HANDLE.test(handle)) {
    const base = (wanted.replace(/[^a-z0-9._]/g, "") || email.split("@")[0]?.replace(/[^a-z0-9._]/g, "") || "member").slice(0, 16);
    handle = "";
    for (let i = 0; i < 6 && !handle; i += 1) {
      const candidate = `${base}${i || ""}`.slice(0, 24);
      if (!HANDLE.test(candidate)) continue;
      const taken = await db.circleProfile.findUnique({ where: { handle: candidate } });
      if (!taken) handle = candidate;
    }
  }
  if (!handle) handle = `m${crypto.randomUUID().replace(/-/g, "").slice(0, 8)}`;
  const displayName = meet.name.trim().slice(0, 60);
  try {
    return await db.circleProfile.create({
      data: {
        id: `circle-${crypto.randomUUID()}`,
        handle,
        email,
        displayName: displayName.length >= 2 ? displayName : handle,
        role: "investor",
        passwordHash: hashPassword(password),
        sample: false,
      },
    });
  } catch {
    return db.circleProfile.findUnique({ where: { email } });
  }
}

export async function enterCircle(input: { handle: string; password?: string }): Promise<CircleViewer> {
  await ensureCircleSeed();
  const key = input.handle.trim().toLowerCase().replace(/^@/, "");
  const byEmail = key.includes("@");
  if (byEmail && !EMAIL.test(key)) throw new CircleError("email", 400);
  if (!byEmail && !HANDLE.test(key)) throw new CircleError("handle", 400);
  const password = input.password ?? "";
  let row = byEmail
    ? await db.circleProfile.findUnique({ where: { email: key } })
    : await db.circleProfile.findUnique({ where: { handle: key } });
  if (!row && byEmail) row = await openFromMeet(key, password);
  if (!row) throw new CircleError(byEmail ? "denied" : "missing", byEmail ? 401 : 404);
  if (row.passwordHash) {
    if (!password || !verifyPassword(password, row.passwordHash)) throw new CircleError("denied", 401);
  } else if (!row.sample) {
    throw new CircleError("denied", 401);
  }
  return viewerFrom(row);
}

export async function joinCircle(input: {
  handle: string;
  email?: string;
  displayName: string;
  password: string;
  role: string;
  city?: string;
  focus?: string;
  bio?: string;
}): Promise<CircleViewer> {
  await ensureCircleSeed();
  const handle = input.handle.trim().toLowerCase().replace(/^@/, "");
  const email = (input.email ?? "").trim().toLowerCase();
  const displayName = input.displayName.trim();
  const password = input.password;
  if (!HANDLE.test(handle)) throw new CircleError("handle", 400);
  if (!EMAIL.test(email) || email.length > 120) throw new CircleError("email", 400);
  if (displayName.length < 2 || displayName.length > 60) throw new CircleError("name", 400);
  if (password.trim().length < 8) throw new CircleError("password", 400);
  const role = CIRCLE_ROLES.includes(input.role as CircleRole) ? (input.role as CircleRole) : "";
  if (!role) throw new CircleError("role", 400);
  const taken = await db.circleProfile.findUnique({ where: { handle } });
  if (taken) throw new CircleError("taken", 409);
  const emailTaken = await db.circleProfile.findUnique({ where: { email } });
  if (emailTaken) throw new CircleError("emailTaken", 409);
  const row = await db.circleProfile.create({
    data: {
      id: `circle-${crypto.randomUUID()}`,
      handle,
      email,
      displayName,
      role,
      passwordHash: hashPassword(password),
      city: (input.city ?? "").trim().slice(0, 80),
      focus: (input.focus ?? "").trim().slice(0, 80),
      bio: (input.bio ?? "").trim().slice(0, 280),
      sample: false,
    },
  });
  return {
    id: row.id,
    handle: row.handle,
    displayName: row.displayName,
    role: asRole(row.role),
    city: row.city,
    focus: row.focus,
    sample: row.sample,
  };
}

export async function createPost(
  viewer: CircleViewer | null,
  input: { body: string; kind?: string; visibility?: string; projectId?: string; locale: string; place?: unknown },
) {
  const actor = await requireViewer(viewer);
  const text = noteHtml(input.body);
  const plain = notePlain(text);
  if (plain.length < 1 || plain.length > 2000 || text.length > 20000) throw new CircleError("body", 400);
  const locale = input.locale === "ar" || input.locale === "fa" ? input.locale : "en";
  const body: LocaleText = { en: "", ar: "", fa: "", [locale]: text };
  let projectId: string | null = null;
  if (input.projectId) {
    const project = await db.project.findUnique({ where: { id: input.projectId }, select: { id: true } });
    if (!project) throw new CircleError("project", 400);
    projectId = project.id;
  }
  const place = input.place == null ? null : parsePlace(input.place);
  if (input.place != null && !place) throw new CircleError("place", 400);
  const id = `post-${crypto.randomUUID()}`;
  await db.circlePost.create({
    data: {
      id,
      authorId: actor.id,
      body,
      kind: asKind(input.kind ?? "note"),
      visibility: asVisibility(input.visibility ?? "circle"),
      projectId,
      place: place ?? undefined,
      sample: actor.sample,
    },
  });
  await indexHashtags(id, text);
  await notifyMentions(text, actor.id, id);
  if (projectId) {
    const desks = await db.circleDesk.findMany({ where: { projectId }, select: { profileId: true } });
    await Promise.all(desks.map((desk) => notify(desk.profileId, actor.id, "desk", id)));
  }
  return getPost(id, input.locale, actor.id);
}

export async function toggleFollow(viewer: CircleViewer | null, handle: string) {
  const actor = await requireViewer(viewer);
  const target = await db.circleProfile.findUnique({ where: { handle: handle.toLowerCase() } });
  if (!target) throw new CircleError("missing", 404);
  if (target.id === actor.id) throw new CircleError("self", 400);
  const hidden = await blockedIds(actor.id);
  if (hidden.includes(target.id)) throw new CircleError("blocked", 403);
  const key = { followerId: actor.id, followingId: target.id };
  const existing = await db.circleFollow.findUnique({ where: { followerId_followingId: key } });
  if (existing) {
    await db.circleFollow.delete({ where: { followerId_followingId: key } });
    return { following: false };
  }
  await db.circleFollow.create({ data: key });
  await notify(target.id, actor.id, "follow");
  return { following: true };
}

export async function toggleReaction(viewer: CircleViewer | null, postId: string, type: string) {
  const actor = await requireViewer(viewer);
  const kind = asReaction(type);
  if (!kind) throw new CircleError("type", 400);
  const post = await db.circlePost.findUnique({ where: { id: postId }, select: { id: true, authorId: true } });
  if (!post) throw new CircleError("missing", 404);
  const key = { postId, userId: actor.id };
  const existing = await db.circleReaction.findUnique({ where: { postId_userId: key } });
  if (existing && existing.type === kind) {
    await db.circleReaction.delete({ where: { postId_userId: key } });
    return { reaction: null };
  }
  await db.circleReaction.upsert({
    where: { postId_userId: key },
    create: { ...key, type: kind },
    update: { type: kind },
  });
  await notify(post.authorId, actor.id, "reaction", post.id);
  return { reaction: kind };
}

export async function toggleBookmark(viewer: CircleViewer | null, postId: string) {
  const actor = await requireViewer(viewer);
  const post = await db.circlePost.findUnique({ where: { id: postId }, select: { id: true } });
  if (!post) throw new CircleError("missing", 404);
  const key = { postId, userId: actor.id };
  const existing = await db.circleBookmark.findUnique({ where: { postId_userId: key } });
  if (existing) {
    await db.circleBookmark.delete({ where: { postId_userId: key } });
    return { saved: false };
  }
  await db.circleBookmark.create({ data: key });
  return { saved: true };
}

export async function updatePost(viewer: CircleViewer | null, postId: string, body: string, locale: string) {
  const actor = await requireViewer(viewer);
  const text = noteHtml(body);
  const plain = notePlain(text);
  if (plain.length < 1 || plain.length > 2000 || text.length > 20000) throw new CircleError("body", 400);
  const post = await db.circlePost.findUnique({ where: { id: postId }, select: { authorId: true, sample: true, body: true } });
  if (!post || post.authorId !== actor.id || post.sample) throw new CircleError("own", 403);
  const lang = locale === "ar" || locale === "fa" ? locale : "en";
  const previous = post.body && typeof post.body === "object" ? (post.body as Record<string, string>) : {};
  await db.circlePost.update({ where: { id: postId }, data: { body: { ...previous, [lang]: text } } });
  await indexHashtags(postId, text);
  return { ok: true };
}

export async function removePost(viewer: CircleViewer | null, postId: string) {
  const actor = await requireViewer(viewer);
  const post = await db.circlePost.findUnique({ where: { id: postId }, select: { authorId: true, sample: true } });
  if (!post || post.authorId !== actor.id || post.sample) throw new CircleError("own", 403);
  await db.circlePost.delete({ where: { id: postId } });
  return { ok: true };
}

export async function addComment(viewer: CircleViewer | null, postId: string, body: string) {
  const actor = await requireViewer(viewer);
  const text = body.trim();
  if (text.length < 1 || text.length > 800) throw new CircleError("body", 400);
  const post = await db.circlePost.findUnique({ where: { id: postId }, select: { id: true, authorId: true } });
  if (!post) throw new CircleError("missing", 404);
  await db.circleComment.create({
    data: { postId, authorId: actor.id, body: text },
  });
  await notify(post.authorId, actor.id, "comment", post.id);
  await notifyMentions(text, actor.id, post.id);
  return { ok: true };
}

export async function updateComment(viewer: CircleViewer | null, commentId: string, body: string) {
  const actor = await requireViewer(viewer);
  const text = body.trim();
  if (text.length < 1 || text.length > 800) throw new CircleError("body", 400);
  const comment = await db.circleComment.findUnique({ where: { id: commentId }, select: { authorId: true } });
  if (!comment || comment.authorId !== actor.id) throw new CircleError("own", 403);
  await db.circleComment.update({ where: { id: commentId }, data: { body: text } });
  return { ok: true };
}

export async function removeComment(viewer: CircleViewer | null, commentId: string) {
  const actor = await requireViewer(viewer);
  const comment = await db.circleComment.findUnique({ where: { id: commentId }, select: { authorId: true } });
  if (!comment || comment.authorId !== actor.id) throw new CircleError("own", 403);
  await db.circleComment.delete({ where: { id: commentId } });
  return { ok: true };
}

export async function toggleBlock(viewer: CircleViewer | null, handle: string) {
  const actor = await requireViewer(viewer);
  const target = await db.circleProfile.findUnique({ where: { handle: handle.toLowerCase() } });
  if (!target) throw new CircleError("missing", 404);
  if (target.id === actor.id) throw new CircleError("self", 400);
  const key = { blockerId: actor.id, blockedId: target.id };
  const existing = await db.circleBlock.findUnique({ where: { blockerId_blockedId: key } });
  if (existing) {
    await db.circleBlock.delete({ where: { blockerId_blockedId: key } });
    return { blocked: false };
  }
  await db.circleBlock.create({ data: key });
  await db.circleFollow.deleteMany({
    where: {
      OR: [
        { followerId: actor.id, followingId: target.id },
        { followerId: target.id, followingId: actor.id },
      ],
    },
  });
  return { blocked: true };
}

export async function viewerBlocked(viewerId: string, handle: string) {
  const target = await db.circleProfile.findUnique({ where: { handle: handle.toLowerCase() }, select: { id: true } });
  if (!target) return false;
  const row = await db.circleBlock.findUnique({
    where: { blockerId_blockedId: { blockerId: viewerId, blockedId: target.id } },
  });
  return Boolean(row);
}
