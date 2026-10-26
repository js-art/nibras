"use client";

import { useEffect, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { FieldError, FieldHint, HelpIcon, SectionHint } from "@/components/admin/hint-label";
import { DeskSidebar } from "@/components/admin/desk-sidebar";
import { ImagePickerField } from "@/components/admin/image-picker-field";
import { CountryPhoneInput } from "@/components/custom/inputs/country-phone-input";
import { controlClass } from "@/components/ui/controls";
import { useConfirmDialog } from "@/components/ui/confirm-dialog";
import { usePathname, useRouter } from "@/i18n/navigation";
import { type LocaleText } from "@/data/atlas";
import { seedSite, type SiteContent } from "@/data/site";

type SiteTab = "brand" | "contact" | "landing" | "seo";

const fieldClass = controlClass;

function LocaleFields({
  label,
  hint,
  value,
  error,
  onChange,
  multiline = false,
}: {
  label: string;
  hint?: string;
  value: LocaleText;
  error?: string;
  onChange: (value: LocaleText) => void;
  multiline?: boolean;
}) {
  const rows = (
    [
      ["en", "EN"],
      ["ar", "AR"],
      ["fa", "FA"],
    ] as const
  ).map(([key, tag]) => (
    <label key={key} className="grid gap-1">
      <span className="text-xs text-mist">
        {label} · {tag}
      </span>
      {multiline ? (
        <textarea
          className={`${fieldClass} min-h-24 py-3 ${error ? "border-red-500" : ""}`}
          value={value[key]}
          onChange={(event) => onChange({ ...value, [key]: event.target.value })}
        />
      ) : (
        <input
          className={`${fieldClass} ${error ? "border-red-500" : ""}`}
          value={value[key]}
          onChange={(event) => onChange({ ...value, [key]: event.target.value })}
        />
      )}
    </label>
  ));
  return (
    <div className="grid gap-3" data-field-error={error ? "true" : undefined}>
      {hint ? (
        <p className="inline-flex items-center gap-1.5 text-sm font-medium text-ink/80">
          {label}
          <HelpIcon hint={hint} />
        </p>
      ) : null}
      {rows}
      <FieldError message={error} />
    </div>
  );
}

type DeveloperOption = {
  id: string;
  names: LocaleText;
};

export function SiteDesk({
  initial,
  initialTab = "brand",
  developers,
}: {
  initial: SiteContent;
  initialTab?: SiteTab;
  developers: DeveloperOption[];
}) {
  const t = useTranslations("admin");
  const locale = useLocale() as keyof LocaleText;
  const router = useRouter();
  const pathname = usePathname();
  const { confirm, dialog: confirmDialog } = useConfirmDialog();
  const [site, setSite] = useState(initial);
  const [status, setStatus] = useState("");
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [tab, setTab] = useState<SiteTab>(initialTab);

  function selectTab(id: SiteTab) {
    setTab(id);
    setFieldErrors({});
    router.replace(`${pathname}?tab=${id}`, { scroll: false });
  }

  function clearFieldError(key: string) {
    setFieldErrors((current) => {
      if (!current[key]) return current;
      const next = { ...current };
      delete next[key];
      return next;
    });
  }

  useEffect(() => {
    selectTab(initialTab);
    // Normalize bare /desk/site to ?tab=.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function toggleFeaturedDeveloper(id: string) {
    const current = site.landing.featuredDeveloperIds;
    if (current.includes(id)) {
      setSite({
        ...site,
        landing: {
          ...site.landing,
          featuredDeveloperIds: current.filter((item) => item !== id),
        },
      });
      return;
    }
    if (current.length >= 4) return;
    setSite({
      ...site,
      landing: {
        ...site.landing,
        featuredDeveloperIds: [...current, id],
      },
    });
  }

  function moveFeaturedDeveloper(id: string, direction: -1 | 1) {
    const current = [...site.landing.featuredDeveloperIds];
    const index = current.indexOf(id);
    const next = index + direction;
    if (index < 0 || next < 0 || next >= current.length) return;
    [current[index], current[next]] = [current[next], current[index]];
    setSite({
      ...site,
      landing: { ...site.landing, featuredDeveloperIds: current },
    });
  }

  async function save() {
    const errors: Record<string, string> = {};
    const brandName = site.brand.name;
    if (!brandName.en.trim() && !brandName.ar.trim() && !brandName.fa.trim()) {
      errors.brandName = t("needBrandName");
    }
    const email = site.contact.email.trim();
    if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      errors.email = t("emailInvalid");
    }
    if (Object.keys(errors).length) {
      const nextTab = errors.brandName ? "brand" : errors.email ? "contact" : tab;
      setTab(nextTab);
      router.replace(`${pathname}?tab=${nextTab}`, { scroll: false });
      setFieldErrors(errors);
      setStatus(t("formInvalid"));
      window.requestAnimationFrame(() => {
        document.querySelector<HTMLElement>("[data-field-error='true']")?.scrollIntoView({
          behavior: "smooth",
          block: "center",
        });
      });
      return;
    }
    setFieldErrors({});
    setStatus(t("saving"));
    const response = await fetch("/api/site", {
      method: "PUT",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(site),
    });
    if (!response.ok) {
      setStatus(t("error"));
      return;
    }
    setSite((await response.json()) as SiteContent);
    setFieldErrors({});
    setStatus(t("saved"));
    router.refresh();
  }

  async function restore() {
    const ok = await confirm({
      title: t("siteResetConfirmTitle"),
      description: t("siteResetConfirm"),
      confirmLabel: t("siteResetConfirmAction"),
      tone: "danger",
    });
    if (!ok) return;
    setSite(seedSite);
  }

  return (
    <div className="flex h-full min-h-0 bg-paper">
      {confirmDialog}
      <DeskSidebar
        desk="site"
        brand={site.brand.name[locale] || site.brand.name.en || "Jolom"}
        items={(
          [
            ["brand", t("siteBrand")],
            ["contact", t("siteContact")],
            ["landing", t("siteLanding")],
            ["seo", t("siteSeo")],
          ] as const
        ).map(([id, label]) => ({
          id,
          label,
          active: tab === id,
          onSelect: () => selectTab(id),
        }))}
      />

      <div className="flex min-w-0 flex-1 flex-col">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-ink/10 px-6 py-4">
          <p className="text-sm text-mist">{status || t("siteLede")}</p>
          <div className="flex flex-wrap gap-2">
            <button type="button" onClick={restore} className="h-11 rounded-lg border border-[#c5d0c9] bg-white px-4 text-sm">
              {t("reset")}
            </button>
            <button type="button" onClick={() => void save()} className="h-11 rounded-lg bg-palm-deep px-5 text-sm font-semibold text-[#e7f2ec]">
              {t("save")}
            </button>
          </div>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto px-6 py-6">
          {tab === "brand" ? (
            <div className="mx-auto grid max-w-2xl gap-8">
              <LocaleFields
                label={t("brandName")}
                hint={t("brandNameHint")}
                value={site.brand.name}
                error={fieldErrors.brandName}
                onChange={(name) => {
                  clearFieldError("brandName");
                  setSite({ ...site, brand: { ...site.brand, name } });
                }}
              />
              <div className="grid gap-3">
                <Field label={t("brandLogo")} hint={t("brandLogoHelp")}>
                  <ImagePickerField
                    value={site.brand.logo}
                    placeholder={t("brandLogoHint")}
                    onChange={(logo) => setSite({ ...site, brand: { ...site.brand, logo } })}
                  />
                </Field>
                <div className="flex items-center gap-3 rounded-xl border border-[#d5dfd8] bg-palm-deep p-4 text-[#e7f2ec]">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  {site.brand.logo ? (
                    <img src={site.brand.logo} alt="" className="h-10 w-10 rounded-lg object-contain" />
                  ) : (
                    <span className="grid h-10 w-10 place-items-center rounded-lg bg-[#e7f2ec] text-xs text-palm-deep">
                      SVG
                    </span>
                  )}
                  <span className="text-lg font-semibold tracking-tight">
                    {site.brand.name[locale] || site.brand.name.en}
                  </span>
                </div>
                <p className="text-sm text-mist">{t("brandPreviewHint")}</p>
              </div>
            </div>
          ) : null}

          {tab === "contact" ? (
            <div className="mx-auto grid max-w-2xl gap-6">
              <Field label={t("phone")} hint={t("sitePhoneHint")}>
                <CountryPhoneInput
                  value={site.contact.phone}
                  defaultCountryIso2="AE"
                  onChange={(phone) => setSite({ ...site, contact: { ...site.contact, phone } })}
                />
              </Field>
              <Field label={t("whatsapp")} hint={t("siteWhatsappHint")}>
                <CountryPhoneInput
                  value={site.contact.whatsapp}
                  defaultCountryIso2="AE"
                  onChange={(whatsapp) => setSite({ ...site, contact: { ...site.contact, whatsapp } })}
                />
              </Field>
              <Field label={t("email")} hint={t("siteEmailHint")} error={fieldErrors.email}>
                <input
                  className={fieldClass}
                  value={site.contact.email}
                  onChange={(event) => {
                    clearFieldError("email");
                    setSite({ ...site, contact: { ...site.contact, email: event.target.value } });
                  }}
                />
              </Field>
              <Field label="Instagram" hint={t("socialHint")}>
                <input
                  className={fieldClass}
                  value={site.social.instagram}
                  onChange={(event) => setSite({ ...site, social: { ...site.social, instagram: event.target.value } })}
                />
              </Field>
              <Field label="LinkedIn" hint={t("socialHint")}>
                <input
                  className={fieldClass}
                  value={site.social.linkedin}
                  onChange={(event) => setSite({ ...site, social: { ...site.social, linkedin: event.target.value } })}
                />
              </Field>
              <Field label="X" hint={t("socialHint")}>
                <input
                  className={fieldClass}
                  value={site.social.x}
                  onChange={(event) => setSite({ ...site, social: { ...site.social, x: event.target.value } })}
                />
              </Field>
              <Field label="Telegram" hint={t("socialHint")}>
                <input
                  className={fieldClass}
                  value={site.social.telegram}
                  onChange={(event) => setSite({ ...site, social: { ...site.social, telegram: event.target.value } })}
                />
              </Field>
            </div>
          ) : null}

          {tab === "landing" ? (
            <div className="mx-auto grid max-w-3xl gap-8">
              <LocaleFields
                label={t("heroTitle")}
                hint={t("heroTitleHint")}
                value={site.landing.heroTitle}
                onChange={(heroTitle) => setSite({ ...site, landing: { ...site.landing, heroTitle } })}
              />
              <LocaleFields
                label={t("heroLede")}
                hint={t("heroLedeHint")}
                value={site.landing.heroLede}
                multiline
                onChange={(heroLede) => setSite({ ...site, landing: { ...site.landing, heroLede } })}
              />
              <LocaleFields
                label={t("projectsTitle")}
                hint={t("landingCopyHint")}
                value={site.landing.projectsTitle}
                onChange={(projectsTitle) => setSite({ ...site, landing: { ...site.landing, projectsTitle } })}
              />
              <LocaleFields
                label={t("projectsLede")}
                hint={t("landingCopyHint")}
                value={site.landing.projectsLede}
                multiline
                onChange={(projectsLede) => setSite({ ...site, landing: { ...site.landing, projectsLede } })}
              />
              <LocaleFields
                label={t("pathTitle")}
                hint={t("landingCopyHint")}
                value={site.landing.pathTitle}
                onChange={(pathTitle) => setSite({ ...site, landing: { ...site.landing, pathTitle } })}
              />
              <LocaleFields
                label={t("pathLede")}
                hint={t("landingCopyHint")}
                value={site.landing.pathLede}
                multiline
                onChange={(pathLede) => setSite({ ...site, landing: { ...site.landing, pathLede } })}
              />
              {site.landing.steps.map((step, index) => (
                <div key={index} className="grid gap-3 rounded-xl border border-[#d5dfd8] p-4">
                  <p className="text-sm font-medium text-palm-deep">
                    {t("step")} {index + 1}
                  </p>
                  <LocaleFields
                    label={t("stepTitle")}
                hint={t("landingCopyHint")}
                    value={step.title}
                    onChange={(title) => {
                      const steps = site.landing.steps.map((item, i) => (i === index ? { ...item, title } : item));
                      setSite({ ...site, landing: { ...site.landing, steps } });
                    }}
                  />
                  <LocaleFields
                    label={t("stepBody")}
                hint={t("landingCopyHint")}
                    value={step.body}
                    multiline
                    onChange={(body) => {
                      const steps = site.landing.steps.map((item, i) => (i === index ? { ...item, body } : item));
                      setSite({ ...site, landing: { ...site.landing, steps } });
                    }}
                  />
                </div>
              ))}
              <LocaleFields
                label={t("journalTitle")}
                hint={t("landingCopyHint")}
                value={site.landing.journalTitle}
                onChange={(journalTitle) => setSite({ ...site, landing: { ...site.landing, journalTitle } })}
              />
              {site.landing.journalItems.map((item, index) => (
                <div key={index} className="grid gap-3 rounded-xl border border-[#d5dfd8] p-4">
                  <p className="text-sm font-medium text-palm-deep">
                    {t("note")} {index + 1}
                  </p>
                  <LocaleFields
                    label={t("noteTitle")}
                hint={t("landingCopyHint")}
                    value={item.title}
                    onChange={(title) => {
                      const journalItems = site.landing.journalItems.map((row, i) =>
                        i === index ? { ...row, title } : row,
                      );
                      setSite({ ...site, landing: { ...site.landing, journalItems } });
                    }}
                  />
                  <LocaleFields
                    label={t("noteBody")}
                hint={t("landingCopyHint")}
                    value={item.excerpt}
                    multiline
                    onChange={(excerpt) => {
                      const journalItems = site.landing.journalItems.map((row, i) =>
                        i === index ? { ...row, excerpt } : row,
                      );
                      setSite({ ...site, landing: { ...site.landing, journalItems } });
                    }}
                  />
                </div>
              ))}
              <LocaleFields
                label={t("pocketTitle")}
                hint={t("landingCopyHint")}
                value={site.landing.pocketTitle}
                onChange={(pocketTitle) => setSite({ ...site, landing: { ...site.landing, pocketTitle } })}
              />
              <LocaleFields
                label={t("pocketLede")}
                hint={t("landingCopyHint")}
                value={site.landing.pocketLede}
                multiline
                onChange={(pocketLede) => setSite({ ...site, landing: { ...site.landing, pocketLede } })}
              />
              <div className="grid gap-3 rounded-xl border border-[#d5dfd8] p-4">
                <SectionHint title={t("featuredDevelopers")} hint={t("featuredDevelopersHint")} />
                {site.landing.featuredDeveloperIds.length ? (
                  <ol className="grid gap-2">
                    {site.landing.featuredDeveloperIds.map((id, index) => {
                      const developer = developers.find((item) => item.id === id);
                      if (!developer) return null;
                      return (
                        <li
                          key={id}
                          className="flex items-center justify-between gap-3 rounded-lg border border-[#e2ebe5] bg-white px-3 py-2"
                        >
                          <span className="text-sm text-ink">
                            {index + 1}. {developer.names[locale] || developer.names.en}
                          </span>
                          <span className="flex gap-1">
                            <button
                              type="button"
                              className="h-8 rounded-md border border-[#c5d0c9] px-2 text-xs"
                              onClick={() => moveFeaturedDeveloper(id, -1)}
                              disabled={index === 0}
                            >
                              {t("moveUp")}
                            </button>
                            <button
                              type="button"
                              className="h-8 rounded-md border border-[#c5d0c9] px-2 text-xs"
                              onClick={() => moveFeaturedDeveloper(id, 1)}
                              disabled={index === site.landing.featuredDeveloperIds.length - 1}
                            >
                              {t("moveDown")}
                            </button>
                          </span>
                        </li>
                      );
                    })}
                  </ol>
                ) : null}
                <ul className="grid gap-2 sm:grid-cols-2">
                  {developers.map((developer) => {
                    const checked = site.landing.featuredDeveloperIds.includes(developer.id);
                    const disabled = !checked && site.landing.featuredDeveloperIds.length >= 4;
                    return (
                      <li key={developer.id}>
                        <label
                          className={`flex cursor-pointer items-center gap-2 rounded-lg border px-3 py-2 text-sm ${
                            checked
                              ? "border-[#e4c27a] bg-[#e4c27a]/10 text-ink"
                              : disabled
                                ? "border-[#e2ebe5] text-mist opacity-60"
                                : "border-[#e2ebe5] bg-white text-ink"
                          }`}
                        >
                          <input
                            type="checkbox"
                            className="size-4 accent-palm-deep"
                            checked={checked}
                            disabled={disabled}
                            onChange={() => toggleFeaturedDeveloper(developer.id)}
                          />
                          <span>{developer.names[locale] || developer.names.en}</span>
                        </label>
                      </li>
                    );
                  })}
                </ul>
              </div>
            </div>
          ) : null}

          {tab === "seo" ? (
            <div className="mx-auto grid max-w-3xl gap-8">
              <LocaleFields
                label={t("siteName")}
                hint={t("seoSiteNameHint")}
                value={site.seo.siteName}
                onChange={(siteName) => setSite({ ...site, seo: { ...site.seo, siteName } })}
              />
              <LocaleFields
                label={t("defaultTitle")}
                hint={t("seoDefaultTitleHint")}
                value={site.seo.defaultTitle}
                onChange={(defaultTitle) => setSite({ ...site, seo: { ...site.seo, defaultTitle } })}
              />
              <LocaleFields
                label={t("defaultDescription")}
                hint={t("seoDefaultDescriptionHint")}
                value={site.seo.defaultDescription}
                multiline
                onChange={(defaultDescription) => setSite({ ...site, seo: { ...site.seo, defaultDescription } })}
              />
              {(
                [
                  ["home", t("seoHome")],
                  ["map", t("seoMap")],
                  ["areas", t("seoAreas")],
                  ["projects", t("seoProjects")],
                  ["developers", t("seoDevelopers")],
                ] as const
              ).map(([key, label]) => (
                <div key={key} className="grid gap-3 rounded-xl border border-[#d5dfd8] p-4">
                  <p className="text-sm font-medium text-palm-deep">{label}</p>
                  <LocaleFields
                    label={t("seoTitle")}
                hint={t("seoDefaultDescriptionHint")}
                    value={site.pages[key].title}
                    onChange={(title) =>
                      setSite({
                        ...site,
                        pages: { ...site.pages, [key]: { ...site.pages[key], title } },
                      })
                    }
                  />
                  <LocaleFields
                    label={t("seoDescription")}
                hint={t("seoDefaultDescriptionHint")}
                    value={site.pages[key].description}
                    multiline
                    onChange={(description) =>
                      setSite({
                        ...site,
                        pages: { ...site.pages, [key]: { ...site.pages[key], description } },
                      })
                    }
                  />
                </div>
              ))}
            </div>
          ) : null}
        </div>
      </div>
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
