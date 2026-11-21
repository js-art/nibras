import { createHmac, timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";
import { db } from "@/lib/db";
import type { CircleRole, CircleViewer } from "@/lib/circle/types";

export const CIRCLE_COOKIE = "nibras_circle";
const MAX_AGE_MS = 1000 * 60 * 60 * 24 * 14;

function secret() {
  return process.env.ADMIN_SECRET || process.env.ADMIN_PASSWORD || "";
}

export function circleSessionToken(userId: string) {
  const key = secret();
  if (!key) return "";
  const expires = Date.now() + MAX_AGE_MS;
  const body = `${userId}.${expires}`;
  const signature = createHmac("sha256", key).update(body).digest("base64url");
  return `${body}.${signature}`;
}

export function parseCircleToken(token: string | undefined): { userId: string } | null {
  const key = secret();
  if (!token || !key) return null;
  const parts = token.split(".");
  if (parts.length !== 3) return null;
  const [userId, expiresRaw, signature] = parts;
  if (!userId || !expiresRaw || !signature) return null;
  const expires = Number(expiresRaw);
  if (!Number.isFinite(expires) || expires < Date.now()) return null;
  const expected = createHmac("sha256", key).update(`${userId}.${expiresRaw}`).digest("base64url");
  const given = Buffer.from(signature);
  const wanted = Buffer.from(expected);
  if (given.length !== wanted.length || !timingSafeEqual(given, wanted)) return null;
  return { userId };
}

export function circleCookieOptions() {
  return {
    httpOnly: true,
    sameSite: "lax" as const,
    path: "/",
    maxAge: MAX_AGE_MS / 1000,
  };
}

function asRole(value: string): CircleRole {
  return value === "investor" ? "investor" : "agent";
}

export async function getCircleViewer(): Promise<CircleViewer | null> {
  const jar = await cookies();
  const parsed = parseCircleToken(jar.get(CIRCLE_COOKIE)?.value);
  if (!parsed) return null;
  const row = await db.circleProfile.findUnique({ where: { id: parsed.userId } });
  if (!row) return null;
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
