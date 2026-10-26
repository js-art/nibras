import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@/generated/prisma/client";

/** Bump when schema changes so HMR does not keep a stale PrismaClient. */
const PRISMA_GLOBAL_KEY = "nibrasPrisma_v2" as const;

const globalForPrisma = globalThis as unknown as Record<string, PrismaClient | undefined>;

function createClient() {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error("DATABASE_URL is not set");
  }
  const adapter = new PrismaPg({ connectionString });
  return new PrismaClient({
    adapter,
    log: process.env.NODE_ENV === "development" ? ["error", "warn"] : ["error"],
  });
}

export const db = globalForPrisma[PRISMA_GLOBAL_KEY] ?? createClient();

if (process.env.NODE_ENV !== "production") {
  globalForPrisma[PRISMA_GLOBAL_KEY] = db;
}
