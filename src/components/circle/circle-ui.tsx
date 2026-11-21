"use client";

import { useEffect, useRef, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { Bell, Bookmark, ChevronDown, ChevronLeft, Eye, EyeOff, Home, MessageCircle, Pencil, Search, Share2, Trash2, Users } from "lucide-react";
import { Map as MapView, Marker, setWorkerUrl } from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import { mapStyleUrl } from "@/lib/map-style";
import { Link, useRouter } from "@/i18n/navigation";
import { CircleBody, CircleText, HallMark } from "@/components/circle/circle-text";
import { PlacePick } from "@/components/circle/place-pick";
import { NoteEditor } from "@/components/circle/note-editor";
import { notePlain } from "@/lib/circle/html";
import type { CirclePlace, MapCountry } from "@/lib/circle/place";
import { ReactionGlyph, type GlyphKey } from "@/components/circle/reaction-glyphs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import "./circle-skin.css";
import type {
  CircleNoticeView,
  CirclePerson,
  CirclePostView,
  DeskPerson,
  CircleTagView,
  CircleViewer,
  FeedScope,
  NeighbourhoodChoice,
  PostKind,
  ProjectChoice,
  ProjectFacts,
  ReactionKind,
  Visibility,
} from "@/lib/circle/types";

async function send(url: string, payload?: unknown, method = "POST") {
  const response = await fetch(url, {
    method,
    headers: payload ? { "content-type": "application/json" } : undefined,
    body: payload ? JSON.stringify(payload) : undefined,
  });
  const data = (await response.json().catch(() => ({}))) as { error?: string };
  if (!response.ok) throw new Error(data.error || "error");
  return data;
}

function askForDesk() {
  const gate = document.getElementById("account") ?? document.querySelector<HTMLElement>("[data-desk-gate]");
  if (!gate) return;
  gate.classList.add("is-nudge");
  gate.scrollIntoView({ behavior: "smooth", block: "center" });
  window.setTimeout(() => gate.classList.remove("is-nudge"), 1600);
}

function Face({ name, size = 40 }: { name: string; seed?: string; size?: number }) {
  const letters = name
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part.slice(0, 1))
    .join("");
  return (
    <span className="c-face" style={{ width: size, height: size, fontSize: size * 0.34 }}>
      {letters}
    </span>
  );
}

export function CircleShell({
  locale,
  mode,
  viewer,
  people,
  notices,
  tags,
  trail,
  children,
}: {
  locale: string;
  mode: "feed" | "people" | "saved" | "profile" | "post";
  viewer: CircleViewer | null;
  people: CirclePerson[];
  notices: CircleNoticeView[];
  tags: CircleTagView[];
  trail?: { href?: string; label: string }[];
  children: React.ReactNode;
}) {
  const t = useTranslations("circle");
  const router = useRouter();
  const [showNotices, setShowNotices] = useState(false);
  const noticeRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!showNotices) return;
    const close = (event: MouseEvent) => {
      const target = event.target as Node;
      const sheet = document.getElementById("majlis-notices");
      if (noticeRef.current?.contains(target) || sheet?.contains(target)) return;
      setShowNotices(false);
    };
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setShowNotices(false);
    };
    document.addEventListener("mousedown", close);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", close);
      document.removeEventListener("keydown", onKey);
    };
  }, [showNotices]);

  const suggestions = people.filter((person) => person.id !== viewer?.id && !person.followedByMe).slice(0, 4);

  const tail =
    trail ??
    (mode === "people"
      ? [{ label: t("people") }]
      : mode === "saved"
        ? [{ label: t("saved") }]
        : mode === "post"
          ? [{ label: t("kindNote") }]
          : mode === "profile"
            ? [{ label: t("profile") }]
            : []);
  const crumbs = [{ href: tail.length ? "/majlis" : undefined, label: t("title") }, ...tail];

  const nav = [
    { href: "/majlis", key: "feed" as const, icon: Home, on: mode === "feed" },
    { href: "/majlis/people", key: "people" as const, icon: Users, on: mode === "people" },
    { href: "/majlis/saved", key: "saved" as const, icon: Bookmark, on: mode === "saved" },
  ];

  return (
    <div className="circle-app">
      <div className="mx-auto flex w-full min-w-0 max-w-6xl items-start lg:gap-6 lg:px-4">
        <aside className="sticky top-16 hidden h-[calc(100dvh-4rem)] w-60 shrink-0 flex-col gap-3 overflow-y-auto py-4 lg:flex">
          {viewer ? <DeskChip viewer={viewer} /> : <p className="c-card c-meta px-3 py-3 text-sm">{t("signIn")}</p>}
          <nav className="c-menu" aria-label={t("title")}>
            {nav.map((item) => (
              <Link key={item.href} href={item.href} aria-current={item.on ? "page" : undefined} className="c-nav c-press">
                <item.icon size={20} strokeWidth={item.on ? 2.4 : 1.8} />
                {t(item.key)}
              </Link>
            ))}
          </nav>
          {!viewer || viewer.sample ? (
            <Link href="/majlis#account" className="c-quiet c-press mt-2 block py-2.5 text-center text-sm">
              {t("createAccount")}
            </Link>
          ) : null}
        </aside>

        <main className="c-shell-main min-w-0 flex-1">
          <header className="c-frost sticky top-16 z-30 flex items-center gap-2 border-b border-[var(--c-line)] px-4 py-3">
            {tail.length ? (
              <nav aria-label={t("breadcrumb")} className="relative z-10 min-w-0 flex-1">
                <ol className="flex min-w-0 flex-wrap items-center gap-x-1.5 gap-y-1 text-sm">
                  {crumbs.map((crumb, index) => {
                    const last = index === crumbs.length - 1;
                    const linked = Boolean(crumb.href && !last);
                    return (
                      <li key={`${crumb.label}-${index}`} className="flex min-w-0 items-center gap-1.5">
                        {index > 0 ? <span className="text-[var(--c-ink-3)]" aria-hidden>/</span> : null}
                        {linked && crumb.href ? (
                          <Link
                            href={crumb.href}
                            className="truncate font-medium text-[var(--c-palm)] underline-offset-4 hover:underline"
                            onClick={(event) => {
                              event.preventDefault();
                              router.push(crumb.href as "/majlis");
                            }}
                          >
                            {crumb.label}
                          </Link>
                        ) : (
                          <span className="truncate font-semibold" aria-current={last ? "page" : undefined}>
                            {crumb.label}
                          </span>
                        )}
                      </li>
                    );
                  })}
                </ol>
              </nav>
            ) : (
              <div className="min-w-0 flex-1">
                <h1 className="text-xl font-semibold leading-tight">{t("title")}</h1>
                <p className="c-meta line-clamp-2">{t("headerLede")}</p>
              </div>
            )}
            <div ref={noticeRef} className="relative shrink-0">
              <button
                type="button"
                className="c-press relative grid h-11 w-11 place-items-center"
                aria-label={t("notices")}
                aria-expanded={showNotices}
                onClick={() => setShowNotices((open) => !open)}
              >
                <Bell size={20} />
                {notices.length ? <span className="absolute end-2 top-2 h-2 w-2 rounded-full bg-[var(--c-ember)]" /> : null}
              </button>
              {showNotices ? (
                <div className="c-notices absolute end-0 top-full z-40 mt-2 hidden lg:block">
                  <h2 className="font-semibold">{t("notices")}</h2>
                  <NoticeList viewer={viewer} notices={notices} />
                </div>
              ) : null}
            </div>
          </header>
          {showNotices ? (
            <div id="majlis-notices" className="border-b border-[var(--c-line)] px-4 py-3 lg:hidden">
              <NoticeList viewer={viewer} notices={notices} />
            </div>
          ) : null}
          {mode !== "people" ? (
            <div className="px-3 pt-3 xl:hidden">
              <div className="c-card px-3 py-3">
                <HallSearch inputId="majlis-find" />
              </div>
            </div>
          ) : null}
          {mode === "feed" && (!viewer || viewer.sample) ? (
            <div className="px-3 pt-3">
              <Gate viewer={viewer} intent="create" />
            </div>
          ) : null}
          {!viewer && mode !== "feed" ? (
            <div className="px-3 pt-3 xl:hidden">
              <Gate viewer={viewer} />
            </div>
          ) : null}
          <div className="pb-[calc(6.5rem+env(safe-area-inset-bottom))] lg:pb-10">
            {children}
            <div className="mt-3 grid gap-3 px-3 md:grid-cols-2 xl:hidden">
              <ForumRail tags={tags} suggestions={suggestions} />
            </div>
          </div>
        </main>

        <aside className="sticky top-16 hidden h-[calc(100dvh-4rem)] w-72 shrink-0 flex-col gap-3 overflow-y-auto py-6 xl:flex">
          <HallSearch inputId="majlis-search" />
          {!viewer && mode !== "feed" ? <Gate viewer={viewer} /> : null}
          <ForumRail tags={tags} suggestions={suggestions} />
        </aside>
      </div>

      <div className="pointer-events-none fixed inset-x-0 bottom-0 z-50 lg:hidden">
        <nav
          className="c-dock pointer-events-auto flex items-center justify-around px-2 pt-2 pb-[max(0.5rem,env(safe-area-inset-bottom))]"
          aria-label={t("title")}
        >
          <DockLink href="/majlis" label={t("feed")} on={mode === "feed"} icon={Home} />
          <DockLink href="/majlis/people" label={t("people")} on={mode === "people"} icon={Users} />
          <DockLink href="/majlis/saved" label={t("saved")} on={mode === "saved"} icon={Bookmark} />
          {viewer ? (
            <Link href={`/majlis/${viewer.handle}`} className="c-press grid h-11 w-11 place-items-center" aria-label={t("profile")}>
              <Face name={viewer.displayName} seed={viewer.handle} size={32} />
            </Link>
          ) : (
            <span className="grid h-11 w-11 place-items-center">
              <Face name="?" size={32} />
            </span>
          )}
        </nav>
      </div>
    </div>
  );
}

function DeskChip({ viewer }: { viewer: CircleViewer }) {
  const t = useTranslations("circle");
  const router = useRouter();
  const [pending, setPending] = useState(false);
  return (
    <section className="c-card c-identity">
      <Link href={`/majlis/${viewer.handle}`} className="c-press flex min-w-0 items-center gap-3">
        <Face name={viewer.displayName} seed={viewer.handle} size={44} />
        <span className="min-w-0">
          <span className="block truncate text-sm font-semibold">{viewer.displayName}</span>
          <span className="c-meta block truncate text-xs" dir="ltr">
            @{viewer.handle}
          </span>
          <span className="c-meta block truncate text-xs">{deskRole(viewer.role, t)}</span>
        </span>
      </Link>
      <button
        type="button"
        disabled={pending}
        className="c-quiet c-press h-11 w-full text-sm"
        onClick={() => {
          setPending(true);
          send("/api/v1/circle/session", undefined, "DELETE")
            .then(() => router.refresh())
            .finally(() => setPending(false));
        }}
      >
        {t("leave")}
      </button>
    </section>
  );
}

function deskRole(role: string, t: (key: "roleAgent" | "roleInvestor" | "roleBuyer" | "roleSeller") => string) {
  if (role === "investor") return t("roleInvestor");
  if (role === "buyer") return t("roleBuyer");
  if (role === "seller") return t("roleSeller");
  return t("roleAgent");
}

const EMOJI_REACTIONS = ["like", "love", "laugh", "wow", "sad", "fire"] as const;

function glyphFor(kind: ReactionKind): GlyphKey {
  if (kind === "useful" || kind === "like") return "like";
  if (kind === "question" || kind === "wow") return "wow";
  if (kind === "watch" || kind === "fire") return "fire";
  if (kind === "love" || kind === "laugh" || kind === "sad") return kind;
  return "like";
}

function reactionCount(post: CirclePostView, kind: GlyphKey) {
  return (
    post.reactions[kind] +
    (kind === "like" ? post.reactions.useful : 0) +
    (kind === "wow" ? post.reactions.question : 0) +
    (kind === "fire" ? post.reactions.watch : 0)
  );
}

function ReactionSelect({
  post,
  pending,
  labels,
  placeholder,
  active,
  onPick,
}: {
  post: CirclePostView;
  pending: boolean;
  labels: Record<GlyphKey, string>;
  placeholder: string;
  active: GlyphKey | null;
  onPick: (kind: GlyphKey) => void;
}) {
  const [open, setOpen] = useState(false);
  const box = useRef<HTMLDivElement>(null);
  const total = EMOJI_REACTIONS.reduce((sum, kind) => sum + reactionCount(post, kind), 0);

  useEffect(() => {
    if (!open) return;
    function onPointer(event: PointerEvent) {
      if (!box.current?.contains(event.target as Node)) setOpen(false);
    }
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") setOpen(false);
    }
    document.addEventListener("pointerdown", onPointer);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("pointerdown", onPointer);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  return (
    <div ref={box} className="relative">
      <button
        type="button"
        disabled={pending}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-label={active ? labels[active] : placeholder}
        className="c-quiet c-press flex min-h-11 items-center gap-1.5 px-2.5 text-sm"
        onClick={() => setOpen((value) => !value)}
      >
        {active ? <ReactionGlyph reaction={active} size={20} /> : null}
        <span>{active ? labels[active] : placeholder}</span>
        {total ? <span className="c-meta tabular-nums">{total}</span> : null}
        <ChevronDown size={14} aria-hidden />
      </button>
      {open ? (
        <ul
          role="listbox"
          aria-label={placeholder}
          className="absolute top-full z-30 mt-1 min-w-44 rounded-xl border border-[var(--c-line)] bg-white p-1 shadow-lg"
        >
          {EMOJI_REACTIONS.map((kind) => {
            const count = reactionCount(post, kind);
            const on = active === kind;
            return (
              <li key={kind}>
                <button
                  type="button"
                  role="option"
                  aria-selected={on}
                  className={`c-press flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-sm ${on ? "bg-[var(--c-paper)]" : ""}`}
                  onClick={() => {
                    setOpen(false);
                    onPick(kind);
                  }}
                >
                  <ReactionGlyph reaction={kind} size={22} />
                  <span className="flex-1 text-start">{labels[kind]}</span>
                  {count ? <span className="c-meta tabular-nums">{count}</span> : null}
                </button>
              </li>
            );
          })}
        </ul>
      ) : null}
    </div>
  );
}

function DockLink({
  href,
  label,
  on,
  icon: Icon,
}: {
  href: string;
  label: string;
  on: boolean;
  icon: typeof Home;
}) {
  return (
    <Link href={href} aria-label={label} aria-current={on ? "page" : undefined} className="c-press grid h-11 w-11 place-items-center">
      <Icon size={22} strokeWidth={on ? 2.4 : 1.8} />
    </Link>
  );
}

function NoticeList({
  viewer,
  notices,
}: {
  viewer: CircleViewer | null;
  notices: CircleNoticeView[];
}) {
  const t = useTranslations("circle");
  if (!viewer) return <p className="c-ink-3 mt-2 text-sm leading-6">{t("signIn")}</p>;
  if (!notices.length) return <p className="c-ink-3 mt-2 text-sm leading-6">{t("noNotices")}</p>;
  return (
    <ul className="mt-2 flex flex-col gap-2">
      {notices.map((notice) => (
        <li key={notice.id} className="c-card flex items-start gap-3 px-3 py-3 text-sm leading-6">
          <Face name={notice.actor.displayName} seed={notice.actor.handle} size={36} />
          <div className="min-w-0">
            <Link href={`/majlis/${notice.actor.handle}`} className="font-semibold">
              {notice.actor.displayName}
            </Link>{" "}
            {t(`notice.${notice.type}` as "notice.follow")}
            {notice.postId ? (
              <>
                {" "}
                <Link href={`/majlis/post/${notice.postId}`} className="font-semibold">
                  {t("openNote")}
                </Link>
              </>
            ) : null}
            <span className="c-meta mt-1 block">{notice.when}</span>
          </div>
        </li>
      ))}
    </ul>
  );
}

function HallSearch({ inputId }: { inputId: string }) {
  const t = useTranslations("circle");
  const router = useRouter();
  const [value, setValue] = useState("");
  return (
    <form
      className="c-find"
      role="search"
      onSubmit={(event) => {
        event.preventDefault();
        const q = value.trim();
        if (q.startsWith("#")) {
          router.push(`/majlis?tag=${encodeURIComponent(q.replace(/^#+/, ""))}`);
          return;
        }
        router.push(q ? `/majlis/people?q=${encodeURIComponent(q)}` : "/majlis/people");
      }}
    >
      <label htmlFor={inputId}>{t("searchLabel")}</label>
      <div className="c-search">
        <Search size={18} aria-hidden />
        <input
          id={inputId}
          value={value}
          onChange={(event) => setValue(event.target.value)}
          placeholder={t("search")}
          autoComplete="off"
        />
      </div>
    </form>
  );
}

function ForumRail({ suggestions }: { tags: CircleTagView[]; suggestions: CirclePerson[] }) {
  const t = useTranslations("circle");
  return (
    <>
      {suggestions.length ? (
        <section className="c-card px-3 py-3">
          <h2 className="font-semibold">{t("whoToFollow")}</h2>
          <ul className="mt-1">
            {suggestions.map((person) => (
              <li key={person.id} className="flex items-center gap-2 py-2">
                <Face name={person.displayName} seed={person.handle} />
                <Link href={`/majlis/${person.handle}`} className="min-w-0 flex-1">
                  <span className="block truncate font-semibold">{person.displayName}</span>
                  <span className="c-meta block truncate">{deskRole(person.role, t)}</span>
                </Link>
                <FollowButton person={person} compact />
              </li>
            ))}
          </ul>
        </section>
      ) : null}
    </>
  );
}

function Gate({
  viewer,
  intent = "enter",
}: {
  viewer: CircleViewer | null;
  intent?: "enter" | "create";
}) {
  const t = useTranslations("circle");
  const router = useRouter();
  const [error, setError] = useState("");
  const [invalid, setInvalid] = useState<Partial<Record<"displayName" | "handle" | "email" | "password" | "role", string>>>({});
  const [panel, setPanel] = useState<"login" | "join" | null>(null);
  const [pending, setPending] = useState(false);
  const [role, setRole] = useState("investor");

  async function run(task: () => Promise<void>) {
    setError("");
    setPending(true);
    try {
      await task();
      router.refresh();
    } catch (caught) {
      const code = caught instanceof Error ? caught.message : "error";
      setError(t.has(`errors.${code}` as "errors.error") ? t(`errors.${code}` as "errors.error") : t("errors.error"));
    } finally {
      setPending(false);
    }
  }

  if (viewer && !viewer.sample && intent === "create") return null;

  if (viewer && intent !== "create") {
    return (
      <section data-desk-gate="" className="c-card p-4">
        <p className="c-meta">{viewer.sample ? t("sample") : t("yourDesk")}</p>
        <h2 className="mt-1 text-lg font-semibold">{viewer.displayName}</h2>
        <p className="c-meta mt-1">
          @{viewer.handle} · {deskRole(viewer.role, t)}
          {viewer.city ? ` · ${viewer.city}` : ""}
        </p>
        <div className="mt-3 flex gap-2">
          <Link href={`/majlis/${viewer.handle}`} className="c-pill c-press px-4 py-2 text-sm">
            {t("profile")}
          </Link>
          <button
            type="button"
            disabled={pending}
            className="c-quiet c-press px-4 py-2 text-sm"
            onClick={() => run(() => send("/api/v1/circle/session", undefined, "DELETE").then(() => undefined))}
          >
            {t("leave")}
          </button>
        </div>
        {error ? <p className="c-ember mt-2 text-sm">{error}</p> : null}
      </section>
    );
  }

  return (
    <section id={intent === "create" ? "account" : undefined} data-desk-gate="" className="c-card p-4">
      {panel === null ? (
        <>
          <p className="text-sm leading-6">{viewer?.sample ? t("sampleAccountLede") : t("gatePrompt")}</p>
          <div className="mt-3 grid grid-cols-2 gap-2">
            <button type="button" className="c-quiet c-press h-[52px] text-sm" onClick={() => { setError(""); setPanel("login"); }}>
              {t("login")}
            </button>
            <button type="button" className="c-pill c-press h-[52px] text-sm" onClick={() => { setError(""); setPanel("join"); }}>
              {t("signUp")}
            </button>
          </div>
        </>
      ) : (
        <h2 className="text-lg font-semibold">
          {panel === "join" ? t("createAccount") : t("login")}
        </h2>
      )}
      {panel === "login" ? (
        <form
          className="mt-4 flex flex-col gap-3"
          noValidate
          onSubmit={(event) => {
            event.preventDefault();
            const form = new FormData(event.currentTarget);
            const handle = String(form.get("handle") ?? "").trim().replace(/^@/, "").toLowerCase();
            const password = String(form.get("password") ?? "");
            const next: Partial<Record<"displayName" | "handle" | "email" | "password" | "role", string>> = {};
            const asEmail = handle.includes("@");
            if (asEmail ? !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(handle) : !/^[a-z0-9._]{3,24}$/.test(handle)) {
              next.handle = asEmail ? t("errors.email") : t("errors.handle");
            }
            if (!password.trim()) next.password = t("errors.password");
            setInvalid(next);
            setError("");
            if (Object.keys(next).length) {
              event.currentTarget.querySelector<HTMLElement>(`[name="${Object.keys(next)[0]}"]`)?.focus();
              return;
            }
            void run(() => send("/api/v1/circle/session", { handle, password }).then(() => undefined));
          }}
        >
          <p className="c-ink-2 text-sm leading-6">{t("loginLede")}</p>
          <Field
            name="handle"
            label={t("loginId")}
            autoComplete="username"
            required
            error={invalid.handle}
            onClear={() => setInvalid((current) => ({ ...current, handle: undefined }))}
          />
          <Field
            name="password"
            label={t("password")}
            type="password"
            autoComplete="current-password"
            required
            error={invalid.password}
            onClear={() => setInvalid((current) => ({ ...current, password: undefined }))}
          />
          <button type="submit" disabled={pending} className="c-pill c-press mt-1 h-[52px] w-full text-sm">
            {t("login")}
          </button>
        </form>
      ) : null}
      {panel === "join" ? (
        <form
          className="mt-4 flex flex-col gap-3"
          noValidate
          onSubmit={(event) => {
            event.preventDefault();
            const form = new FormData(event.currentTarget);
            const displayName = String(form.get("displayName") ?? "").trim();
            const handle = String(form.get("handle") ?? "").trim().replace(/^@/, "").toLowerCase();
            const email = String(form.get("email") ?? "").trim().toLowerCase();
            const password = String(form.get("password") ?? "");
            const next: Partial<Record<"displayName" | "handle" | "email" | "password" | "role", string>> = {};
            if (displayName.length < 2 || displayName.length > 60) next.displayName = t("errors.name");
            if (!/^[a-z0-9._]{3,24}$/.test(handle)) next.handle = t("errors.handle");
            if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) next.email = t("errors.email");
            if (password.trim().length < 8) next.password = t("errors.password");
            setInvalid(next);
            setError("");
            const first = Object.keys(next)[0];
            if (first) {
              event.currentTarget.querySelector<HTMLElement>(`[name="${first}"]`)?.focus();
              return;
            }
            setPending(true);
            send("/api/v1/circle/join", {
              handle,
              email,
              displayName,
              password,
              role: form.get("role"),
              city: form.get("city"),
              focus: form.get("focus"),
            })
              .then(() => router.refresh())
              .catch((caught: unknown) => {
                const code = caught instanceof Error ? caught.message : "error";
                const message = t.has(`errors.${code}` as "errors.error")
                  ? t(`errors.${code}` as "errors.error")
                  : t("errors.error");
                const field =
                  code === "name"
                    ? "displayName"
                    : code === "handle" || code === "taken"
                      ? "handle"
                      : code === "email" || code === "emailTaken"
                        ? "email"
                        : code === "password"
                          ? "password"
                          : code === "role"
                            ? "role"
                            : "";
                if (field) setInvalid({ [field]: message });
                else setError(message);
              })
              .finally(() => setPending(false));
          }}
        >
          <p className="c-ink-2 text-sm leading-6">{viewer?.sample ? t("sampleAccountLede") : t("createAccountLede")}</p>
          <Field
            name="displayName"
            label={t("displayName")}
            autoComplete="name"
            required
            error={invalid.displayName}
            onClear={() => setInvalid((current) => ({ ...current, displayName: undefined }))}
          />
          <Field
            name="handle"
            label={t("handle")}
            autoComplete="username"
            required
            error={invalid.handle}
            onClear={() => setInvalid((current) => ({ ...current, handle: undefined }))}
          />
          <Field
            name="email"
            label={t("email")}
            type="email"
            autoComplete="email"
            required
            error={invalid.email}
            onClear={() => setInvalid((current) => ({ ...current, email: undefined }))}
          />
          <Field
            name="password"
            label={t("password")}
            type="password"
            autoComplete="new-password"
            required
            error={invalid.password}
            onClear={() => setInvalid((current) => ({ ...current, password: undefined }))}
          />
          <label className="block text-sm font-medium" htmlFor="circle-role">
            {t("role")}
            <span className="c-star" aria-hidden="true">*</span>
            <input type="hidden" name="role" value={role} />
            <div className={`mt-2 ${invalid.role ? "is-invalid" : ""}`}>
              <CircleSelect
                id="circle-role"
                label={t("role")}
                value={role}
                onValueChange={(next) => {
                  setRole(next);
                  setInvalid((current) => ({ ...current, role: undefined }));
                }}
                options={[
                  { value: "investor", label: t("roleInvestor") },
                  { value: "agent", label: t("roleAgent") },
                  { value: "buyer", label: t("roleBuyer") },
                  { value: "seller", label: t("roleSeller") },
                ]}
              />
            </div>
            {invalid.role ? <span className="c-field-error">{invalid.role}</span> : null}
          </label>
          <Field name="city" label={t("city")} autoComplete="address-level2" />
          <Field name="focus" label={t("focus")} />
          <button type="submit" disabled={pending} className="c-pill c-press mt-1 h-[52px] w-full text-sm">
            {t("signUp")}
          </button>
        </form>
      ) : null}
      {panel ? (
        <button
          type="button"
          className="c-quiet c-press mt-3 h-11 w-full text-sm"
          onClick={() => {
            setPanel(null);
            setInvalid({});
            setError("");
          }}
        >
          {t("gateBack")}
        </button>
      ) : null}
      {error ? <p className="c-ember mt-2 text-sm">{error}</p> : null}
    </section>
  );
}

function Field({
  name,
  label,
  type = "text",
  autoComplete,
  required = false,
  error,
  onClear,
}: {
  name: string;
  label: string;
  type?: string;
  autoComplete?: string;
  required?: boolean;
  error?: string;
  onClear?: () => void;
}) {
  const t = useTranslations("circle");
  const [visible, setVisible] = useState(false);
  const secret = type === "password";
  const errorId = error ? `${name}-error` : undefined;
  return (
    <label className="block text-sm font-medium">
      {label}
      {required ? <span className="c-star" aria-hidden="true">*</span> : null}
      <span className="relative mt-2 block">
        <input
          name={name}
          type={secret && visible ? "text" : type}
          autoComplete={autoComplete}
          aria-required={required || undefined}
          aria-invalid={error ? true : undefined}
          aria-describedby={errorId}
          className={`c-field ${secret ? "pe-12" : ""} ${error ? "is-invalid" : ""}`}
          onInput={onClear}
        />
        {secret ? (
          <button
            type="button"
            className="c-press absolute inset-y-0 end-0 grid w-12 place-items-center text-[var(--c-ink-2)]"
            aria-pressed={visible}
            aria-label={visible ? t("hidePassword") : t("showPassword")}
            onClick={() => setVisible((value) => !value)}
          >
            {visible ? <EyeOff size={18} /> : <Eye size={18} />}
          </button>
        ) : null}
      </span>
      {error ? <span id={errorId} className="c-field-error">{error}</span> : null}
    </label>
  );
}

export function CircleSelect({
  id,
  label,
  value,
  options,
  onValueChange,
}: {
  id?: string;
  label: string;
  value: string;
  options: { value: string; label: string }[];
  onValueChange: (value: string) => void;
}) {
  const locale = useLocale();
  const dir = locale === "en" ? "ltr" : "rtl";
  return (
    <Select value={value} onValueChange={onValueChange} dir={dir}>
      <SelectTrigger
        id={id}
        aria-label={label}
        dir={dir}
        className="h-[52px]! w-full min-w-0 rounded-lg border-[var(--c-field)] bg-white px-3 text-start text-base text-[var(--c-ink)] shadow-none"
      >
        <SelectValue />
      </SelectTrigger>
      <SelectContent dir={dir} className="max-h-72 text-start">
        {options.map((option) => (
          <SelectItem key={option.value} value={option.value} className="text-start">
            {option.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

export function CircleFeed({
  locale,
  viewer,
  posts,
  projects,
  neighbourhoods = [],
  desks = [],
  scope,
  tag,
  projectId,
  voice = null,
  facts = null,
}: {
  locale: string;
  viewer: CircleViewer | null;
  posts: CirclePostView[];
  projects: ProjectChoice[];
  neighbourhoods?: NeighbourhoodChoice[];
  desks?: DeskPerson[];
  scope: FeedScope;
  tag?: string;
  projectId?: string;
  voice?: { handle: string; displayName: string } | null;
  facts?: ProjectFacts | null;
}) {
  const t = useTranslations("circle");
  const open = projects.find((item) => item.id === projectId);
  const ownFacts = Boolean(viewer && voice && facts && viewer.handle === voice.handle && !viewer.sample);

  useEffect(() => {
    if (!tag && !projectId) return;
    document.getElementById("majlis-notes")?.scrollIntoView({ block: "start" });
  }, [tag, projectId]);

  if (tag || scope !== "circle") {
    return (
      <div className="c-stack" id="majlis-notes" style={{ scrollMarginTop: "5rem" }}>
        <Link href="/majlis" className="c-press inline-flex min-h-11 items-center gap-1 px-1 text-sm font-semibold">
          <ChevronLeft size={16} className="ltr:rotate-180" />
          {t("boardBack")}
        </Link>
        <PostList locale={locale} viewer={viewer} posts={posts} empty={t("emptyFeed")} />
      </div>
    );
  }

  if (open) {
    return (
      <div className="c-stack" id="majlis-notes" style={{ scrollMarginTop: "5rem" }}>
        <div className="px-1">
          <h2 className="text-xl font-semibold leading-snug">{open.name}</h2>
          {voice ? (
            <p className="c-ink-2 mt-1 text-sm leading-6">
              {t("communityMark")}{" "}
              <Link href={`/majlis/${voice.handle}`} className="font-semibold text-[var(--c-palm)]">
                {voice.displayName}
              </Link>{" "}
              {t("communityDid")}{" "}
              <Link href={`/projects/${open.id}`} className="font-semibold text-[var(--c-palm)]">
                {t("boardBrief")}
              </Link>
            </p>
          ) : (
            <Link href={`/projects/${open.id}`} className="c-press mt-1 inline-flex min-h-11 items-center text-sm font-semibold text-[var(--c-palm)]">
              {t("boardBrief")}
            </Link>
          )}
        </div>
        {ownFacts && facts ? <ProjectFactsForm projectId={open.id} facts={facts} /> : null}
        {viewer ? (
          <Composer locale={locale} viewer={viewer} projectId={open.id} projectLabel={open.name} desks={desks} />
        ) : (
          <p className="c-card c-ink-2 px-4 py-4 text-sm leading-6">{t("signIn")}</p>
        )}
        <PostList locale={locale} viewer={viewer} posts={posts} empty={t("boardEmpty")} />
      </div>
    );
  }

  const canIntroduce = Boolean(viewer && !viewer.sample);

  return (
    <div className="c-stack">
      {viewer ? <NoteComposer locale={locale} canIntroduce={canIntroduce} projects={projects} neighbourhoods={neighbourhoods} /> : null}
      <section className="flex flex-col gap-3">
        <h2 className="px-1 text-lg font-semibold">{t("fresh")}</h2>
        <PostList locale={locale} viewer={viewer} posts={posts} empty={t("emptyFeed")} />
      </section>
      <h2 className="px-1 pt-2 text-lg font-semibold">{t("feed")}</h2>
      <ProjectBoard projects={projects} posts={posts} />
    </div>
  );
}

function AnswerLine({ post }: { post: CirclePostView }) {
  const t = useTranslations("circle");
  const answer = post.comments.find((item) => item.answer);
  return (
    <p className="mt-2 line-clamp-2 text-sm leading-6">
      {answer ? (
        <>
          <span className="font-semibold">{t("answer")}</span> {answer.body}
        </>
      ) : (
        <span className="c-meta">{t("answerWaiting")}</span>
      )}
    </p>
  );
}

function ProjectBoard({ projects, posts }: { projects: ProjectChoice[]; posts: CirclePostView[] }) {
  const t = useTranslations("circle");
  const spoken = new Map<string, { count: number; post: CirclePostView; ask: CirclePostView | null }>();
  for (const post of posts) {
    if (!post.project) continue;
    const row = spoken.get(post.project.id);
    if (!row) spoken.set(post.project.id, { count: 1, post, ask: post.kind === "ask" ? post : null });
    else {
      row.count += 1;
      if (!row.ask && post.kind === "ask") row.ask = post;
    }
  }
  const active = projects
    .filter((item) => spoken.has(item.id))
    .sort((a, b) => (spoken.get(b.id)?.post.createdAt ?? "").localeCompare(spoken.get(a.id)?.post.createdAt ?? ""));
  const quiet = projects.filter((item) => !spoken.has(item.id));

  return (
    <>
      <p className="px-1 text-sm leading-6">{t("boardLede")}</p>
      {active.map((project) => {
        const row = spoken.get(project.id);
        if (!row) return null;
        return (
          <Link key={project.id} href={`/majlis?project=${project.id}`} className="c-card c-press block px-4 py-4">
            <div className="flex items-baseline justify-between gap-3">
              <h2 className="font-semibold">{project.name}</h2>
              <span className="c-meta shrink-0 tabular-nums">{t("boardCount", { count: row.count })}</span>
            </div>
            {project.introducedBy ? <p className="c-meta mt-1">{t("communityByline", { name: project.introducedBy.displayName })}</p> : null}
            <p className="c-meta mt-2 line-clamp-2">{notePlain(row.post.body)}</p>
            {row.ask ? <AnswerLine post={row.ask} /> : null}
          </Link>
        );
      })}
      {quiet.length ? (
        <section className="c-card px-4 py-4">
          <h2 className="font-semibold">{t("boardQuiet")}</h2>
          <ul className="mt-1">
            {quiet.map((project) => (
              <li key={project.id}>
                <Link href={`/majlis?project=${project.id}`} className="c-press flex min-h-11 items-center text-sm font-medium">
                  {project.name}
                </Link>
              </li>
            ))}
          </ul>
        </section>
      ) : null}
    </>
  );
}

function DeskBoard({
  mine,
  role,
  desks,
  projects,
}: {
  mine: boolean;
  role: CirclePerson["role"];
  desks: ProjectChoice[];
  projects: ProjectChoice[];
}) {
  const t = useTranslations("circle");
  const router = useRouter();
  const answers = role === "agent" || role === "seller";
  const [pick, setPick] = useState(projects.find((item) => !desks.some((desk) => desk.id === item.id))?.id ?? "");
  const [pending, setPending] = useState(false);
  if (!answers && !desks.length) return null;
  const open = projects.filter((item) => !desks.some((desk) => desk.id === item.id));

  function toggle(projectId: string) {
    setPending(true);
    send("/api/v1/circle/desk", { projectId })
      .then(() => router.refresh())
      .finally(() => setPending(false));
  }

  return (
    <section className="c-card px-4 py-4">
      <h2 className="font-semibold">{mine ? t("deskMine") : t("deskTheirs")}</h2>
      {desks.length ? (
        <ul className="mt-2">
          {desks.map((project) => (
            <li key={project.id} className="flex items-center justify-between gap-3">
              <Link href={`/majlis?project=${project.id}`} className="c-press flex min-h-11 min-w-0 flex-1 items-center font-medium">
                {project.name}
              </Link>
              {mine ? (
                <button type="button" disabled={pending} className="c-quiet c-press h-11 px-3 text-sm" onClick={() => toggle(project.id)}>
                  {t("deskDrop")}
                </button>
              ) : null}
            </li>
          ))}
        </ul>
      ) : (
        <p className="c-meta mt-2">{t("deskNone")}</p>
      )}
      {mine && open.length ? (
        <div className="mt-3 flex flex-col gap-2 sm:flex-row sm:items-center">
          <div className="min-w-0 flex-1">
            <CircleSelect label={t("deskAdd")} value={pick || open[0].id} options={open.map((item) => ({ value: item.id, label: item.name }))} onValueChange={setPick} />
          </div>
          <button type="button" disabled={pending} className="c-pill c-press h-11 px-4 text-sm" onClick={() => toggle(pick || open[0].id)}>
            {t("deskAdd")}
          </button>
        </div>
      ) : null}
      {mine && role === "seller" ? (
        <Link href="/map" className="c-press mt-3 inline-flex min-h-11 items-center text-sm font-semibold text-[var(--c-palm)]">
          {t("deskMap")}
        </Link>
      ) : null}
    </section>
  );
}

function NoteComposer({
  locale,
  canIntroduce,
  projects,
  neighbourhoods,
}: {
  locale: string;
  canIntroduce: boolean;
  projects: ProjectChoice[];
  neighbourhoods: NeighbourhoodChoice[];
}) {
  const t = useTranslations("circle");
  const router = useRouter();
  const [body, setBody] = useState("");
  const [draft, setDraft] = useState(0);
  const [beside, setBeside] = useState(false);
  const [areaId, setAreaId] = useState("none");
  const [projectId, setProjectId] = useState("none");
  const [open, setOpen] = useState(false);
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);

  useEffect(() => {
    if (!open) return;
    document.getElementById("new-project")?.scrollIntoView({ block: "nearest" });
  }, [open]);

  const areas = [...new Map(projects.filter((item) => item.areaId && item.areaName).map((item) => [item.areaId, item])).values()]
    .map((item) => ({ id: item.areaId as string, name: item.areaName as string, country: item.country, point: item.areaPoint ?? item.point }))
    .sort((a, b) => a.name.localeCompare(b.name, locale));
  const visible = (areaId === "none" ? projects : projects.filter((item) => item.areaId === areaId))
    .slice()
    .sort((a, b) => a.name.localeCompare(b.name, locale));
  const project = projects.find((item) => item.id === projectId);
  const area = areas.find((item) => item.id === areaId) ?? (project?.areaId ? areas.find((item) => item.id === project.areaId) : undefined);
  const where = !beside
    ? t("composerWherePlain")
    : project
      ? t("noteWhereProject", { project: project.name, area: project.areaName ?? "" })
      : t("besideNeed");

  return (
    <section className="c-card px-4 py-4">
      <form
        id="note-form"
        onSubmit={(event) => {
          event.preventDefault();
          const text = body.trim();
          if (!notePlain(text)) return;
          setPending(true);
          setError("");
          send("/api/v1/circle/posts", {
            body: text,
            kind: "note",
            visibility: "circle",
            locale,
            projectId: beside ? project?.id : undefined,
          })
            .then(() => {
              setBody("");
              setDraft((value) => value + 1);
              setBeside(false);
              setAreaId("none");
              setProjectId("none");
              setOpen(false);
              router.refresh();
            })
            .catch((caught: unknown) => {
              const code = caught instanceof Error ? caught.message : "error";
              setError(t.has(`errors.${code}` as "errors.error") ? t(`errors.${code}` as "errors.error") : t("errors.error"));
            })
            .finally(() => setPending(false));
        }}
      >
        <p id="note-label" className="mb-2 font-semibold">
          {t("write")}
        </p>
        <NoteEditor
          resetKey={draft}
          placeholder={t("writePlaceholder")}
          rtl={locale !== "en"}
          labelledBy="note-label"
          onChange={setBody}
        />
        <div className="mt-4">
          <p className="text-sm font-medium">{t("besideAsk")}</p>
          <div className="mt-2 flex flex-wrap gap-2">
            <button
              type="button"
              aria-pressed={!beside}
              className={!beside ? "c-pill c-press h-11 px-4 text-sm" : "c-quiet c-press h-11 px-4 text-sm"}
              onClick={() => {
                setBeside(false);
                setAreaId("none");
                setProjectId("none");
                setOpen(false);
              }}
            >
              {t("besideForum")}
            </button>
            <button
              type="button"
              aria-pressed={beside}
              className={beside ? "c-pill c-press h-11 px-4 text-sm" : "c-quiet c-press h-11 px-4 text-sm"}
              onClick={() => setBeside(true)}
            >
              {t("besideProject")}
            </button>
          </div>
        </div>
        {beside ? (
          <div className="mt-3">
            <p className="c-meta">{t("besideHelp")}</p>
            <div className="mt-3 grid gap-3 sm:grid-cols-2">
              <label className="block text-sm font-medium" htmlFor="note-area">
                {t("besideFilter")}
                <div className="mt-2">
                  <CircleSelect
                    id="note-area"
                    label={t("besideFilter")}
                    value={areaId}
                    onValueChange={(next) => {
                      setAreaId(next);
                      if (next !== "none" && project?.areaId !== next) setProjectId("none");
                    }}
                    options={[{ value: "none", label: t("regionNone") }, ...areas.map((item) => ({ value: item.id, label: item.name }))]}
                  />
                </div>
              </label>
              <label className="block text-sm font-medium" htmlFor="note-project">
                {t("noteProject")}
                <div className="mt-2">
                  <CircleSelect
                    id="note-project"
                    label={t("noteProject")}
                    value={visible.some((item) => item.id === projectId) ? projectId : "none"}
                    onValueChange={(next) => {
                      setProjectId(next);
                      const picked = projects.find((item) => item.id === next);
                      if (picked?.areaId) setAreaId(picked.areaId);
                    }}
                    options={[
                      { value: "none", label: t("besidePick") },
                      ...visible.map((item) => ({ value: item.id, label: item.areaName ? `${item.name} · ${item.areaName}` : item.name })),
                    ]}
                  />
                </div>
              </label>
            </div>
            {canIntroduce ? (
              <button type="button" className="c-press mt-3 inline-flex min-h-11 items-center text-sm font-semibold text-[var(--c-palm)]" aria-expanded={open} onClick={() => setOpen((value) => !value)}>
                {t("besideMissing")}
              </button>
            ) : null}
          </div>
        ) : null}
      </form>
      {beside && open ? (
        <IntroduceForm locale={locale} neighbourhoods={neighbourhoods} />
      ) : (
        <div className="mt-4 flex flex-col gap-3 border-t border-[var(--c-line)] pt-4 sm:flex-row sm:items-center sm:justify-between">
          <p className="c-ink-2 min-w-0 flex-1 text-sm leading-6">{where}</p>
          <button type="submit" form="note-form" disabled={pending || !notePlain(body) || (beside && !project)} className="c-pill c-press h-11 w-full shrink-0 px-5 text-sm sm:w-auto sm:min-w-36">
            {t("writeSend")}
          </button>
        </div>
      )}
      {error ? <p className="c-ember mt-2 text-sm">{error}</p> : null}
    </section>
  );
}

type FactKind = ProjectFacts["kind"];

function factPayload(kind: FactKind, price: string, handover: string, sizeMin: string, sizeMax: string, units: string) {
  return { kind, startPrice: price, handover, sizeMin, sizeMax, unitCount: units };
}

function FactFields({
  idPrefix,
  kind,
  price,
  handover,
  sizeMin,
  sizeMax,
  units,
  currency,
  onKind,
  onPrice,
  onHandover,
  onSizeMin,
  onSizeMax,
  onUnits,
}: {
  idPrefix: string;
  kind: FactKind;
  price: string;
  handover: string;
  sizeMin: string;
  sizeMax: string;
  units: string;
  currency: string;
  onKind: (value: FactKind) => void;
  onPrice: (value: string) => void;
  onHandover: (value: string) => void;
  onSizeMin: (value: string) => void;
  onSizeMax: (value: string) => void;
  onUnits: (value: string) => void;
}) {
  const t = useTranslations("circle");
  return (
    <div className="c-facts-grid">
      <label className="c-fact" htmlFor={`${idPrefix}-kind`}>
        <span className="c-fact-label">{t("factKind")}</span>
        <div className="min-w-0">
        <CircleSelect
          id={`${idPrefix}-kind`}
          label={t("factKind")}
          value={kind}
          onValueChange={(next) => onKind(next === "villa" || next === "townhouse" ? next : "apartment")}
          options={[
            { value: "apartment", label: t("factApartment") },
            { value: "villa", label: t("factVilla") },
            { value: "townhouse", label: t("factTownhouse") },
          ]}
        />
        </div>
      </label>
      <label className="c-fact" htmlFor={`${idPrefix}-price`}>
        <span className="c-fact-label">
          {t("factPrice")} <bdi className="c-meta font-normal">{currency}</bdi>
        </span>
        <input id={`${idPrefix}-price`} value={price} onChange={(event) => onPrice(event.target.value)} inputMode="decimal" dir="ltr" className="c-field" />
      </label>
      <label className="c-fact" htmlFor={`${idPrefix}-handover`}>
        <span className="c-fact-label">{t("factHandover")}</span>
        <input id={`${idPrefix}-handover`} value={handover} onChange={(event) => onHandover(event.target.value)} maxLength={40} className="c-field" />
      </label>
      <label className="c-fact" htmlFor={`${idPrefix}-units`}>
        <span className="c-fact-label">{t("factUnits")}</span>
        <input id={`${idPrefix}-units`} value={units} onChange={(event) => onUnits(event.target.value)} inputMode="numeric" dir="ltr" className="c-field" />
      </label>
      <div className="c-fact c-fact-size">
        <span className="c-fact-label" id={`${idPrefix}-size-label`}>
          {t("factSize")} <span className="c-meta font-normal">{t("factSqft")}</span>
        </span>
        <div className="c-fact-range">
          <input
            id={`${idPrefix}-size-min`}
            value={sizeMin}
            onChange={(event) => onSizeMin(event.target.value)}
            inputMode="decimal"
            dir="ltr"
            aria-label={t("factSizeFrom")}
            className="c-field"
          />
          <span className="c-meta" aria-hidden="true">{t("factTo")}</span>
          <input
            id={`${idPrefix}-size-max`}
            value={sizeMax}
            onChange={(event) => onSizeMax(event.target.value)}
            inputMode="decimal"
            dir="ltr"
            aria-label={t("factSizeTo")}
            className="c-field"
          />
        </div>
      </div>
    </div>
  );
}

function ProjectFactsForm({ projectId, facts }: { projectId: string; facts: ProjectFacts }) {
  const t = useTranslations("circle");
  const router = useRouter();
  const [kind, setKind] = useState<FactKind>(facts.kind);
  const [price, setPrice] = useState(facts.startPrice > 0 ? String(facts.startPrice) : "");
  const [handover, setHandover] = useState(facts.handover);
  const [sizeMin, setSizeMin] = useState(facts.sizeMin > 0 ? String(facts.sizeMin) : "");
  const [sizeMax, setSizeMax] = useState(facts.sizeMax > 0 ? String(facts.sizeMax) : "");
  const [units, setUnits] = useState(facts.unitCount > 0 ? String(facts.unitCount) : "");
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);
  const [saved, setSaved] = useState(false);

  return (
    <form
      className="c-card c-facts px-4 py-4"
      onSubmit={(event) => {
        event.preventDefault();
        setPending(true);
        setError("");
        setSaved(false);
        send("/api/v1/circle/project", { id: projectId, ...factPayload(kind, price, handover, sizeMin, sizeMax, units) }, "PATCH")
          .then(() => {
            setSaved(true);
            router.refresh();
          })
          .catch((caught: unknown) => {
            const code = caught instanceof Error ? caught.message : "error";
            setError(t.has(`errors.${code}` as "errors.error") ? t(`errors.${code}` as "errors.error") : t("errors.error"));
          })
          .finally(() => setPending(false));
      }}
    >
      <h3 className="font-semibold">{t("factTitle")}</h3>
      <p className="c-meta mt-1 text-sm leading-6">{t("factHint")}</p>
      <FactFields
        idPrefix="project-fact"
        kind={kind}
        price={price}
        handover={handover}
        sizeMin={sizeMin}
        sizeMax={sizeMax}
        units={units}
        currency={facts.currency}
        onKind={setKind}
        onPrice={setPrice}
        onHandover={setHandover}
        onSizeMin={setSizeMin}
        onSizeMax={setSizeMax}
        onUnits={setUnits}
      />
      <div className="c-facts-foot">
        <p className="min-w-0 text-sm leading-6">
          {error ? <span className="c-ember">{error}</span> : saved ? t("factSaved") : null}
        </p>
        <button type="submit" disabled={pending} className="c-pill c-press text-sm">
          {t("factSave")}
        </button>
      </div>
    </form>
  );
}

function IntroduceForm({ locale, neighbourhoods }: { locale: string; neighbourhoods: NeighbourhoodChoice[] }) {
  const t = useTranslations("circle");
  const router = useRouter();
  const [name, setName] = useState("");
  const [body, setBody] = useState("");
  const [kind, setKind] = useState<FactKind>("apartment");
  const [price, setPrice] = useState("");
  const [handover, setHandover] = useState("");
  const [sizeMin, setSizeMin] = useState("");
  const [sizeMax, setSizeMax] = useState("");
  const [units, setUnits] = useState("");
  const [country, setCountry] = useState<MapCountry>("ae");
  const [cityId, setCityId] = useState("none");
  const [areaId, setAreaId] = useState("none");
  const [place, setPlace] = useState<CirclePlace | null>(null);
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);
  const here = neighbourhoods.filter((item) => item.country === country);
  const cities = [...new Map(here.map((item) => [item.cityId, item.cityName])).entries()]
    .map(([id, label]) => ({ id, label }))
    .sort((a, b) => a.label.localeCompare(b.label, locale));
  const areas = here.filter((item) => item.cityId === cityId).slice().sort((a, b) => a.name.localeCompare(b.name, locale));
  const area = areas.find((item) => item.id === areaId);
  const ready = Boolean(area && place?.kind === "point" && name.trim().length >= 2 && body.trim());

  return (
    <form
      className="c-introduce"
      id="new-project-form"
      onSubmit={(event) => {
        event.preventDefault();
        if (!area) {
          setError(t("introduceNeedArea"));
          return;
        }
        if (place?.kind !== "point") {
          setError(t("introducePinNeed"));
          return;
        }
        setPending(true);
        setError("");
        send("/api/v1/circle/project", {
          name,
          body,
          locale,
          areaId: area.id,
          point: place.point,
          ...factPayload(kind, price, handover, sizeMin, sizeMax, units),
        })
          .then((data) => {
            const id = String((data as { id?: string }).id ?? "");
            if (id) router.push(`/majlis?project=${id}`);
            router.refresh();
          })
          .catch((caught: unknown) => {
            const code = caught instanceof Error ? caught.message : "error";
            setError(t.has(`errors.${code}` as "errors.error") ? t(`errors.${code}` as "errors.error") : t("errors.error"));
          })
          .finally(() => setPending(false));
      }}
    >
      <h3 id="new-project" className="font-semibold">{t("introduce")}</h3>
      <div className="mt-3 flex gap-2">
        {(["ae", "om"] as const).map((item) => (
          <button
            key={item}
            type="button"
            aria-pressed={country === item}
            className={country === item ? "c-pill c-press h-11 px-4 text-sm" : "c-quiet c-press h-11 px-4 text-sm"}
            onClick={() => {
              setCountry(item);
              setCityId("none");
              setAreaId("none");
              setPlace(null);
            }}
          >
            {item === "ae" ? t("mapEmirates") : t("mapOman")}
          </button>
        ))}
      </div>
      <div className="mt-3 grid gap-3 sm:grid-cols-2">
        <label className="block text-sm font-medium" htmlFor="introduce-city">
          {t("introduceCity")}
          <div className="mt-2">
            <CircleSelect
              id="introduce-city"
              label={t("introduceCity")}
              value={cities.some((item) => item.id === cityId) ? cityId : "none"}
              onValueChange={(next) => {
                setCityId(next);
                setAreaId("none");
                setPlace(null);
              }}
              options={[{ value: "none", label: t("introduceCityNone") }, ...cities.map((item) => ({ value: item.id, label: item.label }))]}
            />
          </div>
        </label>
        <label className="block text-sm font-medium" htmlFor="introduce-area">
          {t("introduceArea")}
          <div className="mt-2">
            <CircleSelect
              id="introduce-area"
              label={t("introduceArea")}
              value={areas.some((item) => item.id === areaId) ? areaId : "none"}
              onValueChange={(next) => {
                setAreaId(next);
                setPlace(null);
              }}
              options={[{ value: "none", label: t("introduceAreaNone") }, ...areas.map((item) => ({ value: item.id, label: item.name }))]}
            />
          </div>
        </label>
      </div>
      {area ? <p className="c-ink-2 mt-3 text-sm leading-6">{t("introduceWhere", { area: area.name, city: area.cityName })}</p> : null}
      <label className="mt-3 block text-sm font-medium" htmlFor="introduce-name">
        {t("introduceName")}
        <span className="c-star" aria-hidden="true">*</span>
        <input id="introduce-name" value={name} onChange={(event) => setName(event.target.value)} className="c-field mt-2" />
      </label>
      <label className="mt-3 block text-sm font-medium" htmlFor="introduce-body">
        {t("introduceBody")}
        <span className="c-star" aria-hidden="true">*</span>
        <textarea
          id="introduce-body"
          value={body}
          onChange={(event) => setBody(event.target.value)}
          placeholder={t("introduceBodyPlaceholder")}
          rows={3}
          className="c-area mt-2"
        />
      </label>
      <div className="c-facts">
      <p className="c-meta mt-3 text-sm leading-6">{t("factHint")}</p>
      <FactFields
        idPrefix="introduce-fact"
        kind={kind}
        price={price}
        handover={handover}
        sizeMin={sizeMin}
        sizeMax={sizeMax}
        units={units}
        currency={country === "om" ? "OMR" : "AED"}
        onKind={setKind}
        onPrice={setPrice}
        onHandover={setHandover}
        onSizeMin={setSizeMin}
        onSizeMax={setSizeMax}
        onUnits={setUnits}
      />
      </div>
      {area ? (
        <div className="mt-3">
          <p className="text-sm font-medium">{t("introducePin")}</p>
          <p className="c-meta mt-1">{t("introduceInside", { area: area.name })}</p>
          <div className="mt-2">
            <PlacePick
              key={area.id}
              mode="point"
              country={country}
              boundary={area.ring}
              place={place}
              onPlace={setPlace}
              outsideLabel={t("projectRangeOutside")}
            />
          </div>
          {place?.kind === "point" ? (
            <button type="button" className="c-quiet c-press mt-2 h-11 px-4 text-sm" onClick={() => setPlace(null)}>
              {t("introducePinClear")}
            </button>
          ) : (
            <p className="c-meta mt-2">{t("introducePinNeed")}</p>
          )}
        </div>
      ) : (
        <p className="c-meta mt-3">{t("introduceNeedArea")}</p>
      )}
      {error ? <p className="c-ember mt-2 text-sm">{error}</p> : null}
      {place?.kind === "point" && (name.trim().length < 2 || !body.trim()) ? <p className="c-meta mt-2">{t("introduceNeedText")}</p> : null}
      <button type="submit" disabled={pending || !ready} className="c-pill c-press mt-3 h-11 w-full text-sm">
        {area ? t("introduceSendIn", { area: area.name }) : t("introduceSend")}
      </button>
    </form>
  );
}

function Composer({
  locale,
  viewer,
  projectId,
  projectLabel,
  desks,
}: {
  locale: string;
  viewer: CircleViewer;
  projectId: string;
  projectLabel: string;
  desks: DeskPerson[];
}) {
  const t = useTranslations("circle");
  const router = useRouter();
  const [body, setBody] = useState("");
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);
  const [posted, setPosted] = useState(false);
  const others = desks.filter((person) => person.handle !== viewer.handle);
  const lead = others[0];
  const heading = !lead
    ? t("noteHere", { project: projectLabel })
    : others.length === 1
      ? t("askFrom", { name: lead.displayName })
      : t("askFromMany", { name: lead.displayName, count: others.length - 1 });
  const where = posted
    ? lead
      ? t("posted")
      : t("noteHerePosted")
    : !lead
      ? t("noteHereWhere", { project: projectLabel })
      : others.length === 1
        ? t("askWhere", { name: lead.displayName, project: projectLabel })
        : t("askWhereMany", { project: projectLabel });

  return (
    <form
      id="composer"
      className="c-card px-4 py-4"
      onSubmit={(event) => {
        event.preventDefault();
        setPending(true);
        setError("");
        setPosted(false);
        send("/api/v1/circle/posts", { body, kind: lead ? "ask" : "note", visibility: "circle", projectId, locale })
          .then(() => {
            setBody("");
            setPosted(true);
            router.push(`/majlis?project=${projectId}`);
            router.refresh();
          })
          .catch((caught: unknown) => {
            const code = caught instanceof Error ? caught.message : "error";
            setError(t.has(`errors.${code}` as "errors.error") ? t(`errors.${code}` as "errors.error") : t("errors.error"));
          })
          .finally(() => setPending(false));
      }}
    >
      <div className="flex items-baseline justify-between gap-3">
        <h3 className="text-lg font-semibold leading-snug">
          {lead ? (
            <Link href={`/majlis/${lead.handle}`} className="c-press">
              {heading}
            </Link>
          ) : (
            heading
          )}
        </h3>
        {lead ? <span className="c-meta shrink-0">{deskRole(lead.role, t)}</span> : null}
      </div>
      {others.length > 1 ? (
        <ul className="mt-1">
          {others.map((person) => (
            <li key={person.handle}>
              <Link href={`/majlis/${person.handle}`} className="c-press inline-flex min-h-11 items-center gap-2 text-sm">
                <span className="font-medium">{person.displayName}</span>
                <span className="c-meta">{deskRole(person.role, t)}</span>
              </Link>
            </li>
          ))}
        </ul>
      ) : null}
      <p className="c-meta mt-2 text-sm leading-6">{where}</p>
      <label htmlFor="composer-body" className="sr-only">
        {lead ? t("composerBody") : t("noteHere", { project: projectLabel })}
      </label>
      <textarea
        id="composer-body"
        value={body}
        onChange={(event) => {
          setBody(event.target.value);
          setPosted(false);
        }}
        placeholder={t("composerPlaceholder")}
        rows={3}
        className="c-area mt-3"
      />
      {error ? <p className="c-ember mt-2 text-sm">{error}</p> : null}
      <div className="mt-3 flex gap-2">
        <button type="submit" disabled={pending || !body.trim()} className="c-pill c-press h-11 px-5 text-sm">
          {lead ? t("boardAsk") : t("writeSend")}
        </button>
        {body ? (
          <button
            type="button"
            className="c-quiet c-press h-11 px-4 text-sm"
            onClick={() => {
              setBody("");
              setPosted(false);
            }}
          >
            {t("clear")}
          </button>
        ) : null}
      </div>
    </form>
  );
}

export function PostList({
  locale,
  viewer,
  posts,
  empty,
}: {
  locale: string;
  viewer: CircleViewer | null;
  posts: CirclePostView[];
  empty: string;
}) {
  if (!posts.length) return <p className="c-card c-ink-2 px-4 py-10 text-sm leading-6">{empty}</p>;
  return (
    <div className="flex flex-col gap-3">
      {posts.map((post) => (
        <PostCard key={post.id} locale={locale} viewer={viewer} post={post} />
      ))}
    </div>
  );
}

function NoteMap({ point, href, label }: { point: [number, number]; href: string; label: string }) {
  const frame = useRef<HTMLDivElement>(null);
  const [shown, setShown] = useState(false);
  useEffect(() => {
    const node = frame.current;
    if (!node) return;
    let frameId = 0;
    const check = () => {
      frameId = 0;
      const box = node.getBoundingClientRect();
      setShown(box.width > 0 && box.bottom > -240 && box.top < window.innerHeight + 240);
    };
    const schedule = () => {
      if (!frameId) frameId = window.requestAnimationFrame(check);
    };
    check();
    const timer = window.setInterval(check, 500);
    window.addEventListener("scroll", schedule, true);
    window.addEventListener("resize", schedule);
    return () => {
      if (frameId) window.cancelAnimationFrame(frameId);
      window.clearInterval(timer);
      window.removeEventListener("scroll", schedule, true);
      window.removeEventListener("resize", schedule);
    };
  }, []);
  useEffect(() => {
    const node = frame.current;
    if (!shown || !node) return;
    setWorkerUrl("/maplibre-gl-worker.mjs");
    const map = new MapView({
      container: node,
      style: mapStyleUrl("liberty"),
      center: point,
      zoom: 14.6,
      interactive: false,
      attributionControl: false,
      fadeDuration: 0,
    });
    const framePlace = () => {
      map.resize();
      map.fitBounds(
        [
          [point[0] - 0.008, point[1] - 0.006],
          [point[0] + 0.008, point[1] + 0.006],
        ],
        { padding: 24, duration: 0, maxZoom: 15.2 },
      );
    };
    map.on("load", framePlace);
    const mark = new Marker({ color: "#0f7a72" }).setLngLat(point).addTo(map);
    return () => {
      mark.remove();
      map.remove();
    };
  }, [point, shown]);
  return (
    <Link href={href} className="c-note-map" aria-label={label}>
      <div ref={frame} className="c-note-map-canvas" />
    </Link>
  );
}

export function PostCard({
  locale,
  viewer,
  post,
}: {
  locale: string;
  viewer: CircleViewer | null;
  post: CirclePostView;
}) {
  const t = useTranslations("circle");
  const router = useRouter();
  const [comment, setComment] = useState("");
  const [editing, setEditing] = useState<string | null>(null);
  const [draft, setDraft] = useState("");
  const [editingNote, setEditingNote] = useState(false);
  const [noteDraft, setNoteDraft] = useState(post.body);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");

  function act(url: string, payload: unknown, method = "POST") {
    if (!viewer) {
      askForDesk();
      return;
    }
    setPending(true);
    setError("");
    send(url, payload, method)
      .then(() => router.refresh())
      .catch((caught: unknown) => {
        const code = caught instanceof Error ? caught.message : "error";
        if (code === "auth") {
          askForDesk();
          return;
        }
        setError(t.has(`errors.${code}` as "errors.error") ? t(`errors.${code}` as "errors.error") : t("errors.error"));
      })
      .finally(() => setPending(false));
  }

  const kinds: Record<PostKind, string> = {
    note: t("kindNote"),
    reading: t("kindReading"),
    ask: t("kindAsk"),
    desk: t("kindDesk"),
  };
  const emojiLabels = {
    like: t("reactLike"),
    love: t("reactLove"),
    laugh: t("reactLaugh"),
    wow: t("reactWow"),
    sad: t("reactSad"),
    fire: t("reactFire"),
  } as const;
  const activeGlyph = post.myReaction ? glyphFor(post.myReaction) : null;

  async function share() {
    const url = `${window.location.origin}/${locale}/majlis/post/${post.id}`;
    try {
      if (navigator.share) await navigator.share({ title: post.author.displayName, url });
      else await navigator.clipboard.writeText(url);
    } catch {
      /* A dismissed share sheet is not a failure. */
    }
  }

  return (
    <article className="c-card px-4 py-4">
      <header className="flex items-start gap-3">
        <Link href={`/majlis/${post.author.handle}`} aria-label={post.author.displayName}>
          <Face name={post.author.displayName} seed={post.author.handle} size={48} />
        </Link>
        <div className="min-w-0 flex-1">
          <div className="flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1">
            <Link href={`/majlis/${post.author.handle}`} className="font-semibold">
              {post.author.displayName}
            </Link>
            <span className="c-meta">{deskRole(post.author.role, t)}</span>
            {post.sample ? <span className="c-sample px-1.5 py-0.5">{t("sample")}</span> : null}
            <span className="c-chip px-2 py-0.5">{kinds[post.kind]}</span>
            {viewer?.id === post.author.id && !post.sample ? (
              <span className="ms-auto flex items-center">
                <button
                  type="button"
                  disabled={pending}
                  className="c-press grid h-8 w-8 place-items-center rounded-lg c-ink-2"
                  aria-label={t("editNote")}
                  onClick={() => {
                    setNoteDraft(post.body);
                    setEditingNote(true);
                  }}
                >
                  <Pencil size={16} />
                </button>
                <button
                  type="button"
                  disabled={pending}
                  className="c-press grid h-8 w-8 place-items-center rounded-lg c-ink-2"
                  aria-label={t("deleteNote")}
                  onClick={() => act("/api/v1/circle/posts", { postId: post.id }, "DELETE")}
                >
                  <Trash2 size={16} />
                </button>
              </span>
            ) : null}
          </div>
          <p className="c-meta mt-0.5 flex min-w-0 flex-wrap items-baseline gap-x-1">
            <HallMark sign="@" value={post.author.handle} />
            <span aria-hidden> · </span>
            <Link href={`/majlis/post/${post.id}`}>
              <time dateTime={post.createdAt}>{post.when}</time>
            </Link>
            {post.author.city ? ` · ${post.author.city}` : ""}
            {post.visibility === "followers" ? ` · ${t("followersOnly")}` : ""}
          </p>
        </div>
      </header>
      {editingNote ? (
        <form
          className="mt-3"
          onSubmit={(event) => {
            event.preventDefault();
            if (!notePlain(noteDraft)) return;
            setPending(true);
            setError("");
            send("/api/v1/circle/posts", { postId: post.id, body: noteDraft, locale }, "PATCH")
              .then(() => {
                setEditingNote(false);
                router.refresh();
              })
              .catch((caught: unknown) => {
                const code = caught instanceof Error ? caught.message : "error";
                setError(t.has(`errors.${code}` as "errors.error") ? t(`errors.${code}` as "errors.error") : t("errors.error"));
              })
              .finally(() => setPending(false));
          }}
        >
          <span id={`edit-${post.id}`} className="sr-only">
            {t("editNote")}
          </span>
          <NoteEditor
            resetKey={post.id}
            initial={post.body}
            placeholder={t("writePlaceholder")}
            rtl={locale !== "en"}
            labelledBy={`edit-${post.id}`}
            onChange={setNoteDraft}
          />
          <div className="mt-3 flex gap-2">
            <button type="submit" disabled={pending || !notePlain(noteDraft)} className="c-pill c-press h-11 px-4 text-sm">
              {t("saveNote")}
            </button>
            <button type="button" className="c-quiet c-press h-11 px-4 text-sm" onClick={() => setEditingNote(false)}>
              {t("cancelEdit")}
            </button>
          </div>
        </form>
      ) : (
        <CircleBody text={post.body} className="mt-3 whitespace-pre-wrap break-words text-base leading-8" />
      )}
      {post.project?.point ? (
        <NoteMap point={post.project.point} href={`/map?project=${post.project.id}`} label={t("openOnMap")} />
      ) : post.place ? (
        <NoteMap point={post.place.point} href={`/map?note=${encodeURIComponent(post.id)}`} label={t("openOnMap")} />
      ) : null}
      {/[0-9\u0660-\u0669\u06F0-\u06F9]/.test(notePlain(post.body)) ? <p className="c-meta mt-2">{t("readingNote")}</p> : null}
      {post.project ? (
        <Link href={`/majlis?project=${post.project.id}`} className="c-project">
          <span>{t("onProject")}</span>
          <strong className="truncate">{post.project.name}</strong>
        </Link>
      ) : null}
      {post.place ? (
        <Link href={`/map?note=${encodeURIComponent(post.id)}`} className="c-project">
          <span>{post.place.kind === "point" ? t("mapPoint") : t("mapRange")}</span>
          <strong>{post.place.country === "om" ? t("mapOman") : t("mapEmirates")}</strong>
        </Link>
      ) : null}
      <div className="mt-3 flex flex-wrap items-center gap-1">
        <div className="flex items-center gap-0.5">
          <ReactionSelect
            post={post}
            pending={pending}
            labels={emojiLabels}
            placeholder={t("reactChoose")}
            active={activeGlyph}
            onPick={(kind) =>
              act("/api/v1/circle/react", {
                postId: post.id,
                type: activeGlyph === kind && post.myReaction ? post.myReaction : kind,
              })
            }
          />
          <Link href={`/majlis/post/${post.id}`} className="c-press flex min-h-11 items-center gap-1 rounded-lg px-2 c-ink-2" aria-label={t("thread")}>
            <MessageCircle size={20} />
            <span className="text-sm font-semibold tabular-nums">{post.commentCount || ""}</span>
          </Link>
        </div>
        <div className="flex items-center">
          <button type="button" className="c-press grid h-11 w-11 place-items-center rounded-lg c-ink-2" aria-label={t("share")} onClick={() => void share()}>
            <Share2 size={18} />
          </button>
          <button
            type="button"
            disabled={pending}
            aria-pressed={post.bookmarked}
            aria-label={post.bookmarked ? t("saved") : t("save")}
            className="c-press grid h-11 w-11 place-items-center rounded-lg"
            onClick={() => act("/api/v1/circle/bookmarks", { postId: post.id })}
          >
            <Bookmark size={18} fill={post.bookmarked ? "currentColor" : "none"} />
          </button>
        </div>
      </div>
      {post.comments.some((item) => item.answer) ? (
        <div className="mt-4 border-t border-[var(--c-line)] pt-3">
          <h3 className="text-sm font-semibold">{t("answer")}</h3>
          <ul className="mt-2 space-y-3">
            {post.comments.filter((item) => item.answer).map((item) => (
              <li key={item.id} className="flex gap-2">
                <Face name={item.author.displayName} seed={item.author.handle} size={28} />
                <div className="min-w-0">
                  <Link href={`/majlis/${item.author.handle}`} className="text-sm font-semibold">
                    {item.author.displayName}
                  </Link>
                  <CircleText text={item.body} className="whitespace-pre-wrap break-words text-sm leading-6" />
                </div>
              </li>
            ))}
          </ul>
        </div>
      ) : null}
      {post.comments.some((item) => !item.answer) ? (
        <ul className="mt-4 space-y-3 border-t border-[var(--c-line)] pt-3">
          {post.comments.filter((item) => !item.answer).map((item) => (
            <li key={item.id} className="flex gap-2">
              <Face name={item.author.displayName} seed={item.author.handle} size={28} />
              <div className="min-w-0">
                <Link href={`/majlis/${item.author.handle}`} className="text-sm font-semibold">
                  {item.author.displayName}
                </Link>
                {viewer?.id === item.author.id ? (
                  <>
                    <button
                      type="button"
                      disabled={pending}
                      className="c-press ms-2 inline-grid h-7 w-7 place-items-center rounded-lg align-middle c-ink-2"
                      aria-label={t("editComment")}
                      onClick={() => {
                        setEditing(item.id);
                        setDraft(item.body);
                      }}
                    >
                      <Pencil size={14} />
                    </button>
                    <button
                      type="button"
                      disabled={pending}
                      className="c-press inline-grid h-7 w-7 place-items-center rounded-lg align-middle c-ink-2"
                      aria-label={t("deleteComment")}
                      onClick={() => act("/api/v1/circle/comments", { commentId: item.id }, "DELETE")}
                    >
                      <Trash2 size={14} />
                    </button>
                  </>
                ) : null}
                {editing === item.id ? (
                  <form
                    className="c-reply mt-1"
                    onSubmit={(event) => {
                      event.preventDefault();
                      const text = draft.trim();
                      if (!text) return;
                      setPending(true);
                      setError("");
                      send("/api/v1/circle/comments", { commentId: item.id, body: text }, "PATCH")
                        .then(() => {
                          setEditing(null);
                          router.refresh();
                        })
                        .catch((caught: unknown) => {
                          const code = caught instanceof Error ? caught.message : "error";
                          setError(t.has(`errors.${code}` as "errors.error") ? t(`errors.${code}` as "errors.error") : t("errors.error"));
                        })
                        .finally(() => setPending(false));
                    }}
                  >
                    <input value={draft} onChange={(event) => setDraft(event.target.value)} className="c-field min-w-0 flex-1" />
                    <button type="submit" disabled={pending || !draft.trim()} className="c-pill c-press">
                      {t("saveComment")}
                    </button>
                  </form>
                ) : (
                  <CircleText text={item.body} className="whitespace-pre-wrap break-words text-sm leading-6" />
                )}
              </div>
            </li>
          ))}
        </ul>
      ) : null}
      {viewer ? (
        <form
          className="c-reply mt-3"
          onSubmit={(event) => {
            event.preventDefault();
            const text = comment.trim();
            if (!text) return;
            setPending(true);
            send("/api/v1/circle/comments", { postId: post.id, body: text })
              .then(() => {
                setComment("");
                router.refresh();
              })
              .catch(() => setError(t("errors.error")))
              .finally(() => setPending(false));
          }}
        >
          <input
            value={comment}
            onChange={(event) => setComment(event.target.value)}
            placeholder={post.canAnswer ? t("answerPlaceholder") : t("commentPlaceholder")}
            className="c-field min-w-0 flex-1"
          />
          <button type="submit" disabled={pending || !comment.trim()} className="c-pill c-press">
            {post.canAnswer ? t("answerSend") : t("commentSend")}
          </button>
        </form>
      ) : null}
      {error ? <p className="c-ember mt-2 text-sm">{error}</p> : null}
    </article>
  );
}

export function CirclePeople({ people, initialQuery = "" }: { people: CirclePerson[]; initialQuery?: string }) {
  const t = useTranslations("circle");
  const [query, setQuery] = useState(initialQuery);
  const needle = query.trim().toLowerCase();
  const shown = needle
    ? people.filter((person) =>
        [person.displayName, person.handle, person.city, person.focus, person.role].join("\n").toLowerCase().includes(needle),
      )
    : people;
  const groups = [
    ["agent", "agents"],
    ["investor", "investors"],
    ["buyer", "buyers"],
    ["seller", "sellers"],
  ] as const;
  return (
    <div className="c-stack">
      <form className="c-find" role="search" onSubmit={(event) => event.preventDefault()}>
        <label htmlFor="majlis-people">{t("searchLabel")}</label>
        <div className="c-search">
          <Search size={18} aria-hidden />
          <input
            id="majlis-people"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder={t("search")}
            autoComplete="off"
          />
        </div>
      </form>
      {needle && !shown.length ? <p className="c-ink-2 px-4 py-8 text-sm">{t("noMatch")}</p> : null}
      {groups.map(([role, label]) => {
        const group = shown.filter((person) => person.role === role);
        if (needle && !group.length) return null;
        return <PeopleBlock key={role} title={t(label)} people={group} />;
      })}
    </div>
  );
}

function PeopleBlock({ title, people }: { title: string; people: CirclePerson[] }) {
  const t = useTranslations("circle");
  return (
    <section>
      <h2 className="px-1 pt-2 font-semibold">{title}</h2>
      {people.length ? (
        <ul className="mt-2 flex w-full min-w-0 flex-col gap-3">
          {people.map((person) => (
            <li key={person.id} className="c-card flex items-start gap-3 px-4 py-3.5">
              <Link href={`/majlis/${person.handle}`} aria-label={person.displayName}>
                <Face name={person.displayName} seed={person.handle} size={56} />
              </Link>
              <div className="min-w-0 flex-1">
                <div className="flex items-start justify-between gap-2">
                  <Link href={`/majlis/${person.handle}`} className="min-w-0">
                    <span className="flex items-center gap-2">
                      <span className="truncate font-semibold">{person.displayName}</span>
                      {person.sample ? <span className="c-sample px-1.5 py-0.5">{t("sample")}</span> : null}
                    </span>
                    <span className="c-meta flex min-w-0 items-baseline gap-1 truncate">
                      <HallMark sign="@" value={person.handle} />
                      <span aria-hidden>·</span>
                      <span className="truncate">
                        {deskRole(person.role, t)} · {person.city}
                      </span>
                    </span>
                  </Link>
                  <FollowButton person={person} />
                </div>
                <p className="c-ink-2 mt-1 text-sm leading-6">{person.focus}</p>
                <p className="c-meta mt-1">
                  {person.followers} {t("statFollowers")} · {person.following} {t("statFollowing")}
                </p>
              </div>
            </li>
          ))}
        </ul>
      ) : (
        <p className="c-ink-2 px-4 py-8 text-sm">{t("emptyPeople")}</p>
      )}
    </section>
  );
}

function FollowButton({ person, compact = false }: { person: CirclePerson; compact?: boolean }) {
  const t = useTranslations("circle");
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const label = person.followedByMe ? t("unfollow") : t("follow");
  return (
    <button
      type="button"
      disabled={pending}
      className={person.followedByMe ? "c-quiet c-press shrink-0 px-3 py-1.5 text-xs" : "c-pill c-press shrink-0 px-3 py-1.5 text-xs"}
      onClick={() => {
        setPending(true);
        send("/api/v1/circle/follow", { handle: person.handle })
          .then(() => router.refresh())
          .finally(() => setPending(false));
      }}
    >
      {compact && person.followedByMe ? t("unfollow") : label}
    </button>
  );
}

export function CircleProfileView({
  locale,
  viewer,
  person,
  posts,
  desks,
  projects = [],
  blocked,
  blockedByMe,
}: {
  locale: string;
  viewer: CircleViewer | null;
  person: CirclePerson;
  posts: CirclePostView[];
  desks: ProjectChoice[];
  projects?: ProjectChoice[];
  blocked: boolean;
  blockedByMe: boolean;
}) {
  const t = useTranslations("circle");
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const mine = viewer?.id === person.id;

  return (
    <div>
      <div className="c-cover" />
      <div className="px-4">
        <div className="-mt-10 flex flex-wrap items-end justify-between gap-3">
          <span className="c-face-ring">
            <Face name={person.displayName} seed={person.handle} size={88} />
          </span>
          {viewer && !mine ? (
            <div className="mb-1 flex gap-2">
              <FollowButton person={person} />
              <button
                type="button"
                disabled={pending}
                className="c-quiet c-press px-3 py-1.5 text-xs"
                onClick={() => {
                  setPending(true);
                  send("/api/v1/circle/block", { handle: person.handle })
                    .then(() => router.refresh())
                    .finally(() => setPending(false));
                }}
              >
                {blockedByMe ? t("unblock") : t("block")}
              </button>
            </div>
          ) : null}
        </div>
        <h1 className="font-display mt-3 text-2xl leading-snug">{person.displayName}</h1>
        <p className="c-meta mt-1">
          @{person.handle} · {deskRole(person.role, t)}
          {person.city ? ` · ${person.city}` : ""}
          {person.sample ? ` · ${t("sample")}` : ""}
        </p>
        <p className="mt-3 text-sm leading-6">{person.focus}</p>
        <p className="c-ink-2 mt-1 text-sm leading-6">{person.bio}</p>
        <p className="c-meta mt-3">
          {person.followers} {t("statFollowers")} · {person.following} {t("statFollowing")}
        </p>
      </div>
      {blocked ? null : (
        <div className="c-stack">
          <DeskBoard mine={mine} role={person.role} desks={desks} projects={projects} />
        </div>
      )}
      {blocked ? (
        <p className="c-ink-2 px-4 py-10 text-sm">{t("closed")}</p>
      ) : (
        <div className="c-stack">
          <PostList locale={locale} viewer={viewer} posts={posts} empty={t("emptyFeed")} />
        </div>
      )}
    </div>
  );
}
