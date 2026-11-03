"use client";

import { useTranslations } from "next-intl";
import { areaClass, controlClass } from "@/components/ui/controls";
import { HintLabel } from "@/components/admin/hint-label";
import {
  AMENITY_KEYS,
  HIGHLIGHT_KEYS,
  type Brochure,
  type LocaleText,
  type PaymentPlan,
} from "@/data/atlas";

const blank = (): LocaleText => ({ en: "", ar: "", fa: "" });

export function BrochureFields({
  brochure,
  onChange,
}: {
  brochure: Brochure;
  onChange: (brochure: Brochure) => void;
}) {
  const t = useTranslations("admin");
  const book = useTranslations("book");

  function texts(value: LocaleText, patch: (next: LocaleText) => void) {
    return (
      <div className="grid gap-2 sm:grid-cols-3">
        {(["en", "ar", "fa"] as const).map((lang) => (
          <input
            key={lang}
            className={controlClass}
            value={value[lang]}
            aria-label={lang}
            onChange={(event) => patch({ ...value, [lang]: event.target.value })}
          />
        ))}
      </div>
    );
  }

  return (
    <>
      <Field label={t("tagline")} hint={t("taglineHint")}>
        {texts(brochure.tagline, (tagline) => onChange({ ...brochure, tagline }))}
      </Field>
      <Field label={t("placeName")} hint={t("placeNameHint")}>
        {texts(brochure.place, (place) => onChange({ ...brochure, place }))}
      </Field>
      <div className="grid gap-2 sm:grid-cols-2">
        <Field label={t("structure")} hint={t("structureHint")}>
          <input
            className={controlClass}
            value={brochure.structure}
            onChange={(event) => onChange({ ...brochure, structure: event.target.value })}
          />
        </Field>
        <Field label={t("mapUrl")} hint={t("mapUrlHint")}>
          <input
            className={controlClass}
            value={brochure.mapUrl}
            onChange={(event) => onChange({ ...brochure, mapUrl: event.target.value })}
          />
        </Field>
      </div>

      <CheckGroup
        label={t("inclusions")}
        options={HIGHLIGHT_KEYS.map((key) => ({ key, label: book(`highlight.${key}`) }))}
        selected={brochure.highlights}
        onChange={(highlights) => onChange({ ...brochure, highlights })}
      />
      <CheckGroup
        label={t("amenities")}
        options={AMENITY_KEYS.map((key) => ({ key, label: book(`amenity.${key}`) }))}
        selected={brochure.amenities}
        onChange={(amenities) => onChange({ ...brochure, amenities })}
      />

      <section className="space-y-3">
        <div className="flex items-center justify-between gap-2">
          <h3 className="inline-flex items-center gap-1.5 text-sm font-semibold">
            {t("files")}
            <HintLabel hint={t("filesHint")}>
              <span className="inline-grid size-4 cursor-help place-items-center rounded-full border border-[#c5d0c9] text-[10px] text-mist">?</span>
            </HintLabel>
          </h3>
          <button
            type="button"
            className="text-xs text-palm"
            onClick={() =>
              onChange({
                ...brochure,
                files: [...brochure.files, { id: `file-${brochure.files.length + 1}`, name: "", url: "" }],
              })
            }
          >
            {t("addFile")}
          </button>
        </div>
        {brochure.files.map((file, index) => (
          <div key={`${file.id}-${index}`} className="grid gap-2 sm:grid-cols-[1fr_1.4fr_auto]">
            <input
              className={controlClass}
              placeholder={t("fileName")}
              value={file.name}
              onChange={(event) =>
                onChange({
                  ...brochure,
                  files: brochure.files.map((item, i) => (i === index ? { ...item, name: event.target.value } : item)),
                })
              }
            />
            <input
              className={controlClass}
              placeholder={t("fileUrl")}
              value={file.url}
              onChange={(event) =>
                onChange({
                  ...brochure,
                  files: brochure.files.map((item, i) => (i === index ? { ...item, url: event.target.value } : item)),
                })
              }
            />
            <button type="button" className="text-xs text-palm" onClick={() => onChange({ ...brochure, files: brochure.files.filter((_, i) => i !== index) })}>
              {t("remove")}
            </button>
          </div>
        ))}
      </section>

      <section className="space-y-4">
        <div className="flex items-center justify-between gap-2">
          <h3 className="inline-flex items-center gap-1.5 text-sm font-semibold">
            {t("namedPlans")}
            <HintLabel hint={t("namedPlansHint")}>
              <span className="inline-grid size-4 cursor-help place-items-center rounded-full border border-[#c5d0c9] text-[10px] text-mist">?</span>
            </HintLabel>
          </h3>
          <button
            type="button"
            className="text-xs text-palm"
            onClick={() =>
              onChange({
                ...brochure,
                plans: [
                  ...brochure.plans,
                  { id: `plan-${brochure.plans.length + 1}`, title: blank(), note: blank(), steps: [{ percent: 0, label: blank() }] },
                ],
              })
            }
          >
            {t("addPlan")}
          </button>
        </div>
        {brochure.plans.map((plan, index) => (
          <PlanEditor
            key={`${plan.id}-${index}`}
            plan={plan}
            onChange={(next) => onChange({ ...brochure, plans: brochure.plans.map((item, i) => (i === index ? next : item)) })}
            onRemove={() => onChange({ ...brochure, plans: brochure.plans.filter((_, i) => i !== index) })}
          />
        ))}
      </section>
    </>
  );
}

function PlanEditor({
  plan,
  onChange,
  onRemove,
}: {
  plan: PaymentPlan;
  onChange: (plan: PaymentPlan) => void;
  onRemove: () => void;
}) {
  const t = useTranslations("admin");
  const total = plan.steps.reduce((sum, step) => sum + step.percent, 0);
  return (
    <div className="space-y-2 border-t border-[#d5dfd8] pt-3">
      <div className="flex items-center justify-between gap-2">
        <p className={`text-xs font-medium ${Math.abs(total - 100) > 0.5 ? "text-red-700" : "text-mist"}`}>
          {t("planTitle")} · {total}%
        </p>
        <button type="button" className="text-xs text-palm" onClick={onRemove}>
          {t("remove")}
        </button>
      </div>
      <div className="grid gap-2 sm:grid-cols-3">
        {(["en", "ar", "fa"] as const).map((lang) => (
          <input
            key={lang}
            className={controlClass}
            value={plan.title[lang]}
            aria-label={`${t("planTitle")} ${lang}`}
            onChange={(event) => onChange({ ...plan, title: { ...plan.title, [lang]: event.target.value } })}
          />
        ))}
      </div>
      <textarea
        className={areaClass}
        value={plan.note.en}
        aria-label={`${t("planNote")} en`}
        onChange={(event) => onChange({ ...plan, note: { ...plan.note, en: event.target.value } })}
      />
      <textarea
        className={areaClass}
        value={plan.note.ar}
        aria-label={`${t("planNote")} ar`}
        onChange={(event) => onChange({ ...plan, note: { ...plan.note, ar: event.target.value } })}
      />
      <textarea
        className={areaClass}
        value={plan.note.fa}
        aria-label={`${t("planNote")} fa`}
        onChange={(event) => onChange({ ...plan, note: { ...plan.note, fa: event.target.value } })}
      />
      {plan.steps.map((step, index) => (
        <div key={index} className="grid grid-cols-2 gap-2 sm:grid-cols-[5rem_1fr_1fr_1fr]">
          <input
            className={controlClass}
            value={step.percent}
            onChange={(event) =>
              onChange({
                ...plan,
                steps: plan.steps.map((item, i) => (i === index ? { ...item, percent: Number(event.target.value) } : item)),
              })
            }
          />
          {(["en", "ar", "fa"] as const).map((lang) => (
            <input
              key={lang}
              className={controlClass}
              value={step.label[lang]}
              onChange={(event) =>
                onChange({
                  ...plan,
                  steps: plan.steps.map((item, i) =>
                    i === index ? { ...item, label: { ...item.label, [lang]: event.target.value } } : item,
                  ),
                })
              }
            />
          ))}
        </div>
      ))}
      <button
        type="button"
        className="text-xs text-palm"
        onClick={() => onChange({ ...plan, steps: [...plan.steps, { percent: 0, label: blank() }] })}
      >
        {t("addStep")}
      </button>
    </div>
  );
}

function CheckGroup<T extends string>({
  label,
  options,
  selected,
  onChange,
}: {
  label: string;
  options: { key: T; label: string }[];
  selected: readonly T[];
  onChange: (next: T[]) => void;
}) {
  return (
    <fieldset className="space-y-2">
      <legend className="text-sm font-medium text-ink">{label}</legend>
      <div className="grid gap-2 sm:grid-cols-2">
        {options.map((option) => {
          const on = selected.includes(option.key);
          return (
            <label key={option.key} className="flex items-center gap-2 text-sm text-ink">
              <input
                type="checkbox"
                className="size-4 accent-palm"
                checked={on}
                onChange={() =>
                  onChange(on ? selected.filter((key) => key !== option.key) : [...selected, option.key])
                }
              />
              {option.label}
            </label>
          );
        })}
      </div>
    </fieldset>
  );
}

function Field({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <label className="grid gap-2">
      <span className="inline-flex items-center gap-1.5 text-sm font-medium">
        {label}
        {hint ? (
          <HintLabel hint={hint}>
            <span className="inline-grid size-4 cursor-help place-items-center rounded-full border border-[#c5d0c9] text-[10px] text-mist">?</span>
          </HintLabel>
        ) : null}
      </span>
      {children}
    </label>
  );
}
