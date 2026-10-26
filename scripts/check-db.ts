import "dotenv/config";
import { readAtlas } from "../src/lib/atlas-store";
import { readSite } from "../src/lib/site-store";
import { listUsers } from "../src/lib/users-store";

async function main() {
  const a = await readAtlas();
  console.log("atlas ok", a.cities.length, a.projects.length);
  const s = await readSite();
  console.log("site ok", s.contact.phone);
  const u = await listUsers();
  console.log("users ok", u.map((x) => x.username));
}

main().catch((error) => {
  console.error("FAIL", error);
  process.exit(1);
});
