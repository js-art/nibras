"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { controlClass } from "@/components/ui/controls";
import {
  LngLatBounds,
  Map,
  Marker,
  NavigationControl,
  setWorkerUrl,
  type GeoJSONSource,
  type MapMouseEvent,
} from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { DESK_PATH } from "@/lib/desk";
import { circleRing, roundRing, simplify, type DrawMode } from "@/lib/shape";
import {
  areaStats,
  closeRing,
  currenciesInCountry,
  currencyOf,
  FALLBACK_IMAGE,
  fullAmount,
  moneyUnit,
  pick,
  pickPlain,
  pointInRing,
  projectRing,
  shortAmount,
  textOf,
  type Area,
  type Atlas,
  type Beds,
  type Currency,
  type LngLat,
  type Project,
} from "@/data/atlas";
import { HintLabel } from "@/components/admin/hint-label";
import { ProseHtml } from "@/components/prose-html";
import { MapStylePicker } from "@/components/map/map-style-picker";
import { useMapStyle } from "@/lib/hooks/use-map-style";
import { mapStyleUrl } from "@/lib/map-style";

type Rail = "areas" | "search" | "draw";
type Legend = "area" | "price" | "count";

const empty = { type: "FeatureCollection" as const, features: [] };

function heat(t: number, stops: string[]) {
  const index = Math.max(0, Math.min(stops.length - 1, Math.round(t * (stops.length - 1))));
  return stops[index];
}

export function AtlasMap({
  atlas,
  locale,
  initialArea,
  initialCity,
  isAdmin = false,
}: {
  atlas: Atlas;
  locale: string;
  initialArea?: string;
  initialCity?: string;
  isAdmin?: boolean;
}) {
  const t = useTranslations("desk");
  const textDir = locale === "en" ? "ltr" : "rtl";
  const { styleId, setMapStyle } = useMapStyle();
  const opening = atlas.areas.find((area) => area.id === initialArea);
  const openingCity =
    atlas.cities.find((city) => city.id === (initialCity || opening?.cityId)) ??
    atlas.cities.find((city) => city.id === "dubai") ??
    atlas.cities[0];

  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<Map | null>(null);
  const markersRef = useRef<Marker[]>([]);
  const actionRef = useRef<(event: MapMouseEvent) => void>(() => {});
  const railRef = useRef<Rail>("areas");
  const [ready, setReady] = useState(false);
  const [rail, setRail] = useState<Rail>("areas");
  const [legend, setLegend] = useState<Legend>("area");
  const [cityId, setCityId] = useState(openingCity?.id ?? "");
  const [areaId, setAreaId] = useState<string | null>(opening?.id ?? null);
  const [projectId, setProjectId] = useState<string | null>(null);
  const [hoveredId, setHoveredId] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [drawPoints, setDrawPoints] = useState<LngLat[]>([]);
  const [drawClosed, setDrawClosed] = useState(false);
  const [drawMode, setDrawMode] = useState<DrawMode>("corner");
  const [briefOpen, setBriefOpen] = useState(false);
  const [aboutOpen, setAboutOpen] = useState(false);
  const [beds, setBeds] = useState<Beds | null>(null);
  const [panelOpen, setPanelOpen] = useState(true);
  const [currencyFilter, setCurrencyFilter] = useState<Currency | "all">("all");

  const city = atlas.cities.find((item) => item.id === cityId) ?? atlas.cities[0];
  const country = city?.country ?? "ae";
  const countryCurrency: Currency = currencyOf(country);
  const countryCurrencies = useMemo(() => currenciesInCountry(atlas, country), [atlas, country]);
  const cityAreas = atlas.areas.filter((area) => area.cityId === city?.id);
  const area = atlas.areas.find((item) => item.id === areaId) ?? null;
  const project = atlas.projects.find((item) => item.id === projectId) ?? null;
  const areaProjects = atlas.projects.filter(
    (item) =>
      item.areaId === area?.id && (currencyFilter === "all" || item.currency === currencyFilter),
  );
  const citiesHere = atlas.cities.filter((item) => item.country === country);

  useEffect(() => {
    setCurrencyFilter("all");
  }, [country]);

  const view =
    rail === "search"
      ? "search"
      : rail === "draw"
        ? project
          ? "project"
          : "draw"
        : project
          ? "project"
          : area
            ? "area"
            : "areas";

  useEffect(() => {
    railRef.current = rail;
  }, [rail]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (window.matchMedia("(min-width: 1024px)").matches) return;
    setPanelOpen(Boolean(areaId || projectId || rail === "search" || rail === "draw"));
  }, [areaId, projectId, rail]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !ready) return;
    const id = window.requestAnimationFrame(() => map.resize());
    return () => window.cancelAnimationFrame(id);
  }, [panelOpen, ready]);

  const editHref = useMemo(() => {
    if (projectId) return `${DESK_PATH}?section=projects&id=${encodeURIComponent(projectId)}`;
    if (areaId) return `${DESK_PATH}?section=areas&id=${encodeURIComponent(areaId)}`;
    if (cityId) return `${DESK_PATH}?section=cities&id=${encodeURIComponent(cityId)}`;
    return DESK_PATH;
  }, [areaId, cityId, projectId]);

  const drawn = useMemo(() => (drawClosed ? closeRing(drawPoints) : drawPoints), [drawClosed, drawPoints]);
  const inside = useMemo(() => {
    if (!drawClosed || drawn.length < 4) return [];
    return atlas.projects.filter((item) => pointInRing(item.point, drawn));
  }, [atlas.projects, drawClosed, drawn]);

  const areaGeo = useMemo(() => {
    const selected = view === "area" || view === "project" ? area : null;
    const sourceAreas = selected ? [selected] : cityAreas.filter((item) => item.ring.length >= 4);
    const stats = sourceAreas.map((item) => ({ item, ...areaStats(atlas, item.id) }));
    const prices = stats.map((item) => item.min).filter((value) => value > 0);
    const counts = stats.map((item) => item.count);
    const minPrice = Math.min(...prices, 0);
    const maxPrice = Math.max(...prices, 1);
    const maxCount = Math.max(...counts, 1);
    const needle = query.trim().toLowerCase();
    return {
      type: "FeatureCollection" as const,
      features: stats.map(({ item, min, count }) => {
        const scale = legend === "count" ? count / maxCount : (min - minPrice) / (maxPrice - minPrice || 1);
        const fill = selected
          ? "#f7f1e6"
          : legend === "area"
            ? item.color
            : legend === "price"
              ? heat(Number.isFinite(scale) ? scale : 0, ["#f3e1c5", "#e7b56a", "#d46a4c", "#8d3a3a"])
              : heat(scale, ["#e7f2ea", "#9dcead", "#3e8f5a", "#0e3324"]);
        const named = textOf(item.names).includes(needle) || textOf(item.about).includes(needle);
        const dim = needle.length > 1 && !selected && !named;
        return {
          type: "Feature" as const,
          properties: {
            id: item.id,
            fill,
            opacity: selected ? 0.45 : dim ? 0.12 : 0.62,
            line: "#1a1714",
            width: selected ? 2.4 : 1.2,
          },
          geometry: { type: "Polygon" as const, coordinates: [item.ring] },
        };
      }),
    };
  }, [area, atlas, cityAreas, legend, query, view]);

  const focusGeo = useMemo(() => {
    const focus =
      atlas.projects.find((item) => item.id === hoveredId) ??
      (view === "project" ? project : null);
    if (!focus || view === "areas" || view === "search") return empty;
    return {
      type: "FeatureCollection" as const,
      features: [
        {
          type: "Feature" as const,
          properties: {},
          geometry: { type: "Polygon" as const, coordinates: [projectRing(focus)] },
        },
      ],
    };
  }, [atlas.projects, hoveredId, project, view]);

  const drawGeo = useMemo(() => {
    if (drawPoints.length < 2) return empty;
    const closed = drawClosed && drawPoints.length >= 3;
    const preview =
      !closed && drawMode === "smooth" && drawPoints.length >= 3 ? roundRing(drawPoints) : drawPoints;
    const shaped = closed ? closeRing(drawPoints) : preview;
    return {
      type: "FeatureCollection" as const,
      features: [
        {
          type: "Feature" as const,
          properties: {},
          geometry:
            closed || (drawMode === "smooth" && drawPoints.length >= 3)
              ? { type: "Polygon" as const, coordinates: [closeRing(shaped)] }
              : { type: "LineString" as const, coordinates: shaped },
        },
      ],
    };
  }, [drawClosed, drawMode, drawPoints]);

  const vertexGeo = useMemo(
    () => ({
      type: "FeatureCollection" as const,
      features: (drawClosed && drawPoints.length > 16 ? [] : drawPoints).map((coord) => ({
        type: "Feature" as const,
        properties: {},
        geometry: { type: "Point" as const, coordinates: coord },
      })),
    }),
    [drawClosed, drawPoints],
  );

  useEffect(() => {
    if (!containerRef.current || mapRef.current || !openingCity) return;
    setWorkerUrl("/maplibre-gl-worker.mjs");
    const map = new Map({
      container: containerRef.current,
      style: mapStyleUrl(styleId),
      center: openingCity.center,
      zoom: openingCity.zoom,
      attributionControl: false,
    });
    map.addControl(new NavigationControl({ showCompass: false }), "top-left");
    map.on("load", () => {
      map.addSource("areas", { type: "geojson", data: empty });
      map.addLayer({
        id: "areas-fill",
        type: "fill",
        source: "areas",
        paint: {
          "fill-color": ["get", "fill"],
          "fill-opacity": ["get", "opacity"],
        },
      });
      map.addLayer({
        id: "areas-line",
        type: "line",
        source: "areas",
        layout: { "line-join": "round", "line-cap": "round" },
        paint: {
          "line-color": ["get", "line"],
          "line-width": ["get", "width"],
        },
      });
      map.addSource("focus", { type: "geojson", data: empty });
      map.addLayer({
        id: "focus-fill",
        type: "fill",
        source: "focus",
        paint: { "fill-color": "#1a1714", "fill-opacity": 0.16 },
      });
      map.addLayer({
        id: "focus-line",
        type: "line",
        source: "focus",
        paint: { "line-color": "#1a1714", "line-width": 2 },
      });
      map.addSource("draw", { type: "geojson", data: empty });
      map.addLayer({
        id: "draw-fill",
        type: "fill",
        source: "draw",
        filter: ["==", ["geometry-type"], "Polygon"],
        paint: { "fill-color": "#2f9e5b", "fill-opacity": 0.35 },
      });
      map.addLayer({
        id: "draw-line",
        type: "line",
        source: "draw",
        paint: { "line-color": "#1f7a45", "line-width": 3 },
      });
      map.addSource("vertices", { type: "geojson", data: empty });
      map.addLayer({
        id: "vertices",
        type: "circle",
        source: "vertices",
        paint: {
          "circle-radius": 5,
          "circle-color": "#fffdf8",
          "circle-stroke-color": "#1f7a45",
          "circle-stroke-width": 2,
        },
      });
      map.on("click", (event: MapMouseEvent) => actionRef.current(event));
      map.on("mousemove", (event: MapMouseEvent) => {
        if (railRef.current === "draw") {
          map.getCanvas().style.cursor = "crosshair";
          return;
        }
        const hits = map.queryRenderedFeatures(event.point, { layers: ["areas-fill"] });
        map.getCanvas().style.cursor = hits.length ? "pointer" : "";
      });
      map.resize();
      setReady(true);
    });
    const observer = new ResizeObserver(() => map.resize());
    observer.observe(containerRef.current);
    mapRef.current = map;
    return () => {
      observer.disconnect();
      markersRef.current.forEach((marker) => marker.remove());
      map.remove();
      mapRef.current = null;
      setReady(false);
    };
  }, [openingCity, styleId]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !ready) return;
    (map.getSource("areas") as GeoJSONSource | undefined)?.setData(areaGeo);
    (map.getSource("focus") as GeoJSONSource | undefined)?.setData(focusGeo);
    (map.getSource("draw") as GeoJSONSource | undefined)?.setData(drawGeo);
    (map.getSource("vertices") as GeoJSONSource | undefined)?.setData(vertexGeo);
  }, [areaGeo, drawGeo, focusGeo, ready, vertexGeo]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !ready || !city) return;
    const padding = { top: 56, bottom: 72, left: 56, right: 56 };
    if (project && view === "project") {
      map.flyTo({ center: project.point, zoom: 15.6, padding, essential: true });
      return;
    }
    if (area && (view === "area" || view === "project")) {
      const bounds = new LngLatBounds(area.ring[0], area.ring[0]);
      area.ring.forEach((coord) => bounds.extend(coord));
      map.fitBounds(bounds, { padding, maxZoom: 14.2, duration: 700 });
      return;
    }
    map.flyTo({ center: city.center, zoom: city.zoom, padding, essential: true });
  }, [area, city, project, ready, view]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !ready) return;
    markersRef.current.forEach((marker) => marker.remove());
    markersRef.current = [];
    if (rail === "draw") return;

    const place = (coord: LngLat, label: string, className: string, onPick: () => void) => {
      const element = document.createElement("button");
      element.type = "button";
      element.textContent = label;
      element.className = className;
      element.addEventListener("click", (event) => {
        event.stopPropagation();
        onPick();
      });
      const marker = new Marker({ element, anchor: "center" }).setLngLat(coord).addTo(map);
      markersRef.current.push(marker);
    };

    const quiet = "rounded-full border border-ink/10 bg-white/95 px-2.5 py-1 text-[11px] font-semibold text-ink shadow";
    const price = "rounded-full bg-ink px-2 py-1 text-[11px] font-semibold text-paper shadow";
    const hot = "rounded-full bg-ink px-2.5 py-1 text-[12px] font-semibold text-paper shadow-lg ring-2 ring-white";

    if (view === "areas" || view === "search") {
      for (const item of cityAreas) {
        const stats = areaStats(atlas, item.id, currencyFilter);
        const name = pick(item.names, locale) || item.id;
        const label =
          legend === "count"
            ? stats.count
              ? String(stats.count)
              : name
            : legend === "price"
              ? stats.count && stats.currency && !stats.mixed
                ? shortAmount(stats.min, stats.currency)
                : stats.count
                  ? String(stats.count)
                  : name
              : name;
        place(item.center, label, quiet, () => {
          setRail("areas");
          setAreaId(item.id);
          setProjectId(null);
          setAboutOpen(false);
        });
      }
      return;
    }

    const pins = view === "project" && project ? [project] : areaProjects;
    for (const item of pins) {
      const active = item.id === hoveredId || item.id === projectId;
      place(
        item.point,
        `${shortAmount(item.startPrice, item.currency)} ${moneyUnit(item.currency, locale)}`,
        active ? hot : price,
        () => {
          setProjectId(item.id);
          setBriefOpen(false);
          setBeds(null);
        },
      );
    }
  }, [
    areaProjects,
    atlas,
    cityAreas,
    currencyFilter,
    hoveredId,
    legend,
    locale,
    project,
    projectId,
    rail,
    ready,
    view,
  ]);

  useEffect(() => {
    actionRef.current = (event) => {
      const map = mapRef.current;
      if (!map) return;
      if (rail === "draw") {
        if (drawClosed || drawMode === "hand") return;
        const next: LngLat = [event.lngLat.lng, event.lngLat.lat];
        if (drawMode === "round") {
          if (drawPoints.length === 0) {
            setDrawPoints([next]);
            return;
          }
          const circle = circleRing(drawPoints[0], next);
          if (circle.length >= 4) {
            setDrawPoints(circle.slice(0, -1));
            setDrawClosed(true);
          }
          return;
        }
        if (drawMode === "corner" && drawPoints.length >= 3) {
          const first = map.project(drawPoints[0]);
          if (Math.hypot(first.x - event.point.x, first.y - event.point.y) < 16) {
            setDrawClosed(true);
            return;
          }
        }
        setDrawPoints((points) => [...points, next]);
        return;
      }
      const hits = map.queryRenderedFeatures(event.point, { layers: ["areas-fill"] });
      const id = hits[0]?.properties?.id;
      if (typeof id === "string") {
        setRail("areas");
        setAreaId(id);
        setProjectId(null);
        setAboutOpen(false);
      }
    };
  }, [drawClosed, drawMode, drawPoints, rail]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !ready || rail !== "draw" || drawMode !== "hand") return;
    let active = false;
    let trail: LngLat[] = [];
    const start = (event: MapMouseEvent) => {
      if (drawClosed) return;
      active = true;
      trail = [[event.lngLat.lng, event.lngLat.lat]];
      map.dragPan.disable();
    };
    const move = (event: MapMouseEvent) => {
      if (!active) return;
      const next: LngLat = [event.lngLat.lng, event.lngLat.lat];
      const last = trail[trail.length - 1];
      if (!last || Math.hypot(last[0] - next[0], last[1] - next[1]) > 0.00035) trail.push(next);
    };
    const finish = () => {
      if (!active) return;
      active = false;
      map.dragPan.enable();
      const simple = simplify(trail, 0.0009);
      trail = [];
      if (simple.length < 3) return;
      setDrawPoints(simple);
      setDrawClosed(true);
    };
    map.on("mousedown", start);
    map.on("mousemove", move);
    map.on("mouseup", finish);
    return () => {
      map.off("mousedown", start);
      map.off("mousemove", move);
      map.off("mouseup", finish);
      map.dragPan.enable();
    };
  }, [drawClosed, drawMode, rail, ready]);

  function chooseCountry(next: "ae" | "om") {
    const first = atlas.cities.find((item) => item.country === next);
    if (!first) return;
    setCityId(first.id);
    setAreaId(null);
    setProjectId(null);
    setRail("areas");
  }

  function chooseCity(id: string) {
    setCityId(id);
    setAreaId(null);
    setProjectId(null);
    setRail("areas");
  }

  function openArea(id: string) {
    const next = atlas.areas.find((item) => item.id === id);
    if (!next) return;
    setCityId(next.cityId);
    setAreaId(next.id);
    setProjectId(null);
    setRail("areas");
    setAboutOpen(false);
    setQuery("");
  }

  function openProject(id: string) {
    const next = atlas.projects.find((item) => item.id === id);
    const home = atlas.areas.find((item) => item.id === next?.areaId);
    if (!next || !home) return;
    setCityId(home.cityId);
    setAreaId(home.id);
    setProjectId(next.id);
    setRail("areas");
    setBriefOpen(false);
    setBeds(null);
    setQuery("");
  }

  const suggestions = [...atlas.suggestions].sort((a, b) => a.order - b.order);
  const needle = query.trim().toLowerCase();
  const results = needle
    ? {
        cities: atlas.cities.filter((item) => textOf(item.names).includes(needle)),
        areas: atlas.areas.filter((item) => `${textOf(item.names)} ${textOf(item.about)}`.includes(needle)),
        projects: atlas.projects.filter((item) => `${textOf(item.names)} ${textOf(item.about)}`.includes(needle)),
      }
    : null;

  const panelTitle =
    view === "project" && project
      ? pick(project.names, locale)
      : view === "area" && area
        ? pick(area.names, locale)
        : view === "search"
          ? t("search")
          : view === "draw"
            ? t("draw")
            : t("areas");

  function openRail(next: Rail) {
    setRail(next);
    setAreaId(null);
    setProjectId(null);
    setHoveredId(null);
    setBriefOpen(false);
    if (next === "areas") setAboutOpen(false);
    setPanelOpen(true);
  }

  return (
    <div className="relative flex h-full min-h-0 flex-col bg-paper lg:flex-row" dir="ltr">
      <div className="relative min-h-0 min-w-0 flex-1">
        <div ref={containerRef} className="h-full w-full" />
        {rail === "draw" ? (
          <p className="pointer-events-none absolute left-1/2 top-4 z-10 max-w-[min(90vw,20rem)] -translate-x-1/2 rounded-full bg-ink px-4 py-2 text-center text-xs text-paper">
            {t("drawHint")}
          </p>
        ) : null}
        {view === "areas" || view === "search" ? (
          <div
            className={`absolute left-1/2 z-10 flex w-[min(92vw,22rem)] -translate-x-1/2 flex-col items-center gap-1.5 ${
              panelOpen ? "bottom-[calc(4.5rem+min(62dvh,32rem)+0.75rem)] lg:bottom-4" : "bottom-[5.75rem] lg:bottom-4"
            }`}
          >
            <div className="flex gap-1 rounded-full bg-white/95 p-1 shadow ring-1 ring-ink/10">
              {(
                [
                  ["area", t("legendArea"), t("legendAreaHint")],
                  ["price", t("legendPrice"), t("legendPriceHint")],
                  ["count", t("legendCount"), t("legendCountHint")],
                ] as const
              ).map(([id, label, hint]) => (
                <HintLabel key={id} hint={hint}>
                  <button
                    type="button"
                    onClick={() => setLegend(id)}
                    className={`rounded-full px-3 py-1.5 text-xs font-medium ${legend === id ? "bg-ink text-paper" : "text-ink"}`}
                  >
                    {label}
                  </button>
                </HintLabel>
              ))}
            </div>
            <p className="rounded-full bg-ink/80 px-3 py-1 text-[10px] font-medium text-paper backdrop-blur-sm">
              {legend === "area"
                ? t("legendCaptionArea")
                : legend === "price"
                  ? t("legendCaptionPrice")
                  : t("legendCaptionCount")}
            </p>
          </div>
        ) : null}

        {isAdmin ? (
          <Link
            href={editHref}
            className="absolute start-3 top-3 z-30 inline-flex size-12 items-center justify-center rounded-full bg-palm-deep text-[#e7f2ec] shadow-[0_16px_36px_-18px_rgba(6,36,33,0.85)] ring-2 ring-white/80 transition hover:scale-105 hover:bg-palm lg:start-4 lg:top-auto lg:bottom-5"
            title={t("editFloating")}
            aria-label={t("editFloating")}
          >
            <EditPencilIcon />
          </Link>
        ) : null}

        <button
          type="button"
          className="absolute end-3 top-3 z-30 inline-flex h-10 items-center gap-2 rounded-full bg-white/95 px-3 text-xs font-medium text-ink shadow ring-1 ring-ink/10 lg:hidden"
          onClick={() => setPanelOpen((value) => !value)}
          aria-expanded={panelOpen}
        >
          <PanelChevron open={panelOpen} />
          {panelOpen ? t("hidePanel") : t("showPanel")}
        </button>

        <MapStylePicker
          value={styleId}
          onChange={setMapStyle}
          className="absolute end-3 top-[3.75rem] z-30 lg:top-3"
        />
      </div>

      <aside
        className={`z-20 flex min-h-0 flex-col border-ink/10 bg-foam transition-[height] duration-300 ease-out max-lg:absolute max-lg:inset-x-0 max-lg:bottom-[4.5rem] max-lg:overflow-hidden max-lg:rounded-t-3xl max-lg:border-t max-lg:shadow-[0_-18px_40px_-24px_rgba(6,36,33,0.45)] lg:static lg:h-auto lg:w-[min(100%,24rem)] lg:shrink-0 lg:border-s lg:shadow-none ${
          panelOpen ? "max-lg:h-[min(62dvh,32rem)]" : "max-lg:h-12"
        }`}
      >
        <button
          type="button"
          dir={textDir}
          className="flex w-full shrink-0 flex-col items-center gap-2 px-4 py-2.5 lg:hidden"
          onClick={() => setPanelOpen((value) => !value)}
          aria-expanded={panelOpen}
        >
          <span className="h-1 w-10 rounded-full bg-ink/15" aria-hidden />
          {!panelOpen ? (
            <span className="flex w-full items-center justify-between gap-2 text-sm font-medium text-ink">
              <span className="truncate">{panelTitle}</span>
              <span className="shrink-0 text-xs text-mist">{t("showPanel")}</span>
            </span>
          ) : (
            <span className="flex w-full items-center justify-between gap-2 text-xs text-mist">
              <span className="truncate text-sm font-medium text-ink">{panelTitle}</span>
              <span>{t("hidePanel")}</span>
            </span>
          )}
        </button>
        <div
          dir={textDir}
          className={`flex min-h-0 flex-1 flex-col ${panelOpen ? "" : "max-lg:pointer-events-none max-lg:invisible max-lg:h-0 max-lg:overflow-hidden"}`}
        >
          {view === "areas" ? (
            <AreaList
              atlas={atlas}
              locale={locale}
              country={country}
              cities={citiesHere}
              cityId={city?.id ?? ""}
              areas={cityAreas}
              currencyFilter={currencyFilter}
              countryCurrencies={countryCurrencies}
              countryCurrency={countryCurrency}
              onCurrencyFilter={setCurrencyFilter}
              onCountry={chooseCountry}
              onCity={chooseCity}
              onArea={openArea}
            />
          ) : null}
          {view === "area" && area ? (
            <AreaDetail
              atlas={atlas}
              locale={locale}
              area={area}
              projects={areaProjects}
              currencyFilter={currencyFilter}
              countryCurrencies={countryCurrencies}
              countryCurrency={countryCurrency}
              onCurrencyFilter={setCurrencyFilter}
              aboutOpen={aboutOpen}
              onAbout={() => setAboutOpen((value) => !value)}
              onBack={() => {
                setAreaId(null);
                setProjectId(null);
              }}
              onProject={(id) => {
                setProjectId(id);
                setBriefOpen(false);
                setBeds(null);
              }}
              onHover={setHoveredId}
            />
          ) : null}
          {view === "project" && project && area ? (
            <ProjectDetail
              atlas={atlas}
              locale={locale}
              project={project}
              area={area}
              beds={beds}
              briefOpen={briefOpen}
              onBeds={setBeds}
              onBrief={() => setBriefOpen((value) => !value)}
              onBack={() => setProjectId(null)}
              onAreas={() => {
                setAreaId(null);
                setProjectId(null);
              }}
            />
          ) : null}
          {view === "search" ? (
            <SearchPanel
              atlas={atlas}
              locale={locale}
              query={query}
              onQuery={setQuery}
              suggestions={suggestions}
              results={results}
              onCity={chooseCity}
              onArea={openArea}
              onProject={openProject}
            />
          ) : null}
          {view === "draw" ? (
            <DrawPanel
              atlas={atlas}
              locale={locale}
              points={drawPoints.length}
              closed={drawClosed}
              mode={drawMode}
              onMode={(mode) => {
                setDrawMode(mode);
                setDrawPoints([]);
                setDrawClosed(false);
              }}
              inside={inside}
              onNew={() => {
                setDrawPoints([]);
                setDrawClosed(false);
                setProjectId(null);
              }}
              onClear={() => {
                setDrawPoints([]);
                setDrawClosed(false);
              }}
              onClose={() => {
                if (drawPoints.length < 3) return;
                if (drawMode === "smooth") {
                  const soft = roundRing(drawPoints);
                  setDrawPoints(soft.slice(0, -1));
                }
                setDrawClosed(true);
              }}
              onProject={(id) => {
                const next = atlas.projects.find((item) => item.id === id);
                const home = atlas.areas.find((item) => item.id === next?.areaId);
                if (!next || !home) return;
                setCityId(home.cityId);
                setAreaId(home.id);
                setProjectId(next.id);
                setBriefOpen(false);
              }}
            />
          ) : null}
        </div>
      </aside>

      <nav className="relative z-30 flex h-[4.5rem] w-full shrink-0 border-t border-ink/10 bg-paper lg:h-auto lg:w-[4.75rem] lg:flex-col lg:border-s lg:border-t-0">
        <div
          dir={textDir}
          className="flex h-full w-full items-stretch justify-around gap-1 px-2 py-1.5 lg:flex-col lg:items-center lg:justify-start lg:gap-2 lg:px-0 lg:py-3"
        >
          <RailButton active={rail === "search"} label={t("search")} onClick={() => openRail("search")}>
            <SearchIcon />
          </RailButton>
          <RailButton
            active={rail === "areas" && !areaId && !projectId}
            label={t("areas")}
            onClick={() => openRail("areas")}
          >
            <AreasIcon />
          </RailButton>
          <RailButton active={rail === "draw" && !projectId} label={t("draw")} onClick={() => openRail("draw")}>
            <DrawIcon />
          </RailButton>
          {isAdmin ? (
            <Link
              href={editHref}
              className="flex w-14 flex-col items-center gap-1 rounded-2xl px-1 py-2 text-[10px] text-palm transition hover:bg-sand lg:mt-auto"
            >
              <EditPencilIcon />
              {t("edit")}
            </Link>
          ) : (
            <Link
              href={`${DESK_PATH}/login`}
              className="flex w-14 flex-col items-center gap-1 rounded-2xl px-1 py-2 text-[10px] text-mist transition hover:bg-sand hover:text-ink lg:mt-auto"
            >
              <AdminIcon />
              {t("admin")}
            </Link>
          )}
        </div>
      </nav>
    </div>
  );
}

function RailButton({
  active,
  label,
  onClick,
  children,
}: {
  active: boolean;
  label: string;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex min-w-0 flex-1 flex-col items-center justify-center gap-0.5 rounded-2xl px-1 py-2 text-[10px] lg:w-14 lg:flex-none ${
        active ? "bg-sand text-ink" : "text-mist"
      }`}
    >
      {children}
      <span className="truncate">{label}</span>
    </button>
  );
}

function PanelChevron({ open }: { open: boolean }) {
  return (
    <svg
      viewBox="0 0 24 24"
      className={`h-4 w-4 transition-transform ${open ? "rotate-180" : ""}`}
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      aria-hidden
    >
      <path d="M6 9l6 6 6-6" />
    </svg>
  );
}

function EditPencilIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden>
      <path d="M4 16.5V20h3.5L18 9.5 14.5 6 4 16.5z" />
      <path d="M13 7.5l3.5 3.5" />
    </svg>
  );
}

function CurrencyFilterBar({
  currencies,
  value,
  countryCurrency,
  onChange,
}: {
  currencies: Currency[];
  value: Currency | "all";
  countryCurrency: Currency;
  onChange: (value: Currency | "all") => void;
}) {
  const t = useTranslations("desk");
  if (currencies.length <= 1 && !currencies.some((item) => item !== countryCurrency)) {
    return null;
  }
  const options: (Currency | "all")[] = ["all", ...currencies];
  return (
    <div className="mt-3">
      <p className="mb-1.5 text-[11px] text-mist">{t("currencyFilter")}</p>
      <div className="flex gap-2 overflow-x-auto pb-1">
        {options.map((code) => (
          <button
            key={code}
            type="button"
            onClick={() => onChange(code)}
            className={`shrink-0 rounded-full px-3 py-1.5 text-xs ${
              value === code ? "bg-palm text-white" : "border border-ink/10 bg-white"
            }`}
          >
            {code === "all" ? t("currencyAll") : code}
          </button>
        ))}
      </div>
    </div>
  );
}

function AreaList({
  atlas,
  locale,
  country,
  cities,
  cityId,
  areas,
  currencyFilter,
  countryCurrencies,
  countryCurrency,
  onCurrencyFilter,
  onCountry,
  onCity,
  onArea,
}: {
  atlas: Atlas;
  locale: string;
  country: "ae" | "om";
  cities: Atlas["cities"];
  cityId: string;
  areas: Area[];
  currencyFilter: Currency | "all";
  countryCurrencies: Currency[];
  countryCurrency: Currency;
  onCurrencyFilter: (value: Currency | "all") => void;
  onCountry: (country: "ae" | "om") => void;
  onCity: (id: string) => void;
  onArea: (id: string) => void;
}) {
  const t = useTranslations("desk");
  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <header className="border-b border-ink/10 px-4 py-4">
        <h1 className="font-display text-2xl">{t("areas")}</h1>
        <div className="mt-3 grid grid-cols-2 gap-2">
          {(
            [
              ["ae", t("emirates")],
              ["om", t("oman")],
            ] as const
          ).map(([id, label]) => (
            <button
              key={id}
              type="button"
              onClick={() => onCountry(id)}
              className={`rounded-full px-3 py-1.5 text-sm ${country === id ? "bg-palm text-white" : "bg-sand text-ink"}`}
            >
              {label}
            </button>
          ))}
        </div>
        <div className="mt-3 flex gap-2 overflow-x-auto pb-1">
          {cities.map((city) => (
            <button
              key={city.id}
              type="button"
              onClick={() => onCity(city.id)}
              className={`shrink-0 rounded-full px-3 py-1.5 text-sm ${city.id === cityId ? "bg-palm text-white" : "border border-ink/10 bg-white"}`}
            >
              {pick(city.names, locale)}
            </button>
          ))}
        </div>
        <CurrencyFilterBar
          currencies={countryCurrencies}
          value={currencyFilter}
          countryCurrency={countryCurrency}
          onChange={onCurrencyFilter}
        />
        <p className="mt-2 text-xs text-mist">
          {areas.length} {t("areas")}
        </p>
      </header>
      <div className="grid flex-1 grid-cols-2 content-start gap-3 overflow-y-auto p-4">
        {areas.map((area) => {
          const stats = areaStats(atlas, area.id, currencyFilter);
          return (
            <button key={area.id} type="button" onClick={() => onArea(area.id)} className="text-start">
              <span className="relative block aspect-[4/3] overflow-hidden rounded-2xl">
                <img src={area.image || FALLBACK_IMAGE} alt="" className="h-full w-full object-cover" />
                <span className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/75 to-transparent px-2 py-2 text-sm font-medium text-white">
                  {pick(area.names, locale)}
                </span>
              </span>
              <span className="mt-1 block text-[11px] text-mist">
                {stats.count}
                {stats.min && stats.currency
                  ? ` · ${shortAmount(stats.min, stats.currency)} ${moneyUnit(stats.currency, locale)}`
                  : stats.mixed
                    ? ` · ${t("currencyMixed")}`
                    : ""}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

function Crumbs({ items }: { items: { label: string; onClick?: () => void }[] }) {
  return (
    <nav className="flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1 text-sm">
      {items.map((item, index) => (
        <span key={`${item.label}-${index}`} className="flex min-w-0 items-center gap-2">
          {index > 0 ? <span className="text-mist">/</span> : null}
          {item.onClick ? (
            <button
              type="button"
              onClick={item.onClick}
              className="shrink-0 text-mist underline-offset-4 transition hover:text-palm hover:underline"
            >
              {item.label}
            </button>
          ) : (
            <span className="truncate font-medium text-ink">{item.label}</span>
          )}
        </span>
      ))}
    </nav>
  );
}

function AreaDetail({
  atlas,
  locale,
  area,
  projects,
  currencyFilter,
  countryCurrencies,
  countryCurrency,
  onCurrencyFilter,
  aboutOpen,
  onAbout,
  onBack,
  onProject,
  onHover,
}: {
  atlas: Atlas;
  locale: string;
  area: Area;
  projects: Project[];
  currencyFilter: Currency | "all";
  countryCurrencies: Currency[];
  countryCurrency: Currency;
  onCurrencyFilter: (value: Currency | "all") => void;
  aboutOpen: boolean;
  onAbout: () => void;
  onBack: () => void;
  onProject: (id: string) => void;
  onHover: (id: string | null) => void;
}) {
  const t = useTranslations("desk");
  const city = atlas.cities.find((item) => item.id === area.cityId);
  const stats = areaStats(atlas, area.id, currencyFilter);
  const statsCurrency = stats.currency ?? countryCurrency;
  return (
    <div className="min-h-0 flex-1 overflow-y-auto">
      <header className="sticky top-0 z-10 border-b border-ink/10 bg-foam px-4 py-3">
        <Crumbs
          items={[
            { label: t("areas"), onClick: onBack },
            ...(city ? [{ label: pick(city.names, locale), onClick: onBack }] : []),
            { label: pick(area.names, locale) },
          ]}
        />
        <CurrencyFilterBar
          currencies={countryCurrencies}
          value={currencyFilter}
          countryCurrency={countryCurrency}
          onChange={onCurrencyFilter}
        />
      </header>
      <div className="space-y-4 p-4">
        <p className="text-sm text-mist">
          {city ? pick(city.names, locale) : ""}، {pick(area.names, locale)}
        </p>
        <img src={area.image || FALLBACK_IMAGE} alt="" className="h-40 w-full rounded-3xl object-cover" />
        <dl className="grid grid-cols-3 gap-2 text-center">
          {[
            [
              t("minPrice"),
              stats.mixed ? t("currencyMixed") : stats.min ? shortAmount(stats.min, statsCurrency) : "—",
            ],
            [t("activeProjects"), String(stats.count)],
            [
              t("avgPrice"),
              stats.mixed ? t("currencyMixed") : stats.avg ? shortAmount(stats.avg, statsCurrency) : "—",
            ],
          ].map(([label, value]) => (
            <div key={label} className="rounded-2xl bg-sand px-2 py-3">
              <dt className="text-[11px] text-mist">{label}</dt>
              <dd className="mt-1 text-sm font-semibold">
                {value}{" "}
                {value === "—" || value === t("currencyMixed") || label === t("activeProjects") || stats.mixed
                  ? ""
                  : moneyUnit(statsCurrency, locale)}
              </dd>
            </div>
          ))}
        </dl>
        <section>
          <h2 className="text-sm font-semibold">{t("about")}</h2>
          {aboutOpen ? (
            <ProseHtml className="mt-1 text-sm leading-7" html={pick(area.about, locale)} />
          ) : (
            <p className="mt-1 line-clamp-4 text-sm leading-7">{pickPlain(area.about, locale)}</p>
          )}
          <button type="button" onClick={onAbout} className="mt-1 text-xs text-palm">
            {aboutOpen ? t("hide") : t("showAll")}
          </button>
        </section>
        <section>
          <h2 className="text-sm font-semibold">{t("projectsTitle")}</h2>
          <ul className="mt-2 space-y-1">
            {projects.map((item) => {
              const developer = atlas.developers.find((entry) => entry.id === item.developerId);
              return (
                <li key={item.id}>
                  <button
                    type="button"
                    onMouseEnter={() => onHover(item.id)}
                    onMouseLeave={() => onHover(null)}
                    onFocus={() => onHover(item.id)}
                    onBlur={() => onHover(null)}
                    onClick={() => onProject(item.id)}
                    className="flex w-full gap-3 rounded-2xl p-2 text-start hover:bg-sand"
                  >
                    <img src={item.image || FALLBACK_IMAGE} alt="" className="h-16 w-20 shrink-0 rounded-xl object-cover" />
                    <span className="min-w-0">
                      <span className="block truncate font-medium">{pick(item.names, locale)}</span>
                      <span className="block truncate text-xs text-mist">
                        {developer ? pick(developer.names, locale) : ""}
                      </span>
                      <span className="mt-1 block text-sm">
                        {shortAmount(item.startPrice, item.currency)} {moneyUnit(item.currency, locale)}
                      </span>
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>
        </section>
      </div>
    </div>
  );
}

function ProjectDetail({
  atlas,
  locale,
  project,
  area,
  beds,
  briefOpen,
  onBeds,
  onBrief,
  onBack,
  onAreas,
}: {
  atlas: Atlas;
  locale: string;
  project: Project;
  area: Area;
  beds: Beds | null;
  briefOpen: boolean;
  onBeds: (beds: Beds) => void;
  onBrief: () => void;
  onBack: () => void;
  onAreas: () => void;
}) {
  const t = useTranslations("desk");
  const city = atlas.cities.find((item) => item.id === area.cityId);
  const developer = atlas.developers.find((item) => item.id === project.developerId);
  const unit = project.units.find((item) => item.beds === beds) ?? project.units[0];
  const currency = project.currency;
  const whatsappDigits = project.whatsapp.replace(/\D/g, "");
  const kind =
    project.kind === "villa" ? t("villa") : project.kind === "townhouse" ? t("townhouse") : t("apartment");
  return (
    <div className="min-h-0 flex-1 overflow-y-auto">
      <header className="sticky top-0 z-10 border-b border-ink/10 bg-foam px-4 py-3">
        <Crumbs
          items={[
            { label: t("areas"), onClick: onAreas },
            ...(city ? [{ label: pick(city.names, locale), onClick: onAreas }] : []),
            { label: pick(area.names, locale), onClick: onBack },
            { label: pick(project.names, locale) },
          ]}
        />
        <h1 className="mt-2 font-display text-2xl leading-tight">{pick(project.names, locale)}</h1>
      </header>
      <div className="space-y-4 p-4">
        <img src={project.image || FALLBACK_IMAGE} alt="" className="h-44 w-full rounded-3xl object-cover" />
        <p className="text-sm text-mist">{developer ? pick(developer.names, locale) : ""}</p>
        <p className="text-sm">
          {city ? pick(city.names, locale) : ""}، {pick(area.names, locale)}
        </p>
        <dl className="grid grid-cols-2 gap-2 text-sm">
          {[
            [t("startPrice"), `${shortAmount(project.startPrice, currency)} ${moneyUnit(currency, locale)}`],
            [t("kind"), kind],
            [t("size"), `${project.sizeMin}–${project.sizeMax} ${t("sqft")}`],
            [t("handover"), project.handover],
            [t("unitCount"), String(project.unitCount)],
          ].map(([label, value]) => (
            <div key={label} className="rounded-2xl bg-sand px-3 py-3">
              <dt className="text-[11px] text-mist">{label}</dt>
              <dd className="mt-1 font-medium">{value}</dd>
            </div>
          ))}
        </dl>
        {project.units.length ? (
          <div className="flex flex-wrap gap-2">
            {project.units.map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => onBeds(item.beds)}
                className={`rounded-full px-3 py-1.5 text-xs ${unit?.id === item.id ? "bg-ink text-paper" : "border border-ink/10"}`}
              >
                {bedLabel(item.beds, t)}
              </button>
            ))}
          </div>
        ) : null}
        {unit ? (
          <p className="rounded-2xl border border-ink/10 px-3 py-3 text-sm">
            {bedLabel(unit.beds, t)} · {t("fromPrice")} {fullAmount(unit.priceFrom, currency, locale)} · {unit.sizeMin}–{unit.sizeMax} {t("sqft")}
          </p>
        ) : null}
        {project.payment.length ? (
          <section>
            <h2 className="text-sm font-semibold">{t("payment")}</h2>
            <ul className="mt-2 space-y-2">
              {project.payment.map((step, index) => (
                <li key={`${step.percent}-${index}`} className="flex items-center justify-between rounded-2xl bg-sand px-3 py-3 text-sm">
                  <span>{pick(step.label, locale)}</span>
                  <span className="font-semibold">{step.percent}%</span>
                </li>
              ))}
            </ul>
          </section>
        ) : null}
        {briefOpen ? <ProseHtml className="text-sm leading-7" html={pick(project.about, locale)} /> : null}
        <div className="grid grid-cols-2 gap-2">
          {whatsappDigits ? (
            <a
              href={`https://wa.me/${whatsappDigits}`}
              target="_blank"
              rel="noreferrer"
              className="rounded-full bg-[#d8f3dc] px-3 py-2 text-center text-sm text-palm-deep"
            >
              {t("whatsapp")}
            </a>
          ) : null}
          {project.phone ? (
            <a href={`tel:${project.phone}`} className="rounded-full bg-[#d8f3dc] px-3 py-2 text-center text-sm text-palm-deep">
              {t("call")}
            </a>
          ) : null}
        </div>
        <button type="button" onClick={onBrief} className="w-full rounded-full border border-palm px-3 py-2 text-sm text-palm">
          {briefOpen ? t("hideDetails") : t("fullDetails")}
        </button>
      </div>
    </div>
  );
}

function SearchPanel({
  atlas,
  locale,
  query,
  onQuery,
  suggestions,
  results,
  onCity,
  onArea,
  onProject,
}: {
  atlas: Atlas;
  locale: string;
  query: string;
  onQuery: (value: string) => void;
  suggestions: Atlas["suggestions"];
  results: { cities: Atlas["cities"]; areas: Area[]; projects: Project[] } | null;
  onCity: (id: string) => void;
  onArea: (id: string) => void;
  onProject: (id: string) => void;
}) {
  const t = useTranslations("desk");
  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <header className="border-b border-ink/10 px-4 py-4">
        <h1 className="font-display text-2xl">{t("search")}</h1>
        <input
          value={query}
          onChange={(event) => onQuery(event.target.value)}
          placeholder={t("searchPlaceholder")}
          className={`${controlClass} mt-3`}
        />
      </header>
      <div className="min-h-0 flex-1 overflow-y-auto p-4">
        {results ? (
          <div className="space-y-4">
            <ResultBlock title={t("cities")}>
              {results.cities.map((city) => (
                <ResultButton key={city.id} label={pick(city.names, locale)} hint={city.country === "om" ? t("oman") : t("emirates")} onClick={() => onCity(city.id)} />
              ))}
            </ResultBlock>
            <ResultBlock title={t("areas")}>
              {results.areas.map((area) => (
                <ResultButton key={area.id} label={pick(area.names, locale)} hint={cityName(atlas, area.cityId, locale)} onClick={() => onArea(area.id)} />
              ))}
            </ResultBlock>
            <ResultBlock title={t("projectsTitle")}>
              {results.projects.map((item) => (
                <ResultButton key={item.id} label={pick(item.names, locale)} hint={areaName(atlas, item.areaId, locale)} onClick={() => onProject(item.id)} />
              ))}
            </ResultBlock>
            {!results.cities.length && !results.areas.length && !results.projects.length ? (
              <p className="text-sm text-mist">{t("noResults")}</p>
            ) : null}
          </div>
        ) : (
          <>
            <h2 className="text-sm font-semibold">{t("suggestions")}</h2>
            <div className="mt-3 grid grid-cols-2 gap-2">
              {suggestions.map((item) => {
                const label =
                  item.kind === "city"
                    ? pick(atlas.cities.find((city) => city.id === item.targetId)?.names ?? { en: item.targetId, ar: "", fa: "" }, locale)
                    : item.kind === "area"
                      ? pick(atlas.areas.find((area) => area.id === item.targetId)?.names ?? { en: item.targetId, ar: "", fa: "" }, locale)
                      : pick(atlas.projects.find((project) => project.id === item.targetId)?.names ?? { en: item.targetId, ar: "", fa: "" }, locale);
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() =>
                      item.kind === "city" ? onCity(item.targetId) : item.kind === "area" ? onArea(item.targetId) : onProject(item.targetId)
                    }
                    className="flex items-center justify-between gap-2 rounded-2xl border border-ink/10 bg-white px-3 py-3 text-start text-sm"
                  >
                    <span className="truncate">{label}</span>
                    <span className="text-mist">{item.kind === "city" ? "⌖" : item.kind === "area" ? "▣" : "⌂"}</span>
                  </button>
                );
              })}
            </div>
          </>
        )}
      </div>
    </div>
  );
}

function DrawPanel({
  atlas,
  locale,
  points,
  closed,
  mode,
  onMode,
  inside,
  onNew,
  onClear,
  onClose,
  onProject,
}: {
  atlas: Atlas;
  locale: string;
  points: number;
  closed: boolean;
  mode: DrawMode;
  onMode: (mode: DrawMode) => void;
  inside: Project[];
  onNew: () => void;
  onClear: () => void;
  onClose: () => void;
  onProject: (id: string) => void;
}) {
  const t = useTranslations("desk");
  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <header className="border-b border-ink/10 px-4 py-4">
        <h1 className="font-display text-2xl">{t("draw")}</h1>
        <p className="mt-2 text-sm leading-7 text-mist">{t("drawHint")}</p>
      </header>
      <div className="space-y-3 overflow-y-auto p-4">
        <div className="grid grid-cols-2 gap-2">
          {(["corner", "smooth", "round", "hand"] as const).map((item) => (
            <button
              key={item}
              type="button"
              onClick={() => onMode(item)}
              className={`rounded-lg px-3 py-2 text-sm ${mode === item ? "bg-palm-deep text-white" : "border border-ink/15 bg-white"}`}
            >
              {t(item === "corner" ? "modeCorner" : item === "smooth" ? "modeSmooth" : item === "round" ? "modeRound" : "modeHand")}
            </button>
          ))}
        </div>
        <button type="button" onClick={onNew} className="w-full rounded-lg bg-ink px-3 py-3 text-sm text-paper">
          {t("drawNew")}
        </button>
        <button type="button" onClick={onClear} className="w-full rounded-2xl border border-ink/15 bg-white px-3 py-3 text-sm">
          {t("clearDraw")}
        </button>
        <button
          type="button"
          onClick={onClose}
          disabled={closed || points < 3}
          className="w-full rounded-2xl border border-ink/15 px-3 py-3 text-sm disabled:opacity-40"
        >
          {t("closeShape")} · {points}
        </button>
        {closed ? (
          <section>
            <h2 className="text-sm font-semibold">
              {t("insideTitle")} · {inside.length}
            </h2>
            {inside.length ? (
              <ul className="mt-2 space-y-2">
                {inside.map((item) => {
                  const home = atlas.areas.find((area) => area.id === item.areaId);
                  const city = atlas.cities.find((entry) => entry.id === home?.cityId);
                  return (
                    <li key={item.id}>
                      <button type="button" onClick={() => onProject(item.id)} className="w-full rounded-2xl bg-sand px-3 py-3 text-start text-sm">
                        <span className="block font-medium">{pick(item.names, locale)}</span>
                        <span className="text-xs text-mist">
                          {home ? pick(home.names, locale) : ""} · {shortAmount(item.startPrice, item.currency)}{" "}
                          {moneyUnit(item.currency, locale)}
                        </span>
                      </button>
                    </li>
                  );
                })}
              </ul>
            ) : (
              <p className="mt-2 text-sm text-mist">{t("nothingInside")}</p>
            )}
          </section>
        ) : null}
      </div>
    </div>
  );
}

function ResultBlock({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section>
      <h2 className="text-xs text-mist">{title}</h2>
      <div className="mt-1 space-y-1">{children}</div>
    </section>
  );
}

function ResultButton({ label, hint, onClick }: { label: string; hint: string; onClick: () => void }) {
  return (
    <button type="button" onClick={onClick} className="flex w-full items-center justify-between rounded-2xl px-2 py-2 text-start hover:bg-sand">
      <span>{label}</span>
      <span className="text-xs text-mist">{hint}</span>
    </button>
  );
}

function cityName(atlas: Atlas, id: string, locale: string) {
  const city = atlas.cities.find((item) => item.id === id);
  return city ? pick(city.names, locale) : "";
}

function areaName(atlas: Atlas, id: string, locale: string) {
  const area = atlas.areas.find((item) => item.id === id);
  return area ? pick(area.names, locale) : "";
}

function bedLabel(beds: Beds, t: (key: "studio" | "bed" | "beds") => string) {
  if (beds === "studio") return t("studio");
  if (beds === "1") return `1 ${t("bed")}`;
  return `${beds} ${t("beds")}`;
}

function SearchIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.8">
      <circle cx="11" cy="11" r="6" />
      <path d="M16 16l4 4" />
    </svg>
  );
}

function AreasIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.8">
      <path d="M4 8h7v12H4zM13 4h7v16h-7z" />
    </svg>
  );
}

function DrawIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.8">
      <path d="M4 16l8-8 4 4-8 8H4z" />
      <path d="M12 8l2-2 4 4-2 2" />
    </svg>
  );
}

function AdminIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.8">
      <rect x="5" y="11" width="14" height="9" rx="1.5" />
      <path d="M8 11V8a4 4 0 0 1 8 0v3" />
    </svg>
  );
}
