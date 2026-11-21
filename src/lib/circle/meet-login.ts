import { scryptSync, timingSafeEqual } from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { Pool } from "pg";

export type MeetPerson = {
  email: string;
  name: string;
  username: string;
};

const globalMeet = globalThis as unknown as { nibrasMeetPool?: Pool };

function meetDatabaseUrl() {
  if (process.env.GOMEET_DATABASE_URL) return process.env.GOMEET_DATABASE_URL;
  try {
    const file = path.join(process.cwd(), "gomeet/.env.local");
    const line = fs.readFileSync(file, "utf8").split("\n").find((row) => row.startsWith("DATABASE_URL="));
    if (!line) return "";
    let value = line.slice("DATABASE_URL=".length).trim();
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1);
    }
    return value;
  } catch {
    return "";
  }
}

function pool() {
  if (globalMeet.nibrasMeetPool) return globalMeet.nibrasMeetPool;
  const connectionString = meetDatabaseUrl();
  if (!connectionString) return null;
  const next = new Pool({ connectionString, max: 2 });
  next.on("error", () => undefined);
  globalMeet.nibrasMeetPool = next;
  return next;
}

function checkMeetPassword(password: string, stored: string) {
  const [salt, hash] = stored.split(":");
  if (!salt || !hash) return false;
  const next = scryptSync(password, salt, 32);
  const prev = Buffer.from(hash, "hex");
  if (next.length !== prev.length) return false;
  return timingSafeEqual(next, prev);
}

/** A جلسه account with this email and password, if one exists. */
export async function meetPerson(email: string, password: string): Promise<MeetPerson | null> {
  const db = pool();
  if (!db || !password) return null;
  try {
    const result = await db.query<{ name: string; username: string | null; password_hash: string }>(
      "select name, username, password_hash from users where lower(email) = $1",
      [email],
    );
    const row = result.rows[0];
    if (!row || !checkMeetPassword(password, row.password_hash)) return null;
    return { email, name: row.name, username: row.username || "" };
  } catch {
    return null;
  }
}
