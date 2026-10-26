import { hashPassword, verifyPassword } from "@/lib/password";
import { db } from "@/lib/db";

export type PublicAdminUser = {
  id: string;
  username: string;
  displayName: string;
  createdAt: string;
};

function publicUser(user: {
  id: string;
  username: string;
  displayName: string;
  createdAt: Date;
}): PublicAdminUser {
  return {
    id: user.id,
    username: user.username,
    displayName: user.displayName,
    createdAt: user.createdAt.toISOString(),
  };
}

function normalizeUsername(value: string) {
  return value.trim().toLowerCase().replace(/[^a-z0-9._-]/g, "");
}

/** First boot: create `admin` from ADMIN_PASSWORD when no users exist. */
export async function ensureBootstrapAdmin() {
  const count = await db.adminUser.count();
  if (count > 0) {
    return (await db.adminUser.findMany({ orderBy: { createdAt: "desc" } })).map(publicUser);
  }
  const password = process.env.ADMIN_PASSWORD?.trim() ?? "";
  if (!password) return [];
  const admin = await db.adminUser.create({
    data: {
      username: "admin",
      displayName: "Admin",
      passwordHash: hashPassword(password),
    },
  });
  return [publicUser(admin)];
}

export async function listUsers(): Promise<PublicAdminUser[]> {
  await ensureBootstrapAdmin();
  return (await db.adminUser.findMany({ orderBy: { createdAt: "desc" } })).map(publicUser);
}

export async function findUserByUsername(username: string) {
  await ensureBootstrapAdmin();
  const key = normalizeUsername(username);
  return db.adminUser.findUnique({ where: { username: key } });
}

export async function findUserById(id: string) {
  return db.adminUser.findUnique({ where: { id } });
}

export async function authenticateUser(username: string, password: string) {
  const user = await findUserByUsername(username);
  if (!user || !password) return null;
  if (!verifyPassword(password, user.passwordHash)) return null;
  return publicUser(user);
}

export async function usersConfigured() {
  const users = await ensureBootstrapAdmin();
  return users.length > 0;
}

export async function createUser(input: {
  username: string;
  displayName: string;
  password: string;
}) {
  const username = normalizeUsername(input.username);
  const password = input.password.trim();
  const displayName = input.displayName.trim() || username;
  if (!username || username.length < 2) throw new Error("username");
  if (password.length < 8) throw new Error("password");
  const existing = await db.adminUser.findUnique({ where: { username } });
  if (existing) throw new Error("taken");
  const next = await db.adminUser.create({
    data: {
      username,
      displayName,
      passwordHash: hashPassword(password),
    },
  });
  return publicUser(next);
}

export async function updateUser(
  id: string,
  input: { displayName?: string; password?: string },
) {
  const current = await db.adminUser.findUnique({ where: { id } });
  if (!current) throw new Error("missing");
  const displayName = input.displayName?.trim();
  const password = input.password?.trim();
  if (password !== undefined && password.length > 0 && password.length < 8) {
    throw new Error("password");
  }
  const next = await db.adminUser.update({
    where: { id },
    data: {
      displayName: displayName || current.displayName,
      ...(password ? { passwordHash: hashPassword(password) } : {}),
    },
  });
  return publicUser(next);
}

export async function deleteUser(id: string, actorId: string) {
  const count = await db.adminUser.count();
  if (count <= 1) throw new Error("last");
  if (id === actorId) throw new Error("self");
  try {
    await db.adminUser.delete({ where: { id } });
  } catch {
    throw new Error("missing");
  }
}
