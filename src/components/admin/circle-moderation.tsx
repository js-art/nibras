"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { DeskSidebar } from "@/components/admin/desk-sidebar";
import { useConfirmDialog } from "@/components/ui/confirm-dialog";

type IntroducedPost = {
  id: string;
  body: string;
  sample: boolean;
  author: { id: string; handle: string; displayName: string };
};

type IntroducedProject = {
  id: string;
  name: string;
  area: string;
  person: { id: string; handle: string; displayName: string; banned: boolean; sample: boolean };
  posts: IntroducedPost[];
};

export function CircleModeration({ projects }: { projects: IntroducedProject[] }) {
  const t = useTranslations("admin");
  const router = useRouter();
  const { confirm, dialog } = useConfirmDialog();
  const [drafts, setDrafts] = useState<Record<string, string>>({});
  const [editing, setEditing] = useState<string | null>(null);
  const [status, setStatus] = useState("");

  async function send(method: string, payload: unknown) {
    setStatus(t("saving"));
    const response = await fetch("/api/admin/circle", {
      method,
      headers: { "content-type": "application/json" },
      body: JSON.stringify(payload),
    });
    if (!response.ok) {
      setStatus(t("formInvalid"));
      return;
    }
    setStatus(t("saved"));
    setEditing(null);
    router.refresh();
  }

  return (
    <div className="flex h-full min-h-0 bg-paper">
      {dialog}
      <DeskSidebar desk="circle" />
      <div className="flex min-w-0 flex-1 flex-col">
        <div className="border-b border-ink/10 px-6 py-4">
          <p className="text-sm text-mist">{status || t("circleLede")}</p>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto px-6 py-6">
          <div className="mx-auto grid max-w-3xl gap-4">
            {projects.length ? null : <p className="text-sm text-mist">{t("circleEmpty")}</p>}
            {projects.map((project) => (
              <article key={project.id} className="rounded-lg border border-[#d5dfd8] bg-white p-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <h2 className="text-lg font-semibold text-palm-deep">{project.name}</h2>
                    <p className="mt-1 text-sm text-mist">
                      {project.area} · @{project.person.handle} · {project.person.displayName}
                    </p>
                    {project.person.banned ? <p className="mt-1 text-sm text-[#8f2d2d]">{t("circleBanned")}</p> : null}
                  </div>
                  {project.person.sample ? null : (
                    <button
                      type="button"
                      className="inline-flex h-11 items-center rounded-lg border border-[#c5d0c9] bg-white px-4 text-sm font-medium"
                      onClick={async () => {
                        const ok = await confirm({
                          title: project.person.banned ? t("circleUnban") : t("circleBan"),
                          description: project.person.displayName,
                          confirmLabel: project.person.banned ? t("circleUnban") : t("circleBan"),
                          tone: project.person.banned ? "default" : "danger",
                        });
                        if (!ok) return;
                        await send("POST", { profileId: project.person.id, banned: !project.person.banned });
                      }}
                    >
                      {project.person.banned ? t("circleUnban") : t("circleBan")}
                    </button>
                  )}
                </div>
                <h3 className="mt-4 text-sm font-semibold">{t("circlePosts")}</h3>
                <ul className="mt-2 grid gap-3">
                  {project.posts.map((post) => (
                    <li key={post.id} className="border-t border-[#d5dfd8] pt-3">
                      <p className="text-sm text-mist">
                        {post.author.displayName} · @{post.author.handle}
                      </p>
                      {editing === post.id ? (
                        <form
                          className="mt-2 grid gap-2"
                          onSubmit={(event) => {
                            event.preventDefault();
                            void send("PATCH", { postId: post.id, body: drafts[post.id] ?? post.body });
                          }}
                        >
                          <textarea
                            value={drafts[post.id] ?? post.body}
                            onChange={(event) => setDrafts((current) => ({ ...current, [post.id]: event.target.value }))}
                            rows={4}
                            className="w-full rounded-lg border border-[#c5d0c9] px-3 py-2 text-base"
                          />
                          <div className="flex gap-2">
                            <button type="submit" className="inline-flex h-11 items-center rounded-lg bg-palm-deep px-4 text-sm font-medium text-[#e7f2ec]">
                              {t("circleSave")}
                            </button>
                            <button type="button" className="inline-flex h-11 items-center rounded-lg border border-[#c5d0c9] px-4 text-sm" onClick={() => setEditing(null)}>
                              {t("circleCancel")}
                            </button>
                          </div>
                        </form>
                      ) : (
                        <>
                          <p className="mt-1 whitespace-pre-wrap text-sm leading-6">{post.body}</p>
                          {post.sample ? null : (
                            <div className="mt-2 flex gap-2">
                              <button
                                type="button"
                                className="inline-flex h-11 items-center rounded-lg border border-[#c5d0c9] px-4 text-sm"
                                onClick={() => {
                                  setDrafts((current) => ({ ...current, [post.id]: post.body }));
                                  setEditing(post.id);
                                }}
                              >
                                {t("circleEdit")}
                              </button>
                              <button
                                type="button"
                                className="inline-flex h-11 items-center rounded-lg border border-[#e7c1c1] px-4 text-sm text-[#8f2d2d]"
                                onClick={async () => {
                                  const ok = await confirm({
                                    title: t("circleDelete"),
                                    description: post.author.displayName,
                                    confirmLabel: t("circleDelete"),
                                    tone: "danger",
                                  });
                                  if (!ok) return;
                                  await send("DELETE", { postId: post.id });
                                }}
                              >
                                {t("circleDelete")}
                              </button>
                            </div>
                          )}
                        </>
                      )}
                    </li>
                  ))}
                </ul>
              </article>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
