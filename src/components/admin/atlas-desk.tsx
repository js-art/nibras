"use client";

import { useEffect, useMemo, useState, type Dispatch, type SetStateAction } from "react";
import { useLocale, useTranslations } from "next-intl";
import { type ColumnDef } from "@tanstack/react-table";
import { DataTable } from "@/components/data-table/data-table";
import { DataTableColumnHeader } from "@/components/data-table/data-table-column-header";
import { DataTableToolbar } from "@/components/data-table/data-table-toolbar";
import { RichTextEditor } from "@/components/editor/rich-text-editor";
import { DeskSidebar } from "@/components/admin/desk-sidebar";
import { SketchMap } from "@/components/map/sketch-map";
import { ColorField, Select, areaClass, controlClass } from "@/components/ui/controls";
import { Button } from "@/components/ui/button";
import { useConfirmDialog } from "@/components/ui/confirm-dialog";
import { formatDeskDate } from "@/lib/format-desk-date";
import { useClientDataTable } from "@/lib/hooks/use-client-data-table";
import { circleRing, openRing, roundRing, simplify, type DrawMode } from "@/lib/shape";
import type { DataTableFilterField } from "@/types";
import { FieldError, FieldHint, HelpIcon, HintLabel, SectionHint } from "@/components/admin/hint-label";
import { ImagePickerField } from "@/components/admin/image-picker-field";
import { CountryPhoneInput } from "@/components/custom/inputs/country-phone-input";
import {
  centroid,
  closeRing,
  pick,
  seedAtlas,
  slugify,
  uniqueSlug,
  type Area,
  type Atlas,
  type Beds,
  type City,
  type Developer,
  type Kind,
  type LngLat,
  type LocaleText,
  type Currency,
  type Project,
  type Suggestion,
  type SuggestionKind,
  CURRENCIES,
  currencyOf,
} from "@/data/atlas";

type Section = "cities" | "areas" | "developers" | "projects" | "suggestions";

export type DeskView =
  | { mode: "list"; section: Section }
  | { mode: "new"; section: Section }
  | { mode: "edit"; section: Section; id: string };

type Draft =
  | { section: "cities"; creating: boolean; value: City }
  | { section: "areas"; creating: boolean; value: Area }
  | { section: "developers"; creating: boolean; value: Developer }
  | { section: "projects"; creating: boolean; value: Project; place: "point" | "ring" }
  | { section: "suggestions"; creating: boolean; value: Suggestion };

const fieldClass = controlClass;

const blankText = (): LocaleText => ({ en: "", ar: "", fa: "" });

function draftFromView(view: DeskView, atlas: Atlas): Draft | null {
  if (view.mode === "list") return null;
  if (view.mode === "new") return blankDraft(view.section, atlas);
  return loadDraft(view.section, atlas, view.id);
}

function deskSearch(nextSection: Section, opts?: { id?: string; creating?: boolean }) {
  const params = new URLSearchParams();
  params.set("section", nextSection);
  if (opts?.creating) params.set("new", "1");
  else if (opts?.id) params.set("id", opts.id);
  return params.toString();
}

/** Update the query string without triggering an App Router RSC refetch (avoids desk remount thrash). */
function replaceDeskQuery(nextSection: Section, opts?: { id?: string; creating?: boolean }) {
  if (typeof window === "undefined") return;
  const url = `${window.location.pathname}?${deskSearch(nextSection, opts)}`;
  window.history.replaceState(window.history.state, "", url);
}

export function AtlasDesk({
  initial,
  view,
}: {
  initial: Atlas;
  view: DeskView;
}) {
  const t = useTranslations("admin");
  const locale = useLocale();
  const { confirm, dialog: confirmDialog } = useConfirmDialog();
  const [atlas, setAtlas] = useState(initial);
  const [section, setSection] = useState<Section>(view.section);
  const [draft, setDraft] = useState<Draft | null>(() => draftFromView(view, initial));
  const [status, setStatus] = useState("");
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [pen, setPen] = useState<DrawMode>("corner");
  const [circleAt, setCircleAt] = useState<LngLat | null>(null);
  const [ringPast, setRingPast] = useState<LngLat[][]>([]);
  const [ringFuture, setRingFuture] = useState<LngLat[][]>([]);

  function clearFieldError(key: string) {
    setFieldErrors((current) => {
      if (!current[key]) return current;
      const next = { ...current };
      delete next[key];
      return next;
    });
  }

  function setDeskQuery(nextSection: Section, opts?: { id?: string; creating?: boolean }) {
    replaceDeskQuery(nextSection, opts);
  }

  function selectSection(id: Section) {
    setSection(id);
    setDraft(null);
    setFieldErrors({});
    setDeskQuery(id);
  }

  function closeDraft() {
    setDraft(null);
    setFieldErrors({});
    setDeskQuery(section);
  }

  function openDraft(next: Draft) {
    setSection(next.section);
    setDraft(next);
    setFieldErrors({});
    setDeskQuery(next.section, next.creating ? { creating: true } : { id: next.value.id });
  }

  useEffect(() => {
    setSection(view.section);
    if (view.mode === "list") {
      setDraft(null);
      return;
    }
    if (view.mode === "new") {
      setDraft((current) =>
        current?.creating && current.section === view.section ? current : blankDraft(view.section, atlas),
      );
      return;
    }
    setDraft((current) => {
      if (current && !current.creating && current.section === view.section && current.value.id === view.id) {
        return current;
      }
      return loadDraft(view.section, atlas, view.id);
    });
    // Sync UI when the URL view changes (sidebar, back/forward, deep links).
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [view.mode, view.section, view.mode === "edit" ? view.id : ""]);

  useEffect(() => {
    setRingPast([]);
    setRingFuture([]);
    setPen("corner");
    setCircleAt(null);
  }, [
    draft?.section,
    draft?.value.id,
    draft && draft.section === "projects" ? draft.value.areaId : "",
    draft && draft.section === "areas" ? draft.value.cityId : "",
  ]);

  async function persist(next: Atlas) {
    setStatus(t("saving"));
    try {
      const response = await fetch("/api/atlas", {
        method: "PUT",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(next),
      });
      if (!response.ok) {
        const body = (await response.json().catch(() => ({}))) as {
          error?: string;
          message?: string;
        };
        setStatus(body.message?.trim() || t("error"));
        return;
      }
      setAtlas((await response.json()) as Atlas);
      setDraft(null);
      setFieldErrors({});
      setDeskQuery(section);
      setStatus(t("saved"));
    } catch (cause) {
      setStatus(cause instanceof Error ? cause.message : t("error"));
    }
  }

  function saveDraft() {
    if (!draft) return;
    const errors = validateDraft(draft, atlas, t);
    setFieldErrors(errors);
    if (Object.keys(errors).length) {
      setStatus(t("formInvalid"));
      window.requestAnimationFrame(() => {
        document.querySelector<HTMLElement>("[data-field-error='true']")?.scrollIntoView({
          behavior: "smooth",
          block: "center",
        });
      });
      return;
    }
    const id = slugify(draft.value.id);
    const value = { ...draft.value, id } as Draft["value"];
    const next = applyDraft(atlas, draft.section, value, draft.creating);
    void persist(next);
  }

  async function remove(id: string) {
    const ok = await confirm({
      title: t("deleteConfirmTitle"),
      description: t("deleteConfirm"),
      confirmLabel: t("deleteConfirmAction"),
      tone: "danger",
    });
    if (!ok) return;
    if (section === "cities" && atlas.areas.some((area) => area.cityId === id)) {
      setStatus(t("blocked"));
      return;
    }
    if (section === "areas" && atlas.projects.some((project) => project.areaId === id)) {
      setStatus(t("blocked"));
      return;
    }
    if (section === "developers" && atlas.projects.some((project) => project.developerId === id)) {
      setStatus(t("blocked"));
      return;
    }
    const next = deleteRecord(atlas, section, id);
    void persist(next);
  }

  const map = useMemo(() => sketchFor(draft, atlas), [atlas, draft]);
  const drawingBoundary =
    !!draft &&
    (draft.section === "areas" || (draft.section === "projects" && draft.place === "ring"));

  function setProjectPlace(place: "point" | "ring") {
    if (!draft || draft.section !== "projects") return;
    if (draft.place === place) return;
    setRingPast([]);
    setRingFuture([]);
    setCircleAt(null);
    setPen("corner");
    setDraft({ ...draft, place });
  }

  function applyRing(next: LngLat[]) {
    setDraft((current) => {
      if (!current) return current;
      if (current.section === "areas") {
        return {
          ...current,
          value: {
            ...current.value,
            ring: next,
            center: next.length >= 3 ? centroid(closeRing(next)) : current.value.center,
          },
        };
      }
      if (current.section === "projects" && current.place === "ring") {
        return { ...current, value: { ...current.value, ring: next } };
      }
      return current;
    });
  }

  function commitRing(next: LngLat[]) {
    if (!draft) return;
    if (!(draft.section === "areas" || (draft.section === "projects" && draft.place === "ring"))) return;
    const previous = draft.value.ring;
    if (ringsEqual(previous, next)) return;
    setRingPast((stack) => [...stack.slice(-39), cloneRing(previous)]);
    setRingFuture([]);
    clearFieldError("ring");
    applyRing(next);
  }

  function undoRing() {
    if (!draft) return;
    if (!(draft.section === "areas" || (draft.section === "projects" && draft.place === "ring"))) return;
    if (!ringPast.length) return;
    const previous = ringPast[ringPast.length - 1];
    setRingPast(ringPast.slice(0, -1));
    setRingFuture([cloneRing(draft.value.ring), ...ringFuture].slice(0, 40));
    applyRing(cloneRing(previous));
  }

  function redoRing() {
    if (!draft) return;
    if (!(draft.section === "areas" || (draft.section === "projects" && draft.place === "ring"))) return;
    if (!ringFuture.length) return;
    const next = ringFuture[0];
    setRingFuture(ringFuture.slice(1));
    setRingPast([...ringPast, cloneRing(draft.value.ring)].slice(-40));
    applyRing(cloneRing(next));
  }

  function patchRing(next: LngLat[]) {
    commitRing(next);
  }

  function onVertexMove(index: number, lng: number, lat: number) {
    if (!draft) return;
    if (!(draft.section === "areas" || (draft.section === "projects" && draft.place === "ring"))) return;
    const wasClosed = isClosed(draft.value.ring);
    const open = openRing(draft.value.ring);
    if (!open[index]) return;
    open[index] = [lng, lat];
    commitRing(wasClosed ? closeRing(open) : open);
  }

  function onEdgeInsert(afterIndex: number, lng: number, lat: number) {
    if (!draft) return;
    if (!(draft.section === "areas" || (draft.section === "projects" && draft.place === "ring"))) return;
    const wasClosed = isClosed(draft.value.ring);
    const open = openRing(draft.value.ring);
    if (afterIndex < 0 || afterIndex >= open.length) return;
    const before = open[afterIndex];
    const after = open[(afterIndex + 1) % open.length];
    // Ignore near-zero inserts that create spikes next to an existing corner.
    if (before && Math.hypot(lng - before[0], lat - before[1]) < 0.00005) return;
    if (after && Math.hypot(lng - after[0], lat - after[1]) < 0.00005) return;
    open.splice(afterIndex + 1, 0, [lng, lat]);
    commitRing(wasClosed ? closeRing(open) : open);
  }

  function onVertexRemove(index: number) {
    if (!draft) return;
    if (!(draft.section === "areas" || (draft.section === "projects" && draft.place === "ring"))) return;
    const wasClosed = isClosed(draft.value.ring);
    const open = openRing(draft.value.ring);
    if (open.length <= 3 || !open[index]) return;
    open.splice(index, 1);
    commitRing(wasClosed && open.length >= 3 ? closeRing(open) : open);
  }

  function onPointMove(lng: number, lat: number) {
    if (!draft) return;
    const next: LngLat = [lng, lat];
    if (draft.section === "cities") setDraft({ ...draft, value: { ...draft.value, center: next } });
    if (draft.section === "projects" && draft.place === "point") {
      setDraft({ ...draft, value: { ...draft.value, point: next } });
    }
  }

  function writeRing(ring: LngLat[]) {
    commitRing(ring);
  }

  function onStroke(points: LngLat[]) {
    let simple = simplify(points, 0.00035);
    if (simple.length < 3) simple = simplify(points, 0.00012);
    if (simple.length < 3) {
      simple = points.filter(
        (_, index) => index % Math.ceil(points.length / 24) === 0 || index === points.length - 1,
      );
    }
    if (simple.length < 3) return;
    commitRing(closeRing(simple));
    setPen("corner");
    setCircleAt(null);
  }

  function closeCurrentRing() {
    if (!draft) return;
    if (!(draft.section === "areas" || (draft.section === "projects" && draft.place === "ring"))) return;
    const open = openRing(draft.value.ring);
    if (open.length < 3) return;
    commitRing(closeRing(open));
  }

  function onMapClick(lng: number, lat: number) {
    if (!draft) return;
    const next: LngLat = [lng, lat];
    if (draft.section === "cities") {
      setDraft({ ...draft, value: { ...draft.value, center: next } });
      return;
    }
    const drawing =
      draft.section === "areas" || (draft.section === "projects" && draft.place === "ring");
    if (draft.section === "projects" && draft.place === "point") {
      setDraft({ ...draft, value: { ...draft.value, point: next } });
      return;
    }
    if (!drawing) return;
    if (pen === "hand") return;

    const ring = draft.value.ring;

    if (pen === "round") {
      if (!circleAt) {
        setCircleAt(next);
        return;
      }
      const circle = circleRing(circleAt, next);
      setCircleAt(null);
      if (circle.length >= 4) {
        commitRing(circle);
        setPen("corner");
      }
      return;
    }

    if (isClosed(ring)) return;
    commitRing([...openRing(ring), next]);
  }

  function selectPen(mode: DrawMode) {
    setPen(mode);
    setCircleAt(null);
  }

  return (
    <div className="flex h-full min-h-0 bg-paper">
      {confirmDialog}
      <DeskSidebar
        desk="atlas"
        items={(
          [
            ["cities", t("cities")],
            ["areas", t("areas")],
            ["developers", t("developers")],
            ["projects", t("projects")],
            ["suggestions", t("suggestions")],
          ] as const
        ).map(([id, label]) => ({
          id,
          label,
          active: section === id,
          onSelect: () => selectSection(id),
        }))}
      />
      <div className="flex min-w-0 flex-1 flex-col">
        <div className="flex items-center justify-between gap-4 border-b border-ink/10 px-6 py-4">
          <p
            className={`max-w-2xl text-sm leading-7 ${
              status && status !== t("saved") && status !== t("saving")
                ? "rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-red-800"
                : "text-ink/70"
            }`}
            role={status && status !== t("saved") && status !== t("saving") ? "alert" : undefined}
          >
            {status || t("lede")}
          </p>
          <button
            type="button"
            className="shrink-0 rounded-lg border border-[#c5d0c9] bg-white px-3 py-2 text-sm"
            onClick={() => {
              void confirm({
                title: t("resetConfirmTitle"),
                description: t("resetConfirm"),
                confirmLabel: t("resetConfirmAction"),
                tone: "danger",
              }).then((ok) => {
                if (ok) void persist(seedAtlas);
              });
            }}
          >
            {t("reset")}
          </button>
        </div>
        {draft ? (
          <form
            className={`min-h-0 flex-1 overflow-y-auto ${map ? "xl:grid xl:overflow-hidden xl:grid-cols-[minmax(20rem,32rem)_minmax(0,1fr)]" : ""}`}
            onSubmit={(event) => {
              event.preventDefault();
              saveDraft();
            }}
          >
            <div className="space-y-8 px-6 py-6 xl:min-h-0 xl:overflow-y-auto">
              {Object.keys(fieldErrors).length ? (
                <div
                  className="rounded-xl border border-red-200 bg-red-50 px-3 py-2.5 text-sm text-red-800"
                  role="alert"
                  data-field-error="true"
                >
                  {t("formInvalid")}
                </div>
              ) : null}
              <IdField
                draft={draft}
                atlas={atlas}
                error={fieldErrors.id}
                onChange={(id) => {
                  clearFieldError("id");
                  updateDraft(setDraft, { id });
                }}
              />
              {draft.section === "cities" ? (
                <CityFields
                  draft={draft}
                  errors={fieldErrors}
                  onChange={(next) => {
                    clearFieldError("nameEn");
                    setDraft(next);
                  }}
                />
              ) : null}
              {draft.section === "areas" ? (
                <AreaFields
                  atlas={atlas}
                  draft={draft}
                  errors={fieldErrors}
                  onChange={(next) => {
                    clearFieldError("nameEn");
                    clearFieldError("cityId");
                    setDraft(next);
                  }}
                />
              ) : null}
              {draft.section === "developers" ? (
                <DeveloperFields
                  draft={draft}
                  errors={fieldErrors}
                  onChange={(next) => {
                    clearFieldError("nameEn");
                    setDraft(next);
                  }}
                />
              ) : null}
              {draft.section === "projects" ? (
                <ProjectFields
                  atlas={atlas}
                  draft={draft}
                  errors={fieldErrors}
                  onChange={(next) => {
                    clearFieldError("nameEn");
                    clearFieldError("areaId");
                    clearFieldError("developerId");
                    setDraft(next);
                  }}
                />
              ) : null}
              {draft.section === "suggestions" ? (
                <SuggestionFields
                  atlas={atlas}
                  locale={locale}
                  draft={draft}
                  errors={fieldErrors}
                  onChange={(next) => {
                    clearFieldError("targetId");
                    setDraft(next);
                  }}
                />
              ) : null}
              <div className="flex gap-2 pt-2">
                <button type="submit" className="h-11 rounded-lg bg-palm-deep px-5 text-sm font-semibold text-[#e7f2ec]">
                  {t("save")}
                </button>
                <button type="button" onClick={closeDraft} className="h-11 rounded-lg border border-[#c5d0c9] bg-white px-5 text-sm">
                  {t("cancel")}
                </button>
              </div>
            </div>
            {map ? (
              <div className="flex min-h-[36rem] flex-col gap-3 border-s border-[#d5dfd8] bg-sand p-4 xl:min-h-0">
                {fieldErrors.ring ? (
                  <div className="rounded-xl border border-red-200 bg-red-50 px-3 py-2" data-field-error="true">
                    <FieldError message={fieldErrors.ring} />
                  </div>
                ) : null}
                <SketchMap
                  frameKey={
                    draft.section === "projects"
                      ? `projects-${draft.value.id}-${draft.value.areaId}-${draft.place}`
                      : draft.section === "areas"
                        ? `areas-${draft.value.id}-${draft.value.cityId}`
                        : `${draft.section}-${draft.value.id}`
                  }
                  center={map.center}
                  zoom={map.zoom}
                  ring={map.ring}
                  guideRing={map.guideRing}
                  guideColor={map.guideColor}
                  point={pen === "round" && circleAt ? circleAt : map.point}
                  editRing={drawingBoundary}
                  mode={
                    drawingBoundary
                      ? pen === "hand"
                        ? "hand"
                        : pen === "round"
                          ? "round"
                          : "corner"
                      : "corner"
                  }
                  coach={
                    draft.section === "projects" && draft.place === "point"
                      ? t("coachPointPlace")
                      : pen === "hand"
                        ? t("coachHand")
                        : pen === "round"
                          ? circleAt
                            ? t("coachCircleRadius")
                            : t("coachCircleCenter")
                          : isClosed(map.ring)
                            ? t("coachPointsClosed")
                            : openRing(map.ring).length >= 3
                              ? t("coachPointsClose")
                              : t("coachPointsDraw")
                  }
                  coachStep={
                    draft.section === "projects" && draft.place === "point"
                      ? t("coachPointPlaceStep")
                      : pen === "hand"
                        ? t("coachHandStep")
                        : pen === "round"
                          ? circleAt
                            ? t("coachCircleRadiusStep")
                            : t("coachCircleCenterStep")
                          : isClosed(map.ring)
                            ? t("coachPointsClosedStep")
                            : openRing(map.ring).length >= 3
                              ? t("closeReadyHint")
                              : t("coachPointsDrawStep")
                  }
                  idleHint={t("handIdleHint")}
                  drawingHint={t("handDrawingHint")}
                  onClick={onMapClick}
                  onCloseNearStart={closeCurrentRing}
                  onVertexMove={onVertexMove}
                  onEdgeInsert={onEdgeInsert}
                  onVertexRemove={onVertexRemove}
                  onPointMove={onPointMove}
                  onStroke={onStroke}
                />
                {draft.section === "projects" && openRing(map.guideRing).length >= 2 ? (
                  <p className="text-xs text-mist">{t("areaGuideHint")}</p>
                ) : null}
                <div className="grid gap-2">
                  {draft.section === "projects" ? (
                    <div className="inline-flex flex-wrap gap-1 rounded-xl border border-[#d5dfd8] bg-white p-1">
                      <HintLabel hint={t("clickToPlaceHint")}>
                        <button
                          type="button"
                          className={`rounded-lg px-3 py-2 text-sm ${draft.place === "point" ? "bg-palm-deep text-white" : "text-ink hover:bg-sand"}`}
                          onClick={() => setProjectPlace("point")}
                        >
                          {t("clickToPlace")}
                        </button>
                      </HintLabel>
                      <HintLabel hint={t("clickToDrawHint")}>
                        <button
                          type="button"
                          className={`rounded-lg px-3 py-2 text-sm ${draft.place === "ring" ? "bg-palm-deep text-white" : "text-ink hover:bg-sand"}`}
                          onClick={() => setProjectPlace("ring")}
                        >
                          {t("clickToDraw")}
                        </button>
                      </HintLabel>
                    </div>
                  ) : null}
                  {drawingBoundary ? (
                    <>
                      {draft.section === "areas" ? (
                        <div className="inline-flex flex-wrap gap-1 rounded-xl border border-[#d5dfd8] bg-white p-1">
                          {(
                            [
                              ["corner", "modeCorner"],
                              ["hand", "modeHand"],
                              ["round", "modeRound"],
                            ] as const
                          ).map(([mode, label]) => (
                            <button
                              key={mode}
                              type="button"
                              className={`rounded-lg px-3 py-2 text-sm ${pen === mode ? "bg-palm-deep text-white" : "text-ink hover:bg-sand"}`}
                              onClick={() => selectPen(mode)}
                            >
                              {t(label)}
                            </button>
                          ))}
                        </div>
                      ) : (
                        <p className="text-xs text-mist">{t("projectFootprintHint")}</p>
                      )}
                      <div className="flex flex-wrap gap-2">
                        <HintLabel hint={t("undoHint")}>
                          <button
                            type="button"
                            disabled={!ringPast.length}
                            className="rounded-lg border border-[#c5d0c9] bg-white px-3 py-2 text-sm disabled:opacity-40"
                            onClick={undoRing}
                          >
                            {t("undo")}
                          </button>
                        </HintLabel>
                        <HintLabel hint={t("redoHint")}>
                          <button
                            type="button"
                            disabled={!ringFuture.length}
                            className="rounded-lg border border-[#c5d0c9] bg-white px-3 py-2 text-sm disabled:opacity-40"
                            onClick={redoRing}
                          >
                            {t("redo")}
                          </button>
                        </HintLabel>
                        <HintLabel hint={t("undoPointHint")}>
                          <button
                            type="button"
                            className="rounded-lg border border-[#c5d0c9] bg-white px-3 py-2 text-sm"
                            onClick={() => {
                              const open = openRing(
                                draft.section === "areas" || draft.section === "projects" ? draft.value.ring : [],
                              );
                              if (!open.length) return;
                              patchRing(open.slice(0, -1));
                            }}
                          >
                            {t("undoPoint")}
                          </button>
                        </HintLabel>
                        <button
                          type="button"
                          className="rounded-lg border border-[#c5d0c9] bg-white px-3 py-2 text-sm"
                          onClick={() => patchRing([])}
                        >
                          {t("clearBoundary")}
                        </button>
                        {isClosed(map.ring) ? (
                          <HintLabel hint={t("reopenShapeHint")}>
                            <button
                              type="button"
                              className="rounded-lg border border-[#c5d0c9] bg-white px-3 py-2 text-sm"
                              onClick={() => patchRing(openRing(map.ring))}
                            >
                              {t("reopenShape")}
                            </button>
                          </HintLabel>
                        ) : (
                          <HintLabel hint={t("closeShapeHint")}>
                            <button
                              type="button"
                              className="rounded-lg bg-palm px-3 py-2 text-sm text-white"
                              onClick={() => {
                                if (openRing(map.ring).length < 3) return;
                                patchRing(closeRing(map.ring));
                              }}
                            >
                              {t("closeShape")}
                            </button>
                          </HintLabel>
                        )}
                        {draft.section === "areas" ? (
                          <HintLabel hint={t("softenHint")}>
                            <button
                              type="button"
                              className="rounded-lg border border-[#c5d0c9] bg-white px-3 py-2 text-sm"
                              onClick={() => {
                                if (openRing(map.ring).length < 3) return;
                                patchRing(roundRing(map.ring));
                              }}
                            >
                              {t("soften")}
                            </button>
                          </HintLabel>
                        ) : null}
                      </div>
                    </>
                  ) : null}
                </div>
              </div>
            ) : null}
          </form>
        ) : (
          <div className="min-h-0 flex-1 overflow-y-auto px-6 py-6">
            <RecordList
              key={section}
              atlas={atlas}
              section={section}
              locale={locale}
              onAdd={() => openDraft(blankDraft(section, atlas))}
              onEdit={(id) => {
                const next = loadDraft(section, atlas, id);
                if (next) openDraft(next);
              }}
              onDelete={remove}
            />
          </div>
        )}
      </div>
    </div>
  );
}

type DeskRow = { id: string; label: string; hint: string; updatedAt: number };

function RecordList({
  atlas,
  section,
  locale,
  onAdd,
  onEdit,
  onDelete,
}: {
  atlas: Atlas;
  section: Section;
  locale: string;
  onAdd: () => void;
  onEdit: (id: string) => void;
  onDelete: (id: string) => void;
}) {
  const t = useTranslations("admin");
  const rows = useMemo(() => rowsFor(atlas, section, locale), [atlas, section, locale]);

  const columns = useMemo<ColumnDef<DeskRow>[]>(
    () => [
      {
        accessorKey: "label",
        header: ({ column }) => <DataTableColumnHeader column={column} title={t("name")} />,
        cell: ({ row }) => (
          <button type="button" className="min-w-0 text-start" onClick={() => onEdit(row.original.id)}>
            <span className="block truncate font-medium">{row.original.label}</span>
          </button>
        ),
      },
      {
        accessorKey: "hint",
        header: ({ column }) => <DataTableColumnHeader column={column} title={t("hint")} />,
        cell: ({ row }) => <span className="text-muted-foreground">{row.original.hint}</span>,
      },
      {
        accessorKey: "updatedAt",
        header: ({ column }) => <DataTableColumnHeader column={column} title={t("recordedAt")} />,
        cell: ({ row }) => (
          <span className="whitespace-nowrap text-muted-foreground tabular-nums">
            {formatDeskDate(row.original.updatedAt, locale)}
          </span>
        ),
        sortingFn: (a, b) => (a.original.updatedAt || 0) - (b.original.updatedAt || 0),
      },
      {
        id: "actions",
        header: () => <span className="sr-only">{t("delete")}</span>,
        cell: ({ row }) => (
          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" size="sm" onClick={() => onEdit(row.original.id)}>
              {t("edit")}
            </Button>
            <Button type="button" variant="ghost" size="sm" onClick={() => onDelete(row.original.id)}>
              {t("delete")}
            </Button>
          </div>
        ),
        enableSorting: false,
        enableHiding: false,
      },
    ],
    [locale, onDelete, onEdit, t],
  );

  const filterFields = useMemo<DataTableFilterField<DeskRow>[]>(
    () => [{ label: t("name"), value: "label", placeholder: t("search") }],
    [t],
  );

  const { table } = useClientDataTable({
    data: rows,
    columns,
    filterFields,
    initialPageSize: 10,
    initialSorting: [{ id: "updatedAt", desc: true }],
  });

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <SectionHint title={t(section)} hint={t("listHint")} />
        <Button type="button" onClick={onAdd} className="bg-palm-deep text-[#e7f2ec] hover:bg-palm-deep/90">
          {t("add")}
        </Button>
      </div>
      <DataTable table={table}>
        <DataTableToolbar table={table} filterFields={filterFields} />
      </DataTable>
    </div>
  );
}

function DeveloperFields({
  draft,
  errors,
  onChange,
}: {
  draft: Extract<Draft, { section: "developers" }>;
  errors: Record<string, string>;
  onChange: (draft: Draft) => void;
}) {
  const t = useTranslations("admin");
  const developer = draft.value;
  return (
    <>
      <NameFields
        value={developer.names}
        error={errors.nameEn}
        onChange={(names) => onChange({ ...draft, value: { ...developer, names } })}
      />
      <AboutFields value={developer.about} onChange={(about) => onChange({ ...draft, value: { ...developer, about } })} />
      <Field label={t("delivered")} hint={t("deliveredHint")}>
        <input
          className={fieldClass}
          type="number"
          min={0}
          value={developer.delivered}
          onChange={(event) =>
            onChange({ ...draft, value: { ...developer, delivered: Math.max(0, Number(event.target.value) || 0) } })
          }
        />
      </Field>
      <Field label={t("image")} hint={t("imageHint")}>
        <ImagePickerField
          value={developer.image}
          onChange={(image) => onChange({ ...draft, value: { ...developer, image } })}
        />
      </Field>
    </>
  );
}

function CityFields({
  draft,
  errors,
  onChange,
}: {
  draft: Extract<Draft, { section: "cities" }>;
  errors: Record<string, string>;
  onChange: (draft: Draft) => void;
}) {
  const t = useTranslations("admin");
  const city = draft.value;
  return (
    <>
      <Field label={t("country")} hint={t("countryHint")}>
        <Select
          value={city.country}
          onChange={(value) => onChange({ ...draft, value: { ...city, country: value === "om" ? "om" : "ae" } })}
          options={[
            { value: "ae", label: t("emirates") },
            { value: "om", label: t("oman") },
          ]}
        />
      </Field>
      <div className="grid grid-cols-3 gap-2">
        <Field label={t("lng")} hint={t("lngHint")}>
          <input className={fieldClass} value={city.center[0]} onChange={(event) => onChange({ ...draft, value: { ...city, center: [Number(event.target.value), city.center[1]] } })} />
        </Field>
        <Field label={t("lat")} hint={t("latHint")}>
          <input className={fieldClass} value={city.center[1]} onChange={(event) => onChange({ ...draft, value: { ...city, center: [city.center[0], Number(event.target.value)] } })} />
        </Field>
        <Field label={t("zoom")} hint={t("zoomHint")}>
          <input className={fieldClass} value={city.zoom} onChange={(event) => onChange({ ...draft, value: { ...city, zoom: Number(event.target.value) } })} />
        </Field>
      </div>
      <NameFields
        value={city.names}
        error={errors.nameEn}
        onChange={(names) => onChange({ ...draft, value: { ...city, names } })}
      />
      <p className="inline-flex items-center gap-1.5 text-xs text-mist">
        {t("clickToPlace")}
        <HelpIcon hint={t("clickToPlaceHint")} />
      </p>
    </>
  );
}

function AreaFields({
  atlas,
  draft,
  errors,
  onChange,
}: {
  atlas: Atlas;
  draft: Extract<Draft, { section: "areas" }>;
  errors: Record<string, string>;
  onChange: (draft: Draft) => void;
}) {
  const t = useTranslations("admin");
  const locale = useLocale();
  const area = draft.value;

  function selectCity(cityId: string) {
    if (cityId === area.cityId) return;
    const city = atlas.cities.find((item) => item.id === cityId);
    onChange({
      ...draft,
      value: {
        ...area,
        cityId,
        // Keep an existing boundary; only re-home the center when the shape is empty.
        center: openRing(area.ring).length >= 3 ? area.center : (city?.center ?? area.center),
      },
    });
  }

  return (
    <>
      <Field label={t("city")} hint={t("cityHint")} error={errors.cityId}>
        <Select
          value={area.cityId}
          invalid={Boolean(errors.cityId)}
          onChange={selectCity}
          options={atlas.cities.map((city) => ({ value: city.id, label: pick(city.names, locale) }))}
        />
      </Field>
      <Field label={t("color")} hint={t("colorHint")}>
        <ColorField value={area.color} onChange={(value) => onChange({ ...draft, value: { ...area, color: value } })} />
      </Field>
      <Field label={t("image")} hint={t("imageHint")}>
        <ImagePickerField
          value={area.image}
          onChange={(image) => onChange({ ...draft, value: { ...area, image } })}
        />
      </Field>
      <NameFields
        value={area.names}
        error={errors.nameEn}
        onChange={(names) => onChange({ ...draft, value: { ...area, names } })}
      />
      <AboutFields value={area.about} onChange={(about) => onChange({ ...draft, value: { ...area, about } })} />
      <p className="inline-flex items-center gap-1.5 text-xs text-mist">
        {t("clickToDraw")}
        <HelpIcon hint={t("clickToDrawHint")} />
      </p>
    </>
  );
}

function ProjectFields({
  atlas,
  draft,
  errors,
  onChange,
}: {
  atlas: Atlas;
  draft: Extract<Draft, { section: "projects" }>;
  errors: Record<string, string>;
  onChange: (draft: Draft) => void;
}) {
  const t = useTranslations("admin");
  const locale = useLocale();
  const project = draft.value;
  const total = project.payment.reduce((sum, step) => sum + step.percent, 0);
  const selectedArea = atlas.areas.find((item) => item.id === project.areaId);
  const selectedCity = atlas.cities.find((item) => item.id === selectedArea?.cityId);
  const phoneDefaultIso2 = selectedCity?.country === "om" ? "OM" : "AE";

  function selectArea(areaId: string) {
    if (areaId === project.areaId) return;
    const area = atlas.areas.find((item) => item.id === areaId);
    const city = atlas.cities.find((item) => item.id === area?.cityId);
    onChange({
      ...draft,
      place: "point",
      value: {
        ...project,
        areaId,
        point: area?.center ?? project.point,
        // Footprint belonged to the previous neighbourhood — start fresh in the new one.
        ring: [],
        currency: currencyOf(city?.country ?? "ae"),
      },
    });
  }

  return (
    <>
      <div className="grid gap-2 sm:grid-cols-2">
        <Field label={t("area")} hint={t("areaHint")} error={errors.areaId}>
          <Select
            value={project.areaId}
            invalid={Boolean(errors.areaId)}
            onChange={selectArea}
            options={atlas.areas.map((area) => {
              const city = atlas.cities.find((item) => item.id === area.cityId);
              const areaLabel = pick(area.names, locale);
              const cityLabel = city ? pick(city.names, locale) : "";
              return {
                value: area.id,
                label: cityLabel ? `${areaLabel} · ${cityLabel}` : areaLabel,
              };
            })}
          />
        </Field>
        <Field label={t("developer")} hint={t("developerHint")} error={errors.developerId}>
          <Select
            value={project.developerId}
            invalid={Boolean(errors.developerId)}
            onChange={(value) => onChange({ ...draft, value: { ...project, developerId: value } })}
            options={atlas.developers.map((developer) => ({
              value: developer.id,
              label: pick(developer.names, locale),
            }))}
          />
        </Field>
      </div>
      <div className="grid gap-2 sm:grid-cols-3">
        <Field label={t("kind")} hint={t("kindHint")}>
          <Select
            value={project.kind}
            onChange={(value) => onChange({ ...draft, value: { ...project, kind: value as Kind } })}
            options={[
              { value: "apartment", label: t("apartment") },
              { value: "villa", label: t("villa") },
              { value: "townhouse", label: t("townhouse") },
            ]}
          />
        </Field>
        <Field label={t("handover")} hint={t("handoverHint")}>
          <input className={fieldClass} value={project.handover} onChange={(event) => onChange({ ...draft, value: { ...project, handover: event.target.value } })} />
        </Field>
        <Field label={t("unitCount")} hint={t("unitCountHint")}>
          <input className={fieldClass} value={project.unitCount} onChange={(event) => onChange({ ...draft, value: { ...project, unitCount: Number(event.target.value) } })} />
        </Field>
      </div>
      <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
        <Field label={t("currency")} hint={t("currencyHint")}>
          <Select
            value={project.currency}
            onChange={(value) =>
              onChange({ ...draft, value: { ...project, currency: value as Currency } })
            }
            options={CURRENCIES.map((code) => ({
              value: code,
              label: t(`currency${code}` as "currencyAED" | "currencyOMR" | "currencyUSD"),
            }))}
          />
        </Field>
        <Field label={t("startPrice")} hint={t("startPriceHint")}>
          <input className={fieldClass} value={project.startPrice} onChange={(event) => onChange({ ...draft, value: { ...project, startPrice: Number(event.target.value) } })} />
        </Field>
        <Field label={t("sizeMin")} hint={t("sizeMinHint")}>
          <input className={fieldClass} value={project.sizeMin} onChange={(event) => onChange({ ...draft, value: { ...project, sizeMin: Number(event.target.value) } })} />
        </Field>
        <Field label={t("sizeMax")} hint={t("sizeMaxHint")}>
          <input className={fieldClass} value={project.sizeMax} onChange={(event) => onChange({ ...draft, value: { ...project, sizeMax: Number(event.target.value) } })} />
        </Field>
      </div>
      <Field label={t("image")} hint={t("imageHint")}>
        <ImagePickerField
          value={project.image}
          onChange={(image) => onChange({ ...draft, value: { ...project, image } })}
        />
      </Field>
      <div className="grid gap-3 sm:grid-cols-2">
        <Field label={t("whatsapp")} hint={t("whatsappHint")}>
          <CountryPhoneInput
            value={project.whatsapp}
            defaultCountryIso2={phoneDefaultIso2}
            onChange={(whatsapp) => onChange({ ...draft, value: { ...project, whatsapp } })}
          />
        </Field>
        <Field label={t("phone")} hint={t("phoneHint")}>
          <CountryPhoneInput
            value={project.phone}
            defaultCountryIso2={phoneDefaultIso2}
            onChange={(phone) => onChange({ ...draft, value: { ...project, phone } })}
          />
        </Field>
      </div>
      <NameFields
        value={project.names}
        error={errors.nameEn}
        onChange={(names) => onChange({ ...draft, value: { ...project, names } })}
      />
      <AboutFields value={project.about} onChange={(about) => onChange({ ...draft, value: { ...project, about } })} />
      <section className="space-y-3">
        <div className="flex items-center justify-between gap-2">
          <h3 className="inline-flex items-center gap-1.5 text-sm font-semibold">
            {t("units")}
            <HintLabel hint={t("unitsHint")}>
              <span className="inline-grid size-4 cursor-help place-items-center rounded-full border border-[#c5d0c9] text-[10px] text-mist">
                ?
              </span>
            </HintLabel>
          </h3>
          <button
            type="button"
            className="text-xs text-palm"
            onClick={() =>
              onChange({
                ...draft,
                value: {
                  ...project,
                  units: [
                    ...project.units,
                    {
                      id: `u-${project.units.length + 1}`,
                      beds: "1",
                      priceFrom: project.startPrice,
                      sizeMin: 0,
                      sizeMax: 0,
                    },
                  ],
                },
              })
            }
          >
            {t("addUnit")}
          </button>
        </div>
        <div className="grid grid-cols-2 gap-2 text-xs font-medium text-mist sm:grid-cols-4">
          <HintLabel hint={t("unitBedsHint")}>
            <span className="cursor-help">{t("unitBeds")}</span>
          </HintLabel>
          <HintLabel hint={t("unitPriceFromHint")}>
            <span className="cursor-help">{t("unitPriceFrom")}</span>
          </HintLabel>
          <HintLabel hint={t("unitSizeMinHint")}>
            <span className="cursor-help">{t("unitSizeMin")}</span>
          </HintLabel>
          <HintLabel hint={t("unitSizeMaxHint")}>
            <span className="cursor-help">{t("unitSizeMax")}</span>
          </HintLabel>
        </div>
        {project.units.map((unit, index) => (
          <div key={`${unit.id}-${index}`} className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            <Select
              value={unit.beds}
              onChange={(value) =>
                onChange({
                  ...draft,
                  value: { ...project, units: replace(project.units, index, { ...unit, beds: value as Beds }) },
                })
              }
              options={[
                { value: "studio", label: "Studio" },
                { value: "1", label: "1" },
                { value: "2", label: "2" },
                { value: "3", label: "3" },
                { value: "4", label: "4" },
              ]}
            />
            <input
              className={fieldClass}
              title={t("unitPriceFromHint")}
              value={unit.priceFrom}
              onChange={(event) =>
                onChange({
                  ...draft,
                  value: {
                    ...project,
                    units: replace(project.units, index, { ...unit, priceFrom: Number(event.target.value) }),
                  },
                })
              }
            />
            <input
              className={fieldClass}
              title={t("unitSizeMinHint")}
              value={unit.sizeMin}
              onChange={(event) =>
                onChange({
                  ...draft,
                  value: {
                    ...project,
                    units: replace(project.units, index, { ...unit, sizeMin: Number(event.target.value) }),
                  },
                })
              }
            />
            <input
              className={fieldClass}
              title={t("unitSizeMaxHint")}
              value={unit.sizeMax}
              onChange={(event) =>
                onChange({
                  ...draft,
                  value: {
                    ...project,
                    units: replace(project.units, index, { ...unit, sizeMax: Number(event.target.value) }),
                  },
                })
              }
            />
          </div>
        ))}
      </section>
      <section className="space-y-3">
        <div className="flex items-center justify-between gap-2">
          <h3 className="inline-flex items-center gap-1.5 text-sm font-semibold">
            <span className={Math.abs(total - 100) > 0.5 ? "text-red-700" : undefined}>
              {t("payment")} · {total}%
            </span>
            <HintLabel hint={t("paymentHint")}>
              <span className="inline-grid size-4 cursor-help place-items-center rounded-full border border-[#c5d0c9] text-[10px] text-mist">
                ?
              </span>
            </HintLabel>
          </h3>
          <button
            type="button"
            className="text-xs text-palm"
            onClick={() =>
              onChange({
                ...draft,
                value: { ...project, payment: [...project.payment, { percent: 0, label: blankText() }] },
              })
            }
          >
            {t("addStep")}
          </button>
        </div>
        {Math.abs(total - 100) > 0.5 ? <p className="text-xs text-red-700">{t("paymentTotalWarn")}</p> : null}
        <div className="grid grid-cols-2 gap-2 text-xs font-medium text-mist sm:grid-cols-[5rem_1fr_1fr_1fr]">
          <HintLabel hint={t("paymentPercentHint")}>
            <span className="cursor-help">{t("paymentPercent")}</span>
          </HintLabel>
          <HintLabel hint={t("paymentLabelHint")}>
            <span className="cursor-help">{t("paymentLabelEn")}</span>
          </HintLabel>
          <HintLabel hint={t("paymentLabelHint")}>
            <span className="cursor-help">{t("paymentLabelAr")}</span>
          </HintLabel>
          <HintLabel hint={t("paymentLabelHint")}>
            <span className="cursor-help">{t("paymentLabelFa")}</span>
          </HintLabel>
        </div>
        {project.payment.map((step, index) => (
          <div key={index} className="grid grid-cols-2 gap-2 sm:grid-cols-[5rem_1fr_1fr_1fr]">
            <input
              className={fieldClass}
              title={t("paymentPercentHint")}
              value={step.percent}
              onChange={(event) =>
                onChange({
                  ...draft,
                  value: {
                    ...project,
                    payment: replace(project.payment, index, { ...step, percent: Number(event.target.value) }),
                  },
                })
              }
            />
            <input
              className={fieldClass}
              title={t("paymentLabelHint")}
              value={step.label.en}
              onChange={(event) =>
                onChange({
                  ...draft,
                  value: {
                    ...project,
                    payment: replace(project.payment, index, {
                      ...step,
                      label: { ...step.label, en: event.target.value },
                    }),
                  },
                })
              }
            />
            <input
              className={fieldClass}
              title={t("paymentLabelHint")}
              value={step.label.ar}
              onChange={(event) =>
                onChange({
                  ...draft,
                  value: {
                    ...project,
                    payment: replace(project.payment, index, {
                      ...step,
                      label: { ...step.label, ar: event.target.value },
                    }),
                  },
                })
              }
            />
            <input
              className={fieldClass}
              title={t("paymentLabelHint")}
              value={step.label.fa}
              onChange={(event) =>
                onChange({
                  ...draft,
                  value: {
                    ...project,
                    payment: replace(project.payment, index, {
                      ...step,
                      label: { ...step.label, fa: event.target.value },
                    }),
                  },
                })
              }
            />
          </div>
        ))}
      </section>
      <p className="text-xs text-mist">{t("projectPlaceHint")}</p>
    </>
  );
}

function SuggestionFields({
  atlas,
  locale,
  draft,
  errors,
  onChange,
}: {
  atlas: Atlas;
  locale: string;
  draft: Extract<Draft, { section: "suggestions" }>;
  errors: Record<string, string>;
  onChange: (draft: Draft) => void;
}) {
  const t = useTranslations("admin");
  const suggestion = draft.value;
  const options =
    suggestion.kind === "city"
      ? atlas.cities.map((city) => ({ id: city.id, label: pick(city.names, locale) }))
      : suggestion.kind === "area"
        ? atlas.areas.map((area) => ({ id: area.id, label: pick(area.names, locale) }))
        : atlas.projects.map((project) => ({ id: project.id, label: pick(project.names, locale) }));
  return (
    <>
      <Field label={t("kind")} hint={t("kindHint")}>
        <Select
          value={suggestion.kind}
          onChange={(value) => {
            const kind = value as SuggestionKind;
            const targetId =
              kind === "city" ? atlas.cities[0]?.id ?? "" : kind === "area" ? atlas.areas[0]?.id ?? "" : atlas.projects[0]?.id ?? "";
            onChange({ ...draft, value: { ...suggestion, kind, targetId } });
          }}
          options={[
            { value: "city", label: t("kindCity") },
            { value: "area", label: t("kindArea") },
            { value: "project", label: t("kindProject") },
          ]}
        />
      </Field>
      <Field label={t("target")} hint={t("targetHint")} error={errors.targetId}>
        <Select
          value={suggestion.targetId}
          invalid={Boolean(errors.targetId)}
          onChange={(value) => onChange({ ...draft, value: { ...suggestion, targetId: value } })}
          options={options.map((option) => ({ value: option.id, label: option.label }))}
        />
      </Field>
      <Field label={t("order")} hint={t("orderHint")}>
        <input className={fieldClass} value={suggestion.order} onChange={(event) => onChange({ ...draft, value: { ...suggestion, order: Number(event.target.value) } })} />
      </Field>
    </>
  );
}

function nameSource(names: LocaleText) {
  return names.en.trim() || names.fa.trim() || names.ar.trim();
}

function IdField({
  draft,
  atlas,
  error,
  onChange,
}: {
  draft: Draft;
  atlas: Atlas;
  error?: string;
  onChange: (id: string) => void;
}) {
  const t = useTranslations("admin");
  const normalized = slugify(draft.value.id);
  const previous = draft.creating ? null : draft.value.id;
  const duplicate = Boolean(normalized) && idTaken(atlas, draft.section, normalized, previous);
  const showError = error || (duplicate ? t("duplicate") : !normalized && draft.creating && draft.value.id ? t("idInvalid") : "");
  const canMakeSlug =
    draft.creating &&
    (draft.section === "cities" ||
      draft.section === "areas" ||
      draft.section === "developers" ||
      draft.section === "projects");
  const names = canMakeSlug ? draft.value.names : null;

  function makeSlug() {
    if (!names) return;
    const source = nameSource(names);
    if (!source) {
      return;
    }
    onChange(
      uniqueSlug(source, (candidate) => idTaken(atlas, draft.section, candidate, null)),
    );
  }

  return (
    <Field label={t("id")} hint={t("idHint")} error={showError || undefined}>
      <div className="flex flex-wrap gap-2">
        <input
          className={fieldClass + " min-w-0 flex-1"}
          value={draft.value.id}
          disabled={!draft.creating}
          dir="ltr"
          spellCheck={false}
          aria-invalid={Boolean(showError) || undefined}
          onChange={(event) => onChange(event.target.value)}
          onBlur={() => {
            if (!draft.creating) return;
            if (normalized && normalized !== draft.value.id) onChange(normalized);
          }}
        />
        {canMakeSlug ? (
          <HintLabel hint={t("makeSlugHint")}>
            <button
              type="button"
              className="h-11 shrink-0 rounded-lg border border-[#c5d0c9] bg-white px-3 text-sm disabled:opacity-40"
              disabled={!nameSource(names!)}
              onClick={makeSlug}
            >
              {t("makeSlug")}
            </button>
          </HintLabel>
        ) : null}
      </div>
      {!showError && draft.creating && normalized && normalized !== draft.value.id ? (
        <p className="mt-1.5 text-xs text-mist" dir="ltr">
          {t("idPreview", { id: normalized })}
        </p>
      ) : null}
    </Field>
  );
}

function NameFields({
  value,
  error,
  onChange,
}: {
  value: LocaleText;
  error?: string;
  onChange: (value: LocaleText) => void;
}) {
  const t = useTranslations("admin");
  return (
    <div className="grid gap-2 sm:grid-cols-3">
      <Field label={t("nameEn")} hint={t("nameEnHint")} error={error}>
        <input className={fieldClass} value={value.en} onChange={(event) => onChange({ ...value, en: event.target.value })} />
      </Field>
      <Field label={t("nameAr")} hint={t("nameArHint")}>
        <input className={fieldClass} value={value.ar} onChange={(event) => onChange({ ...value, ar: event.target.value })} />
      </Field>
      <Field label={t("nameFa")} hint={t("nameFaHint")}>
        <input className={fieldClass} value={value.fa} onChange={(event) => onChange({ ...value, fa: event.target.value })} />
      </Field>
    </div>
  );
}

function AboutFields({ value, onChange }: { value: LocaleText; onChange: (value: LocaleText) => void }) {
  const t = useTranslations("admin");
  return (
    <div className="grid gap-6">
      <p className="inline-flex items-center gap-1.5 text-xs text-mist">
        {t("aboutHint")}
        <HintLabel hint={t("aboutHintDetail")}>
          <span className="inline-grid size-4 cursor-help place-items-center rounded-full border border-[#c5d0c9] text-[10px]">
            ?
          </span>
        </HintLabel>
      </p>
      {(
        [
          ["en", t("aboutEn")],
          ["ar", t("aboutAr")],
          ["fa", t("aboutFa")],
        ] as const
      ).map(([key, label]) => (
        <Field key={key} label={label} hint={t("aboutHintDetail")}>
          <RichTextEditor
            contentKey={`about-${key}`}
            content={value[key]}
            onChange={(html) => onChange({ ...value, [key]: html })}
            placeholder={label}
            rtl={key === "ar" || key === "fa"}
            height={280}
            contentTypography="blog"
            enabledFeatures={[
              "heading",
              "bold",
              "italic",
              "underline",
              "strike",
              "bulletList",
              "orderedList",
              "blockquote",
              "link",
              "textAlign",
              "undo",
              "redo",
              "clearFormatting",
            ]}
            imageConfig={{ enableLibrary: false, enableUpload: true }}
            linkConfig={{ openInNewTab: true }}
          />
        </Field>
      ))}
    </div>
  );
}

function Field({
  label,
  hint,
  error,
  children,
}: {
  label: string;
  hint?: string;
  error?: string;
  children: React.ReactNode;
}) {
  return (
    <div data-field-error={error ? "true" : undefined}>
      <FieldHint label={label} hint={hint} error={error}>
        {children}
      </FieldHint>
    </div>
  );
}

function validateDraft(
  draft: Draft,
  atlas: Atlas,
  t: (key: string) => string,
): Record<string, string> {
  const errors: Record<string, string> = {};
  const id = slugify(draft.value.id);
  if (!id) errors.id = t("idInvalid");
  else if (idTaken(atlas, draft.section, id, draft.creating ? null : draft.value.id)) {
    errors.id = t("duplicate");
  }

  if ("names" in draft.value && !draft.value.names.en.trim()) {
    errors.nameEn = t("needName");
  }

  if (draft.section === "areas") {
    if (!draft.value.cityId || !atlas.cities.some((city) => city.id === draft.value.cityId)) {
      errors.cityId = t("needCity");
    }
    if (draft.value.ring.length < 4 || !isClosed(draft.value.ring)) {
      errors.ring = t("needRing");
    }
  }

  if (draft.section === "projects") {
    if (!draft.value.areaId || !atlas.areas.some((area) => area.id === draft.value.areaId)) {
      errors.areaId = t("needArea");
    }
    if (!draft.value.developerId || !atlas.developers.some((item) => item.id === draft.value.developerId)) {
      errors.developerId = t("needDeveloper");
    }
  }

  if (draft.section === "suggestions" && !draft.value.targetId) {
    errors.targetId = t("needTarget");
  }

  return errors;
}

function replace<T>(list: T[], index: number, value: T) {
  return list.map((item, itemIndex) => (itemIndex === index ? value : item));
}

function isClosed(ring: LngLat[]) {
  return ring.length >= 4 && ring[0][0] === ring[ring.length - 1][0] && ring[0][1] === ring[ring.length - 1][1];
}

function cloneRing(ring: LngLat[]): LngLat[] {
  return ring.map((point) => [point[0], point[1]] as LngLat);
}

function ringsEqual(a: LngLat[], b: LngLat[]) {
  if (a.length !== b.length) return false;
  return a.every((point, index) => point[0] === b[index][0] && point[1] === b[index][1]);
}

function updateDraft(
  setDraft: Dispatch<SetStateAction<Draft | null>>,
  patch: { id?: string; names?: LocaleText },
) {
  setDraft((current) => {
    if (!current) return current;
    return { ...current, value: { ...current.value, ...patch } } as Draft;
  });
}

function idTaken(atlas: Atlas, section: Section, id: string, previous: string | null) {
  const ids =
    section === "cities"
      ? atlas.cities.map((item) => item.id)
      : section === "areas"
        ? atlas.areas.map((item) => item.id)
        : section === "developers"
          ? atlas.developers.map((item) => item.id)
          : section === "projects"
            ? atlas.projects.map((item) => item.id)
            : atlas.suggestions.map((item) => item.id);
  return ids.some((item) => item === id && item !== previous);
}

function applyDraft(atlas: Atlas, section: Section, value: Draft["value"], creating: boolean): Atlas {
  if (section === "cities") return put(atlas, "cities", value as City, creating);
  if (section === "areas") return put(atlas, "areas", value as Area, creating);
  if (section === "developers") return put(atlas, "developers", value as Developer, creating);
  if (section === "projects") {
    const project = value as Project;
    const priced = project.units.filter((unit) => unit.priceFrom > 0);
    const startPrice = priced.length ? Math.min(...priced.map((unit) => unit.priceFrom)) : project.startPrice;
    return put(atlas, "projects", { ...project, startPrice }, creating);
  }
  return put(atlas, "suggestions", value as Suggestion, creating);
}

function put<K extends "cities" | "areas" | "developers" | "projects" | "suggestions">(
  atlas: Atlas,
  key: K,
  value: Atlas[K][number],
  creating: boolean,
): Atlas {
  const list = atlas[key] as Atlas[K][number][];
  const maxExisting = list.reduce((max, item) => Math.max(max, item.updatedAt || 0), 0);
  // Always newer than every sibling so clock skew / bulk defaults cannot bury the row.
  const stamped = {
    ...value,
    updatedAt: Math.max(Date.now(), maxExisting + 1),
  } as Atlas[K][number];
  const next = creating
    ? [stamped, ...list]
    : [stamped, ...list.filter((item) => item.id !== stamped.id)];
  return { ...atlas, [key]: next };
}

function deleteRecord(atlas: Atlas, section: Section, id: string): Atlas {
  if (section === "cities") {
    return {
      ...atlas,
      cities: atlas.cities.filter((item) => item.id !== id),
      suggestions: atlas.suggestions.filter((item) => !(item.kind === "city" && item.targetId === id)),
    };
  }
  if (section === "areas") {
    return {
      ...atlas,
      areas: atlas.areas.filter((item) => item.id !== id),
      suggestions: atlas.suggestions.filter((item) => !(item.kind === "area" && item.targetId === id)),
    };
  }
  if (section === "developers") return { ...atlas, developers: atlas.developers.filter((item) => item.id !== id) };
  if (section === "projects") {
    return {
      ...atlas,
      projects: atlas.projects.filter((item) => item.id !== id),
      suggestions: atlas.suggestions.filter((item) => !(item.kind === "project" && item.targetId === id)),
    };
  }
  return { ...atlas, suggestions: atlas.suggestions.filter((item) => item.id !== id) };
}

function byUpdatedAtDesc<T extends { updatedAt?: number }>(a: T, b: T) {
  return (b.updatedAt || 0) - (a.updatedAt || 0);
}

function rowsFor(atlas: Atlas, section: Section, locale: string): DeskRow[] {
  if (section === "cities") {
    return [...atlas.cities].sort(byUpdatedAtDesc).map((city) => ({
      id: city.id,
      label: pick(city.names, locale) || city.id,
      hint: city.country === "om" ? "OMR" : "AED",
      updatedAt: city.updatedAt || 0,
    }));
  }
  if (section === "areas") {
    return [...atlas.areas].sort(byUpdatedAtDesc).map((area) => ({
      id: area.id,
      label: pick(area.names, locale) || area.id,
      hint: atlas.cities.find((city) => city.id === area.cityId)?.id ?? "",
      updatedAt: area.updatedAt || 0,
    }));
  }
  if (section === "developers") {
    return [...atlas.developers].sort(byUpdatedAtDesc).map((developer) => ({
      id: developer.id,
      label: pick(developer.names, locale) || developer.id,
      hint: String(developer.delivered),
      updatedAt: developer.updatedAt || 0,
    }));
  }
  if (section === "projects") {
    return [...atlas.projects].sort(byUpdatedAtDesc).map((project) => ({
      id: project.id,
      label: pick(project.names, locale) || project.id,
      hint: project.areaId,
      updatedAt: project.updatedAt || 0,
    }));
  }
  return [...atlas.suggestions].sort(byUpdatedAtDesc).map((item) => ({
    id: item.id,
    label: item.targetId,
    hint: item.kind,
    updatedAt: item.updatedAt || 0,
  }));
}

function blankDraft(section: Section, atlas: Atlas): Draft {
  const stamp = Date.now().toString(36);
  const updatedAt = 0;
  if (section === "cities") {
    return {
      section,
      creating: true,
      value: { id: `city-${stamp}`, country: "ae", center: [55.27, 25.2], zoom: 11, names: blankText(), updatedAt },
    };
  }
  if (section === "areas") {
    return {
      section,
      creating: true,
      value: {
        id: `area-${stamp}`,
        cityId: atlas.cities[0]?.id ?? "dubai",
        color: "#0f7a72",
        center: atlas.cities[0]?.center ?? [55.27, 25.2],
        ring: [],
        image: "",
        names: blankText(),
        about: blankText(),
        updatedAt,
      },
    };
  }
  if (section === "developers") {
    return {
      section,
      creating: true,
      value: {
        id: `developer-${stamp}`,
        names: blankText(),
        about: blankText(),
        delivered: 0,
        image: "",
        updatedAt,
      },
    };
  }
  if (section === "projects") {
    const area = atlas.areas[0];
    return {
      section,
      creating: true,
      place: "point",
      value: {
        id: `project-${stamp}`,
        areaId: area?.id ?? "",
        developerId: atlas.developers[0]?.id ?? "",
        kind: "apartment",
        handover: "2028",
        startPrice: 0,
        sizeMin: 0,
        sizeMax: 0,
        unitCount: 0,
        currency: currencyOf(
          atlas.cities.find((city) => city.id === area?.cityId)?.country ?? "ae",
        ),
        point: area?.center ?? [55.27, 25.2],
        ring: [],
        image: "",
        names: blankText(),
        about: blankText(),
        whatsapp: "",
        phone: "",
        units: [],
        payment: [
          { percent: 20, label: { en: "On booking", ar: "عند الحجز", fa: "پیش‌پرداخت" } },
          { percent: 55, label: { en: "During construction", ar: "أثناء الإنشاء", fa: "در حین ساخت" } },
          { percent: 25, label: { en: "On handover", ar: "عند التسليم", fa: "در زمان تحویل کلید" } },
        ],
        updatedAt,
      },
    };
  }
  return {
    section,
    creating: true,
    value: {
      id: `sug-${stamp}`,
      kind: "city",
      targetId: atlas.cities[0]?.id ?? "",
      order: atlas.suggestions.length + 1,
      updatedAt,
    },
  };
}

function loadDraft(section: Section, atlas: Atlas, id: string): Draft | null {
  if (section === "cities") {
    const value = atlas.cities.find((item) => item.id === id);
    return value ? { section, creating: false, value } : null;
  }
  if (section === "areas") {
    const value = atlas.areas.find((item) => item.id === id);
    return value ? { section, creating: false, value } : null;
  }
  if (section === "developers") {
    const value = atlas.developers.find((item) => item.id === id);
    return value ? { section, creating: false, value } : null;
  }
  if (section === "projects") {
    const value = atlas.projects.find((item) => item.id === id);
    if (!value) return null;
    const hasFootprint = openRing(value.ring).length >= 3 || isClosed(value.ring);
    return { section, creating: false, value, place: hasFootprint ? "ring" : "point" };
  }
  const value = atlas.suggestions.find((item) => item.id === id);
  return value ? { section, creating: false, value } : null;
}

function sketchFor(draft: Draft | null, atlas: Atlas) {
  if (!draft) return null;
  if (draft.section === "cities") {
    return {
      center: draft.value.center,
      zoom: draft.value.zoom,
      ring: [] as LngLat[],
      guideRing: [] as LngLat[],
      guideColor: "#6b7c74",
      point: draft.value.center,
    };
  }
  if (draft.section === "areas") {
    const city = atlas.cities.find((item) => item.id === draft.value.cityId) ?? atlas.cities[0];
    return {
      center: openRing(draft.value.ring).length >= 2 ? draft.value.center : (city?.center ?? draft.value.center),
      zoom: city?.zoom ?? 12,
      ring: draft.value.ring,
      guideRing: [] as LngLat[],
      guideColor: "#6b7c74",
      point: null as LngLat | null,
    };
  }
  if (draft.section === "projects") {
    const area = atlas.areas.find((item) => item.id === draft.value.areaId);
    const city = atlas.cities.find((item) => item.id === area?.cityId);
    const hasFootprint = openRing(draft.value.ring).length >= 2;
    return {
      center: hasFootprint ? draft.value.point : (area?.center ?? draft.value.point),
      zoom: Math.max(city?.zoom ?? 12, 13),
      ring: draft.value.ring,
      guideRing: area?.ring ?? [],
      guideColor: area?.color || "#6b7c74",
      point: draft.value.point,
    };
  }
  return null;
}
