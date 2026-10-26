import { connection } from "next/server";
import { getTranslations } from "next-intl/server";
import { ChromeGate } from "./chrome-gate";
import { MapFooterGate } from "./map-footer-gate";
import { AdminPaletteGate } from "./admin-palette";
import { SiteHeader } from "./site-header";
import { SiteFooter } from "./site-footer";
import { hasAdminSession } from "@/lib/admin-auth";
import { DESK_PATH } from "@/lib/desk";
import { readSite } from "@/lib/site-store";

export async function Shell({
  children,
  locale,
}: {
  children: React.ReactNode;
  locale: string;
}) {
  await connection();
  const t = await getTranslations({ locale, namespace: "nav" });
  const footer = await getTranslations({ locale, namespace: "footer" });
  const site = await readSite();
  const isAdmin = await hasAdminSession();
  const localeKey = (locale === "ar" || locale === "fa" ? locale : "en") as "en" | "ar" | "fa";
  const brandName = site.brand.name[localeKey] || site.brand.name.en || "Jolom";
  const brandLogo = site.brand.logo;

  const links = [
    ["/", t("explore")],
    ["/map", t("map")],
    ["/projects", t("projects")],
    ["/areas", t("areas")],
    ["/developers", t("developers")],
  ] as const;

  return (
    <>
      <ChromeGate>
        <SiteHeader
          links={links}
          brandName={brandName}
          brandLogo={brandLogo}
          deskHref={isAdmin ? DESK_PATH : undefined}
          deskLabel={t("desk")}
        />
      </ChromeGate>
      <main className="flex flex-1 flex-col">{children}</main>
      <MapFooterGate>
        <SiteFooter
          brandName={brandName}
          brandLogo={brandLogo}
          tagline={footer("tagline")}
          rights={footer("rights")}
          note={footer("note")}
          phone={site.contact.phone}
          email={site.contact.email}
          whatsapp={site.contact.whatsapp}
          social={site.social}
          contactLabel={footer("contact")}
          socialLabel={footer("social")}
        />
      </MapFooterGate>
      <AdminPaletteGate />
    </>
  );
}
