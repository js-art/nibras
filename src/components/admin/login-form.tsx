"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { useRouter } from "@/i18n/navigation";
import { FieldHint } from "@/components/admin/hint-label";
import { LocaleSwitcher } from "@/components/locale-switcher";
import { Mark } from "@/components/mark";
import { Input } from "@/components/ui/controls";
import { DESK_PATH } from "@/lib/desk";

export function LoginForm() {
  const t = useTranslations("admin");
  const router = useRouter();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);

  return (
    <form
      className="w-full max-w-sm"
      onSubmit={async (event) => {
        event.preventDefault();
        setPending(true);
        setError("");
        const response = await fetch("/api/admin/login", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ username, password }),
        });
        setPending(false);
        if (response.status === 503) {
          setError(t("missingPassword"));
          return;
        }
        if (!response.ok) {
          setError(t("denied"));
          return;
        }
        router.replace(DESK_PATH);
        router.refresh();
      }}
    >
      <div className="flex items-start justify-between gap-4">
        <Mark className="h-12 w-12" />
        <LocaleSwitcher tone="light" />
      </div>
      <div className="mt-6 h-px w-12 bg-[#e4c27a]" />
      <h1 className="mt-4 font-display text-2xl leading-[1.3] text-palm-deep sm:text-3xl">{t("loginTitle")}</h1>
      <p className="mt-3 max-w-[36ch] text-base leading-7 text-mist">{t("loginLede")}</p>
      <div className="mt-8 grid gap-4">
        <FieldHint label={t("username")} hint={t("usernameHint")}>
          <Input
            type="text"
            name="username"
            autoComplete="username"
            value={username}
            onChange={(event) => setUsername(event.target.value)}
          />
        </FieldHint>
        <FieldHint label={t("password")} hint={t("passwordHintField")}>
          <Input
            type="password"
            name="password"
            autoComplete="current-password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
          />
        </FieldHint>
      </div>
      {error ? <p className="mt-3 text-sm leading-7 text-[#8d3a3a]">{error}</p> : null}
      <button
        type="submit"
        disabled={pending || username.trim().length === 0 || password.length === 0}
        className="mt-6 h-13 w-full rounded-lg bg-palm-deep text-sm font-semibold text-[#e7f2ec] disabled:opacity-50"
      >
        {t("enter")}
      </button>
    </form>
  );
}
