"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { areaClass } from "@/components/ui/controls";
import {
  GeoJSONSource,
  LngLatBounds,
  Map,
  Marker,
  NavigationControl,
  setWorkerUrl,
  type MapMouseEvent,
} from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import { Link, useRouter } from "@/i18n/navigation";
import { MapStylePicker } from "@/components/map/map-style-picker";
import {
  areas,
  areasGeoJson,
  money,
  projectsInArea,
  shortMillions,
  type AreaId,
} from "@/data/catalogue";
import { useMapStyle } from "@/lib/hooks/use-map-style";
import { mapStyleUrl } from "@/lib/map-style";

function lockMap(map: Map) {
  map.dragPan.disable();
  map.scrollZoom.disable();
  map.boxZoom.disable();
  map.dragRotate.disable();
  map.keyboard.disable();
  map.doubleClickZoom.disable();
  map.touchZoomRotate.disable();
  map.touchPitch.disable();
}

function fitAreas(map: Map) {
  const bounds = new LngLatBounds();
  for (const area of areas) {
    for (const point of area.ring) bounds.extend(point);
  }
  if (!bounds.isEmpty()) {
    map.fitBounds(bounds, { padding: 56, duration: 0, maxZoom: 10.6 });
  }
}

type Overrides = Partial<
  Record<AreaId, { color?: string; bodies?: Partial<Record<string, string>> }>
>;

const STORAGE_KEY = "nibras-area-overrides";

export function AreaMap({
  locale,
  names,
  bodies,
  projectNames,
  labels,
  initialArea,
  mode = "full",
}: {
  locale: string;
  names: Record<string, string>;
  bodies: Record<string, string>;
  projectNames: Record<string, string>;
  labels: {
    min: string;
    max: string;
    avg: string;
    count: string;
    edit: string;
    done: string;
    color: string;
    story: string;
    save: string;
    reset: string;
    open: string;
    pins: string;
    back: string;
  };
  initialArea?: string;
  mode?: "full" | "teaser";
}) {
  const router = useRouter();
  const { styleId, setMapStyle } = useMapStyle();
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<Map | null>(null);
  const markersRef = useRef<Marker[]>([]);
  const teaser = mode === "teaser";
  const [ready, setReady] = useState(false);
  const [selected, setSelected] = useState<AreaId | null>(
    teaser
      ? null
      : areas.some((area) => area.id === initialArea)
        ? (initialArea as AreaId)
        : null,
  );
  const [hovered, setHovered] = useState<AreaId | null>(null);
  const [overrides, setOverrides] = useState<Overrides>({});
  const [editing, setEditing] = useState(false);
  const [notice, setNotice] = useState("");

  useEffect(() => {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return;
    try {
      setOverrides(JSON.parse(raw) as Overrides);
    } catch {
      window.localStorage.removeItem(STORAGE_KEY);
    }
  }, []);

  const colors = useMemo(() => {
    const next: Partial<Record<AreaId, string>> = {};
    for (const area of areas) {
      const color = overrides[area.id]?.color;
      if (color) next[area.id] = color;
    }
    return next;
  }, [overrides]);

  const geojson = useMemo(() => areasGeoJson(colors), [colors]);

  useEffect(() => {
    if (!containerRef.current) return;
    setWorkerUrl("/maplibre-gl-worker.mjs");
    const map = new Map({
      container: containerRef.current,
      style: mapStyleUrl(styleId),
      center: [55.27, 25.12],
      zoom: teaser ? 9.2 : 10,
      attributionControl: false,
      interactive: !teaser,
    });
    if (!teaser) {
      map.addControl(new NavigationControl({ showCompass: false }), "top-left");
    } else {
      lockMap(map);
    }
    map.on("load", () => {
      map.addSource("areas", { type: "geojson", data: areasGeoJson() });
      map.addLayer({
        id: "areas-fill",
        type: "fill",
        source: "areas",
        paint: {
          "fill-color": ["get", "color"],
          "fill-opacity": 0.62,
        },
      });
      map.addLayer({
        id: "areas-line",
        type: "line",
        source: "areas",
        layout: { "line-join": "round", "line-cap": "round" },
        paint: {
          "line-color": "#1a1714",
          "line-width": 1.2,
          "line-opacity": 0.45,
        },
      });
      map.on("click", "areas-fill", (event: MapMouseEvent & {
        features?: { properties?: { id?: AreaId } }[];
      }) => {
        const id = event.features?.[0]?.properties?.id;
        if (!id) return;
        if (teaser) {
          router.push(`/map?area=${id}`);
          return;
        }
        setSelected(id);
      });
      map.on("mouseenter", "areas-fill", () => {
        map.getCanvas().style.cursor = "pointer";
      });
      map.on("mouseleave", "areas-fill", () => {
        map.getCanvas().style.cursor = "";
        if (teaser) setHovered(null);
      });
      map.on("mousemove", "areas-fill", (event: MapMouseEvent & {
        features?: { properties?: { id?: AreaId } }[];
      }) => {
        if (!teaser) return;
        const id = event.features?.[0]?.properties?.id ?? null;
        setHovered(id);
      });
      if (teaser) fitAreas(map);
      map.resize();
      setReady(true);
    });
    const observer = new ResizeObserver(() => {
      map.resize();
      if (teaser) fitAreas(map);
    });
    observer.observe(containerRef.current);
    mapRef.current = map;
    return () => {
      observer.disconnect();
      markersRef.current.forEach((marker) => marker.remove());
      map.remove();
      mapRef.current = null;
      setReady(false);
    };
  }, [router, styleId, teaser]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !ready) return;
    (map.getSource("areas") as GeoJSONSource | undefined)?.setData(geojson);
  }, [geojson, ready]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !ready || !map.getLayer("areas-fill")) return;
    const focus = hovered;
    map.setPaintProperty("areas-fill", "fill-opacity", [
      "case",
      ["==", ["get", "id"], focus ?? ""],
      0.82,
      teaser ? 0.55 : 0.62,
    ]);
    map.setPaintProperty("areas-line", "line-width", [
      "case",
      ["==", ["get", "id"], focus ?? ""],
      2.2,
      1.2,
    ]);
  }, [hovered, ready, teaser]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !ready) return;
    markersRef.current.forEach((marker) => marker.remove());
    markersRef.current = [];

    const place = (lng: number, lat: number, text: string, tone: "area" | "pin") => {
      const element = document.createElement("button");
      element.type = "button";
      element.textContent = text;
      element.className =
        tone === "area"
          ? "rounded-full bg-white/95 px-2.5 py-1 text-[11px] font-semibold tracking-wide text-[#1a1714] shadow-[0_8px_20px_-12px_rgba(6,36,33,0.55)] ring-1 ring-black/5"
          : "rounded-full bg-[#0e3324] px-2 py-1 text-[11px] font-semibold text-[#f4efe6] shadow";
      const marker = new Marker({ element, anchor: "center" })
        .setLngLat([lng, lat])
        .addTo(map);
      markersRef.current.push(marker);
      return element;
    };

    if (teaser || !selected) {
      for (const area of areas) {
        const element = place(
          area.center[0],
          area.center[1],
          shortMillions(area.avgPrice),
          "area",
        );
        element.addEventListener("click", (event) => {
          event.stopPropagation();
          if (teaser) {
            router.push(`/map?area=${area.id}`);
            return;
          }
          setSelected(area.id);
        });
        element.addEventListener("mouseenter", () => {
          if (teaser) setHovered(area.id);
        });
        element.addEventListener("mouseleave", () => {
          if (teaser) setHovered(null);
        });
      }
      return;
    }

    const area = areas.find((item) => item.id === selected);
    if (!area) return;
    map.flyTo({ center: area.center, zoom: 12.4, essential: true });
    for (const project of projectsInArea(area.id)) {
      const element = place(
        project.point[0],
        project.point[1],
        shortMillions(project.startPrice),
        "pin",
      );
      element.title = projectNames[project.id] ?? project.id;
    }
  }, [projectNames, ready, router, selected, teaser]);

  const area = areas.find((item) => item.id === selected);
  const story =
    (area && overrides[area.id]?.bodies?.[locale]) ||
    (area ? bodies[area.id] : "");
  const color = (area && overrides[area.id]?.color) || area?.color || "#7dcea0";

  function persist(next: Overrides) {
    setOverrides(next);
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    setNotice(labels.save);
  }

  return (
    <div className={`relative w-full overflow-hidden bg-sand ${teaser ? "h-full min-h-[22rem] sm:min-h-[26rem]" : "h-full"}`}>
      <div ref={containerRef} className={`h-full w-full ${teaser ? "[&_.maplibregl-canvas]:cursor-pointer" : ""}`} />
      {!teaser ? (
        <MapStylePicker
          value={styleId}
          onChange={setMapStyle}
          className="absolute end-3 top-3 z-30"
        />
      ) : null}
      {teaser ? (
        <>
          <div
            aria-hidden
            className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_center,transparent_48%,rgba(6,36,33,0.22)_100%)]"
          />
          <div className="pointer-events-none absolute inset-x-0 bottom-0 h-28 bg-gradient-to-t from-palm-deep/50 to-transparent" />
          {hovered && names[hovered] ? (
            <p className="pointer-events-none absolute top-4 start-4 z-10 rounded-lg bg-white/95 px-3 py-1.5 text-sm font-medium text-ink shadow-sm ring-1 ring-black/5">
              {names[hovered]}
              {areas.find((item) => item.id === hovered) ? (
                <span className="ms-2 text-mist">
                  {shortMillions(areas.find((item) => item.id === hovered)!.avgPrice)}
                </span>
              ) : null}
            </p>
          ) : null}
          <Link
            href="/map?city=dubai"
            className="group/enter absolute inset-x-0 bottom-0 z-10 flex items-end justify-between gap-3 px-4 pb-3.5 pt-10 text-[#e7f2ec] transition"
            aria-label={labels.open}
          >
            <span className="text-sm text-white/80">{labels.open}</span>
            <span className="inline-flex size-9 items-center justify-center rounded-full border border-white/35 bg-white/10 backdrop-blur-sm transition group-hover/enter:border-[#e4c27a] group-hover/enter:bg-[#e4c27a] group-hover/enter:text-palm-deep">
              <svg viewBox="0 0 24 24" className="size-4 rtl:rotate-180" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden>
                <path d="M5 12h14M13 6l6 6-6 6" />
              </svg>
            </span>
          </Link>
        </>
      ) : null}
      {area && !teaser ? (
        <aside className="absolute end-3 top-3 z-10 flex max-h-[calc(100%-1.5rem)] w-[min(100%-1.5rem,22rem)] flex-col overflow-hidden rounded-3xl border border-ink/10 bg-foam shadow-xl max-md:top-auto max-md:bottom-3 max-md:max-h-[48%]">
          <img
            src={area.image}
            alt=""
            className="h-36 w-full object-cover"
          />
          <div className="space-y-3 overflow-y-auto p-4">
            <div className="flex items-start justify-between gap-3">
              <h2 className="font-display text-2xl leading-tight">
                {names[area.id]}
              </h2>
              <button
                type="button"
                onClick={() => setSelected(null)}
                className="text-xs text-mist"
              >
                {labels.back}
              </button>
            </div>
            <dl className="grid grid-cols-4 gap-2 text-center text-[11px]">
              {[
                [labels.min, shortMillions(area.minPrice)],
                [labels.count, String(projectsInArea(area.id).length)],
                [labels.max, shortMillions(area.maxPrice)],
                [labels.avg, shortMillions(area.avgPrice)],
              ].map(([label, value]) => (
                <div key={label} className="rounded-2xl bg-sand px-1 py-2">
                  <dt className="text-mist">{label}</dt>
                  <dd className="mt-1 font-semibold">{value}</dd>
                </div>
              ))}
            </dl>
            <p className="text-xs text-mist">
              {money(area.avgPrice, locale)}
            </p>
            {editing && mode === "full" ? (
              <form
                className="space-y-2"
                onSubmit={(event) => {
                  event.preventDefault();
                  const form = new FormData(event.currentTarget);
                  const nextColor = String(form.get("color") || color);
                  const nextBody = String(form.get("body") || "");
                  persist({
                    ...overrides,
                    [area.id]: {
                      ...overrides[area.id],
                      color: nextColor,
                      bodies: {
                        ...overrides[area.id]?.bodies,
                        [locale]: nextBody,
                      },
                    },
                  });
                }}
              >
                <label className="block text-xs text-mist">
                  {labels.color}
                  <input
                    name="color"
                    type="color"
                    defaultValue={color}
                    className="mt-1 h-10 w-full"
                  />
                </label>
                <label className="block text-xs text-mist">
                  {labels.story}
                  <textarea
                    name="body"
                    defaultValue={story}
                    rows={4}
                    className={`mt-1 ${areaClass}`}
                  />
                </label>
                <button
                  type="submit"
                  className="rounded-full bg-ink px-4 py-2 text-sm text-paper"
                >
                  {labels.save}
                </button>
              </form>
            ) : (
              <p className="text-sm leading-7">{story}</p>
            )}
            <div className="flex flex-wrap gap-2">
              <Link
                href={`/areas/${area.id}`}
                className="rounded-full bg-palm px-3 py-1.5 text-xs text-white"
              >
                {labels.open}
              </Link>
              {mode === "full" ? (
                <button
                  type="button"
                  onClick={() => setEditing((value) => !value)}
                  className="rounded-full border border-ink/15 px-3 py-1.5 text-xs"
                >
                  {editing ? labels.done : labels.edit}
                </button>
              ) : null}
              {overrides[area.id] && mode === "full" ? (
                <button
                  type="button"
                  className="rounded-full px-3 py-1.5 text-xs text-mist"
                  onClick={() => {
                    const next = { ...overrides };
                    delete next[area.id];
                    persist(next);
                  }}
                >
                  {labels.reset}
                </button>
              ) : null}
            </div>
            {notice ? <p className="text-xs text-palm">{notice}</p> : null}
            {mode === "full" ? (
              <ul className="space-y-1 text-sm">
                {projectsInArea(area.id).map((project) => (
                  <li key={project.id}>
                    <Link href={`/projects/${project.id}`} className="hover:text-palm">
                      {projectNames[project.id]} · {shortMillions(project.startPrice)}
                    </Link>
                  </li>
                ))}
              </ul>
            ) : null}
          </div>
        </aside>
      ) : null}
    </div>
  );
}
