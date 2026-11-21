import { getCircleViewer } from "@/lib/circle/session";
import { listNotices, listPeople, listTags } from "@/lib/circle/store";

export async function circleChrome(locale: string) {
  const viewer = await getCircleViewer();
  const [people, notices, tags] = await Promise.all([
    listPeople(viewer?.id),
    viewer ? listNotices(viewer.id, locale) : Promise.resolve([]),
    listTags(viewer?.id),
  ]);
  return { viewer, people, notices, tags };
}
