import { connection } from "next/server";
import { redirect } from "next/navigation";
import { setRequestLocale } from "next-intl/server";
import { AtlasDesk, type DeskView } from "@/components/admin/atlas-desk";
import { hasAdminSession } from "@/lib/admin-auth";
import { DESK_PATH } from "@/lib/desk";
import { readAtlas } from "@/lib/atlas-store";

export const instant = false;

function one(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

const sections = ["cities", "areas", "developers", "projects", "suggestions"] as const;

export default async function DeskPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ section?: string | string[]; id?: string | string[]; new?: string | string[] }>;
}) {
  const { locale } = await params;
  const query = await searchParams;
  setRequestLocale(locale);
  await connection();
  if (!(await hasAdminSession())) redirect(`/${locale}${DESK_PATH}/login`);
  const atlas = await readAtlas();
  const sectionRaw = one(query.section);
  const section = sections.includes(sectionRaw as (typeof sections)[number])
    ? (sectionRaw as (typeof sections)[number])
    : "areas";
  const focusId = one(query.id)?.trim();
  const isNew = one(query.new) === "1" || one(query.new) === "true";

  let view: DeskView;
  if (isNew) {
    view = { mode: "new", section };
  } else if (focusId) {
    view = { mode: "edit", section, id: focusId };
  } else {
    view = { mode: "list", section };
  }

  return (
    <div className="h-dvh">
      <AtlasDesk initial={atlas} view={view} />
    </div>
  );
}
