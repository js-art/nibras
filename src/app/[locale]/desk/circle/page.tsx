import { connection } from "next/server";
import { redirect } from "next/navigation";
import { setRequestLocale } from "next-intl/server";
import { CircleModeration } from "@/components/admin/circle-moderation";
import { getAdminSession } from "@/lib/admin-auth";
import { listIntroducedProjects } from "@/lib/circle/store";
import { DESK_PATH } from "@/lib/desk";

export const instant = false;

export default async function DeskCirclePage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  await connection();
  const session = await getAdminSession();
  if (!session) redirect(`/${locale}${DESK_PATH}/login`);
  const projects = await listIntroducedProjects(locale);

  return (
    <div className="h-dvh">
      <CircleModeration projects={projects} />
    </div>
  );
}
