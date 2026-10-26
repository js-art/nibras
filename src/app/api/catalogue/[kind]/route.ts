import { connection } from "next/server";
import { readAtlas } from "@/lib/atlas-store";
import {
  parsePage,
  parsePageSize,
  queryCatalogue,
  type CatalogueKind,
} from "@/lib/catalogue-page";

const kinds = new Set<CatalogueKind>(["areas", "developers", "projects"]);

export async function GET(
  request: Request,
  context: { params: Promise<{ kind: string }> },
) {
  await connection();
  const { kind: raw } = await context.params;
  if (!kinds.has(raw as CatalogueKind)) {
    return Response.json({ error: "unknown" }, { status: 404 });
  }
  const kind = raw as CatalogueKind;
  const url = new URL(request.url);
  const atlas = await readAtlas();
  const opts = {
    page: parsePage(url.searchParams.get("page") ?? undefined),
    pageSize: parsePageSize(url.searchParams.get("pageSize") ?? undefined),
    q: url.searchParams.get("q") ?? undefined,
    area: url.searchParams.get("area") ?? undefined,
    developer: url.searchParams.get("developer") ?? undefined,
    locale: url.searchParams.get("locale") ?? undefined,
  };
  const result =
    kind === "areas"
      ? queryCatalogue(atlas, "areas", opts)
      : kind === "developers"
        ? queryCatalogue(atlas, "developers", opts)
        : queryCatalogue(atlas, "projects", opts);
  return Response.json(result);
}
