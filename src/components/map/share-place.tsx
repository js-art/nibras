"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import type { CirclePlace } from "@/lib/circle/place";

export function SharePlace({
  locale,
  place,
  onShared,
}: {
  locale: string;
  place: CirclePlace;
  onShared: (id: string) => void;
}) {
  const t = useTranslations("desk");
  const [body, setBody] = useState("");
  const [busy, setBusy] = useState(false);
  const [state, setState] = useState<"idle" | "done" | "auth" | "error">("idle");

  async function share() {
    const text = body.trim();
    if (text.length < 1 || busy) return;
    setBusy(true);
    setState("idle");
    try {
      const response = await fetch("/api/v1/circle/posts", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ body: text, kind: "note", visibility: "circle", locale, place }),
      });
      const data = (await response.json().catch(() => null)) as { post?: { id?: string }; error?: string } | null;
      if (response.status === 401) {
        setState("auth");
        return;
      }
      if (!response.ok || !data?.post?.id) {
        setState("error");
        return;
      }
      setBody("");
      setState("done");
      onShared(data.post.id);
    } catch {
      setState("error");
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="rounded-2xl border border-ink/10 bg-white p-3">
      <h2 className="text-sm font-semibold">{t("shareTitle")}</h2>
      <p className="mt-1 text-sm leading-6 text-mist">
        {place.kind === "point" ? t("sharePoint") : t("shareRange")}
      </p>
      <textarea
        value={body}
        onChange={(event) => setBody(event.target.value)}
        maxLength={2000}
        rows={3}
        placeholder={t("shareBody")}
        className="mt-3 w-full resize-none rounded-lg border border-ink/15 bg-paper px-3 py-2 text-sm leading-6 text-ink"
      />
      <button
        type="button"
        onClick={() => void share()}
        disabled={busy || body.trim().length < 1}
        className="mt-2 w-full rounded-lg bg-palm-deep px-3 py-3 text-sm font-semibold text-[#e7f2ec] disabled:opacity-40"
      >
        {t("shareSend")}
      </button>
      {state === "done" ? <p className="mt-2 text-sm text-palm">{t("shareDone")}</p> : null}
      {state === "error" ? <p className="mt-2 text-sm text-ink">{t("shareError")}</p> : null}
      {state === "auth" ? (
        <p className="mt-2 text-sm leading-6 text-ink">
          {t("shareAuth")}{" "}
          <Link href="/majlis" className="font-semibold text-palm">
            {t("shareOpen")}
          </Link>
        </p>
      ) : null}
    </section>
  );
}
