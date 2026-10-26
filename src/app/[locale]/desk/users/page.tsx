import { connection } from "next/server";
import { redirect } from "next/navigation";
import { setRequestLocale } from "next-intl/server";
import { UsersDesk } from "@/components/admin/users-desk";
import { getAdminSession } from "@/lib/admin-auth";
import { DESK_PATH } from "@/lib/desk";
import { listUsers } from "@/lib/users-store";

export const instant = false;

export default async function DeskUsersPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  await connection();
  const session = await getAdminSession();
  if (!session) redirect(`/${locale}${DESK_PATH}/login`);
  const users = await listUsers();

  return (
    <div className="h-dvh">
      <UsersDesk initial={users} currentUserId={session.userId} />
    </div>
  );
}
