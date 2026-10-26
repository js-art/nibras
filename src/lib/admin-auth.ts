import { createHmac, timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";
import { findUserById, usersConfigured } from "@/lib/users-store";

export const ADMIN_COOKIE = "nibras_admin";

function secret() {
  return process.env.ADMIN_SECRET || process.env.ADMIN_PASSWORD || "";
}

export async function passwordConfigured() {
  return usersConfigured();
}

export function sessionToken(userId: string) {
  const expires = Date.now() + 1000 * 60 * 60 * 12;
  const body = `${userId}.${expires}`;
  const signature = createHmac("sha256", secret()).update(body).digest("base64url");
  return `${body}.${signature}`;
}

export function parseSessionToken(token: string | undefined): { userId: string; expires: number } | null {
  if (!token || !secret()) return null;
  const parts = token.split(".");
  if (parts.length !== 3) return null;
  const [userId, expiresRaw, signature] = parts;
  if (!userId || !expiresRaw || !signature) return null;
  const expires = Number(expiresRaw);
  if (!Number.isFinite(expires) || expires < Date.now()) return null;
  const body = `${userId}.${expiresRaw}`;
  const expected = createHmac("sha256", secret()).update(body).digest("base64url");
  const given = Buffer.from(signature);
  const wanted = Buffer.from(expected);
  if (given.length !== wanted.length) return null;
  if (!timingSafeEqual(given, wanted)) return null;
  return { userId, expires };
}

export function tokenOk(token: string | undefined) {
  return Boolean(parseSessionToken(token));
}

export async function getAdminSession() {
  const jar = await cookies();
  const parsed = parseSessionToken(jar.get(ADMIN_COOKIE)?.value);
  if (!parsed) return null;
  const user = await findUserById(parsed.userId);
  if (!user) return null;
  return {
    userId: user.id,
    username: user.username,
    displayName: user.displayName,
  };
}

export async function hasAdminSession() {
  return Boolean(await getAdminSession());
}
