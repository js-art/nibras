import { getTranslations } from "next-intl/server";
import { areas, developers, projects } from "@/data/catalogue";

export async function catalogueCopy(locale: string) {
  const areaCopy = await getTranslations({ locale, namespace: "areaCopy" });
  const projectCopy = await getTranslations({ locale, namespace: "projectCopy" });
  const developerCopy = await getTranslations({ locale, namespace: "developerCopy" });

  return {
    areaNames: Object.fromEntries(
      areas.map((area) => [area.id, areaCopy(`${area.id}.name`)]),
    ) as Record<string, string>,
    areaBodies: Object.fromEntries(
      areas.map((area) => [area.id, areaCopy(`${area.id}.body`)]),
    ) as Record<string, string>,
    projectNames: Object.fromEntries(
      projects.map((project) => [project.id, projectCopy(`${project.id}.name`)]),
    ) as Record<string, string>,
    projectBodies: Object.fromEntries(
      projects.map((project) => [project.id, projectCopy(`${project.id}.body`)]),
    ) as Record<string, string>,
    developerNames: Object.fromEntries(
      developers.map((developer) => [
        developer.id,
        developerCopy(`${developer.id}.name`),
      ]),
    ) as Record<string, string>,
    developerBodies: Object.fromEntries(
      developers.map((developer) => [
        developer.id,
        developerCopy(`${developer.id}.body`),
      ]),
    ) as Record<string, string>,
  };
}
