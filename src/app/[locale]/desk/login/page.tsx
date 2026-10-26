import { connection } from "next/server";
import { redirect } from "next/navigation";
import { setRequestLocale } from "next-intl/server";
import { LoginForm } from "@/components/admin/login-form";
import { hasAdminSession } from "@/lib/admin-auth";
import { DESK_PATH } from "@/lib/desk";

export const instant = false;

export default async function DeskLoginPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  await connection();
  if (await hasAdminSession()) redirect(`/${locale}${DESK_PATH}`);

  return (
    <div className="flex min-h-dvh items-center justify-center px-6 py-16">
      <LoginForm />
    </div>
  );
}
