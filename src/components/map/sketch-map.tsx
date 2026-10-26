"use client";

import { useEffect, useRef, useState } from "react";
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
import { MapStylePicker } from "@/components/map/map-style-picker";
import { closeRing, type LngLat } from "@/data/atlas";
import { useMapStyle } from "@/lib/hooks/use-map-style";
import { mapStyleUrl } from "@/lib/map-style";
import { circleRing, openRing } from "@/lib/shape";

const empty = { type: "FeatureCollection" as const, features: [] };
const CLOSE_PX = 18;
/** Hide + on edges shorter than this (screen px) so handles do not stack. */
const MIN_EDGE_PX = 52;
/** Cap how many + handles are shown at once. */
const MAX_MIDS = 14;

function mid(a: LngLat, b: LngLat): LngLat {
  return [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2];
}

function ringClosed(ring: LngLat[]) {
  return (
    ring.length >= 4 &&
    ring[0][0] === ring[ring.length - 1][0] &&
    ring[0][1] === ring[ring.length - 1][1]
  );
}

function setSourceData(map: Map, id: string, ring: LngLat[], asPolygon: boolean) {
  (map.getSource(id) as GeoJSONSource | undefined)?.setData({
    type: "FeatureCollection",
    features:
      ring.length >= 2
        ? [
            {
              type: "Feature" as const,
              properties: {},
              geometry: asPolygon
                ? { type: "Polygon" as const, coordinates: [closeRing(ring)] }
                : { type: "LineString" as const, coordinates: ring },
            },
          ]
        : [],
  });
}

export function SketchMap({
  frameKey,
  center,
  zoom,
  ring,
  guideRing = [],
  guideColor = "#6b7c74",
  point,
  mode = "corner",
  editRing = true,
  coach,
  coachStep,
  idleHint,
  drawingHint,
  onClick,
  onCloseNearStart,
  onVertexMove,
  onEdgeInsert,
  onVertexRemove,
  onPointMove,
  onStroke,
}: {
  frameKey: string;
  center: LngLat;
  zoom: number;
  ring: LngLat[];
  /** Parent / context outline (e.g. neighbourhood) — shown muted, not editable. */
  guideRing?: LngLat[];
  guideColor?: string;
  point: LngLat | null;
  mode?: "corner" | "hand" | "round";
  /** When false, the ring is drawn but corners / + handles stay inert (pin-only mode). */
  editRing?: boolean;
  coach?: string;
  coachStep?: string;
  idleHint?: string;
  drawingHint?: string;
  onClick: (lng: number, lat: number) => void;
  onCloseNearStart?: () => void;
  onVertexMove?: (index: number, lng: number, lat: number) => void;
  onEdgeInsert?: (afterIndex: number, lng: number, lat: number) => void;
  onVertexRemove?: (index: number) => void;
  onPointMove?: (lng: number, lat: number) => void;
  onStroke?: (points: LngLat[]) => void;
}) {
  const stroke = mode === "hand";
  const editable = mode === "corner" && editRing;
  const { styleId, setMapStyle } = useMapStyle();
  const frameRefDom = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<Map | null>(null);
  const markersRef = useRef<Marker[]>([]);
  const clickRef = useRef(onClick);
  const closeRef = useRef(onCloseNearStart);
  const vertexRef = useRef(onVertexMove);
  const edgeRef = useRef(onEdgeInsert);
  const removeRef = useRef(onVertexRemove);
  const pointRef = useRef(onPointMove);
  const strokeRef = useRef(onStroke);
  const skipClick = useRef(false);
  const dragging = useRef(false);
  const ringRef = useRef(ring);
  const modeRef = useRef(mode);
  const editRingRef = useRef(editRing);
  const pointRefState = useRef(point);
  const viewRef = useRef({ ring, guideRing, point, center, zoom });
  const [ready, setReady] = useState(false);
  const [drawing, setDrawing] = useState(false);

  useEffect(() => {
    clickRef.current = onClick;
    closeRef.current = onCloseNearStart;
    vertexRef.current = onVertexMove;
    edgeRef.current = onEdgeInsert;
    removeRef.current = onVertexRemove;
    pointRef.current = onPointMove;
    strokeRef.current = onStroke;
    ringRef.current = ring;
    modeRef.current = mode;
    editRingRef.current = editRing;
    pointRefState.current = point;
    viewRef.current = { ring, guideRing, point, center, zoom };
  }, [
    center,
    editRing,
    guideRing,
    mode,
    onClick,
    onCloseNearStart,
    onEdgeInsert,
    onPointMove,
    onStroke,
    onVertexMove,
    onVertexRemove,
    point,
    ring,
    zoom,
  ]);

  useEffect(() => {
    if (!containerRef.current) return;
    setWorkerUrl("/maplibre-gl-worker.mjs");
    const map = new Map({
      container: containerRef.current,
      style: mapStyleUrl(styleId),
      center,
      zoom,
      attributionControl: false,
      dragRotate: false,
      pitchWithRotate: false,
    });
    map.addControl(new NavigationControl({ showCompass: false }), "top-left");
    map.on("load", () => {
      map.addSource("guide", { type: "geojson", data: empty });
      map.addSource("ring", { type: "geojson", data: empty });
      map.addSource("draft", { type: "geojson", data: empty });
      map.addSource("preview", { type: "geojson", data: empty });
      map.addLayer({
        id: "guide-fill",
        type: "fill",
        source: "guide",
        filter: ["==", ["geometry-type"], "Polygon"],
        paint: { "fill-color": guideColor, "fill-opacity": 0.18 },
      });
      map.addLayer({
        id: "guide-line",
        type: "line",
        source: "guide",
        layout: { "line-join": "round", "line-cap": "round" },
        paint: { "line-color": guideColor, "line-width": 2.75, "line-dasharray": [2.4, 1.5] },
      });
      map.addLayer({
        id: "ring-fill",
        type: "fill",
        source: "ring",
        filter: ["==", ["geometry-type"], "Polygon"],
        paint: { "fill-color": "#1e6b45", "fill-opacity": 0.28 },
      });
      map.addLayer({
        id: "ring-line",
        type: "line",
        source: "ring",
        layout: { "line-join": "round", "line-cap": "round" },
        paint: { "line-color": "#0e3324", "line-width": 2.5 },
      });
      map.addLayer({
        id: "draft-line",
        type: "line",
        source: "draft",
        layout: { "line-join": "round", "line-cap": "round" },
        paint: { "line-color": "#1e6b45", "line-width": 3, "line-dasharray": [1.2, 1.2] },
      });
      map.addLayer({
        id: "preview-fill",
        type: "fill",
        source: "preview",
        filter: ["==", ["geometry-type"], "Polygon"],
        paint: { "fill-color": "#e4c27a", "fill-opacity": 0.22 },
      });
      map.addLayer({
        id: "preview-line",
        type: "line",
        source: "preview",
        layout: { "line-join": "round", "line-cap": "round" },
        paint: { "line-color": "#b8892f", "line-width": 2, "line-dasharray": [1.4, 1.2] },
      });
      map.getCanvas().style.cursor = "crosshair";
      map.resize();
      setReady(true);
    });
    map.on("click", (event: MapMouseEvent) => {
      if (skipClick.current || dragging.current || modeRef.current === "hand") return;
      const corners = openRing(ringRef.current);
      if (
        editRingRef.current &&
        modeRef.current === "corner" &&
        !ringClosed(ringRef.current) &&
        corners.length >= 3 &&
        closeRef.current
      ) {
        const first = map.project(corners[0]);
        if (Math.hypot(first.x - event.point.x, first.y - event.point.y) < CLOSE_PX) {
          closeRef.current();
          return;
        }
      }
      clickRef.current(event.lngLat.lng, event.lngLat.lat);
    });
    map.on("mousemove", (event: MapMouseEvent) => {
      if (modeRef.current !== "round" || !pointRefState.current) {
        setSourceData(map, "preview", [], false);
        return;
      }
      const centerPt = pointRefState.current;
      const edge: LngLat = [event.lngLat.lng, event.lngLat.lat];
      const preview = circleRing(centerPt, edge, 48);
      if (preview.length >= 4) setSourceData(map, "preview", preview, true);
    });
    const frame = frameRefDom.current;
    const observer = new ResizeObserver(() => map.resize());
    if (frame) observer.observe(frame);
    mapRef.current = map;
    return () => {
      observer.disconnect();
      markersRef.current.forEach((marker) => marker.remove());
      map.remove();
      mapRef.current = null;
      setReady(false);
    };
    // Recreate when basemap theme changes; other props sync via later effects.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [styleId]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !ready) return;
    setSourceData(map, "guide", guideRing, ringClosed(guideRing) || openRing(guideRing).length >= 3);
    setSourceData(map, "ring", ring, ringClosed(ring));
    if (mode !== "round") setSourceData(map, "preview", [], false);
    if (map.getLayer("guide-fill")) {
      map.setPaintProperty("guide-fill", "fill-color", guideColor);
    }
    if (map.getLayer("guide-line")) {
      map.setPaintProperty("guide-line", "line-color", guideColor);
    }
  }, [guideColor, guideRing, mode, ready, ring]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !ready) return;
    const id = window.requestAnimationFrame(() => map.resize());
    return () => window.cancelAnimationFrame(id);
  }, [mode, ready]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !ready) return;
    const live = map;

    function clearMarkers() {
      markersRef.current.forEach((marker) => marker.remove());
      markersRef.current = [];
    }

    function eligibleMids(corners: LngLat[], closed: boolean) {
      const edgeCount = closed ? corners.length : Math.max(0, corners.length - 1);
      const candidates: { afterIndex: number; coord: LngLat; len: number }[] = [];
      for (let index = 0; index < edgeCount; index += 1) {
        const a = corners[index];
        const b = corners[(index + 1) % corners.length];
        const pa = live.project(a);
        const pb = live.project(b);
        const len = Math.hypot(pa.x - pb.x, pa.y - pb.y);
        if (len < MIN_EDGE_PX) continue;
        candidates.push({ afterIndex: index, coord: mid(a, b), len });
      }
      candidates.sort((left, right) => right.len - left.len);
      // Drop mids that would sit too close to another mid in screen space.
      const kept: typeof candidates = [];
      for (const item of candidates) {
        const px = live.project(item.coord);
        const crowded = kept.some((other) => {
          const otherPx = live.project(other.coord);
          return Math.hypot(px.x - otherPx.x, px.y - otherPx.y) < 28;
        });
        if (crowded) continue;
        kept.push(item);
        if (kept.length >= MAX_MIDS) break;
      }
      return kept;
    }

    function paintMarkers() {
      if (dragging.current) return;
      clearMarkers();

      if (mode === "round" && point) {
        const element = document.createElement("div");
        element.className =
          "grid h-9 w-9 place-items-center rounded-full border-2 border-[#b8892f] bg-[#e4c27a] text-xs font-bold text-palm-deep shadow-lg";
        element.innerHTML = `<span>1</span>`;
        markersRef.current.push(new Marker({ element, anchor: "center" }).setLngLat(point).addTo(live));
        return;
      }

      if (!editRing && point && !stroke) {
        const element = document.createElement("button");
        element.type = "button";
        element.className =
          "grid h-8 w-8 cursor-grab place-items-center rounded-full border-2 border-palm-deep bg-white text-[11px] font-bold text-palm-deep shadow-md active:cursor-grabbing";
        element.textContent = "•";
        const marker = new Marker({ element, anchor: "center", draggable: Boolean(pointRef.current) })
          .setLngLat(point)
          .addTo(live);
        marker.on("dragstart", () => {
          dragging.current = true;
          skipClick.current = true;
        });
        marker.on("dragend", () => {
          const next = marker.getLngLat();
          pointRef.current?.(next.lng, next.lat);
          window.setTimeout(() => {
            dragging.current = false;
            skipClick.current = false;
          }, 0);
        });
        markersRef.current.push(marker);
        return;
      }

      if (!editable || stroke) return;

      const corners = openRing(ringRef.current);
      const closed = ringClosed(ringRef.current);
      const canClose = !closed && corners.length >= 3;

      corners.forEach((coord, index) => {
        const element = document.createElement("button");
        element.type = "button";
        element.textContent = String(index + 1);
        // Never apply CSS transform/scale on marker roots — MapLibre uses transform for placement.
        element.className = `grid h-7 w-7 cursor-grab place-items-center rounded-full border-2 bg-white text-[11px] font-semibold text-[#1a1714] shadow transition-colors active:cursor-grabbing ${
          index === 0 && canClose
            ? "border-[#e4c27a] ring-2 ring-[#e4c27a]/55 hover:bg-[#fff8e8]"
            : "border-[#0e3324] hover:bg-[#f3f7f4]"
        }`;
        const marker = new Marker({ element, anchor: "center", draggable: true })
          .setLngLat(coord)
          .addTo(live);
        element.addEventListener("click", (event) => {
          event.stopPropagation();
          if (index === 0 && canClose) closeRef.current?.();
        });
        element.addEventListener("dblclick", (event) => {
          event.preventDefault();
          event.stopPropagation();
          if (corners.length <= 3) return;
          removeRef.current?.(index);
        });
        marker.on("dragstart", () => {
          dragging.current = true;
          skipClick.current = true;
        });
        marker.on("drag", () => {
          const next = marker.getLngLat();
          const preview = openRing(ringRef.current);
          if (!preview[index]) return;
          preview[index] = [next.lng, next.lat];
          setSourceData(
            live,
            "ring",
            ringClosed(ringRef.current) ? closeRing(preview) : preview,
            ringClosed(ringRef.current),
          );
        });
        marker.on("dragend", () => {
          const next = marker.getLngLat();
          vertexRef.current?.(index, next.lng, next.lat);
          window.setTimeout(() => {
            dragging.current = false;
            skipClick.current = false;
            paintMarkers();
          }, 0);
        });
        markersRef.current.push(marker);
      });

      // + is click-only and only on long, non-crowded edges — prevents tangled control.
      for (const item of eligibleMids(corners, closed)) {
        const element = document.createElement("button");
        element.type = "button";
        element.setAttribute("aria-label", "Add point on this side");
        element.className =
          "grid h-6 w-6 cursor-pointer place-items-center rounded-full border-2 border-palm bg-[#e7f2ec] text-sm font-bold leading-none text-palm-deep shadow-md transition-colors hover:bg-white hover:border-palm-deep";
        element.textContent = "+";
        const marker = new Marker({ element, anchor: "center", draggable: false })
          .setLngLat(item.coord)
          .addTo(live);
        element.addEventListener("click", (event) => {
          event.stopPropagation();
          skipClick.current = true;
          edgeRef.current?.(item.afterIndex, item.coord[0], item.coord[1]);
          window.setTimeout(() => {
            skipClick.current = false;
          }, 0);
        });
        markersRef.current.push(marker);
      }
    }

    paintMarkers();
    const refresh = () => paintMarkers();
    live.on("zoomend", refresh);
    live.on("moveend", refresh);
    return () => {
      live.off("zoomend", refresh);
      live.off("moveend", refresh);
      clearMarkers();
    };
  }, [editRing, editable, mode, point, ready, ring, stroke]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !ready) return;
    const framed = viewRef.current;
    // Always include the neighbourhood guide when present so changing area
    // actually reveals that boundary instead of staying locked on an old plot.
    const focus = [...openRing(framed.guideRing), ...openRing(framed.ring)];
    if (framed.point) focus.push(framed.point);
    if (focus.length >= 2) {
      const bounds = new LngLatBounds(focus[0], focus[0]);
      focus.forEach((coord) => bounds.extend(coord));
      map.fitBounds(bounds, { padding: 72, maxZoom: 15, duration: 650 });
      return;
    }
    if (focus.length === 1) {
      map.flyTo({ center: focus[0], zoom: framed.zoom, duration: 500 });
      return;
    }
    map.flyTo({ center: framed.center, zoom: framed.zoom, duration: 500 });
  }, [frameKey, ready]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !ready) return;
    if (!stroke) {
      setSourceData(map, "draft", [], false);
      map.dragPan.enable();
      map.getCanvas().style.cursor = mode === "round" ? "crosshair" : "crosshair";
      setDrawing(false);
      return;
    }

    let active = false;
    let trail: LngLat[] = [];
    map.getCanvas().style.cursor = "crosshair";

    const start = (event: MapMouseEvent) => {
      if (event.originalEvent.button !== 0) return;
      active = true;
      setDrawing(true);
      trail = [[event.lngLat.lng, event.lngLat.lat]];
      map.dragPan.disable();
      setSourceData(map, "draft", trail, false);
    };
    const move = (event: MapMouseEvent) => {
      if (!active) return;
      const next: LngLat = [event.lngLat.lng, event.lngLat.lat];
      const last = trail[trail.length - 1];
      if (!last || Math.hypot(last[0] - next[0], last[1] - next[1]) > 0.00005) {
        trail.push(next);
        setSourceData(map, "draft", trail, false);
      }
    };
    const finish = () => {
      if (!active) return;
      active = false;
      setDrawing(false);
      map.dragPan.enable();
      setSourceData(map, "draft", [], false);
      if (trail.length >= 3) strokeRef.current?.(trail);
      trail = [];
    };

    map.on("mousedown", start);
    map.on("mousemove", move);
    map.on("mouseup", finish);
    window.addEventListener("mouseup", finish);
    return () => {
      map.off("mousedown", start);
      map.off("mousemove", move);
      map.off("mouseup", finish);
      window.removeEventListener("mouseup", finish);
      map.dragPan.enable();
      setSourceData(map, "draft", [], false);
      setDrawing(false);
    };
  }, [mode, ready, stroke]);

  const modeTone =
    mode === "hand" ? "bg-palm-deep text-[#e7f2ec]" : mode === "round" ? "bg-[#e4c27a] text-palm-deep" : "bg-white/95 text-ink";

  return (
    <div
      ref={frameRefDom}
      className={`sketch-map-frame relative isolate h-full min-h-[32rem] w-full overflow-hidden rounded-[1.75rem] bg-[#e7e1d6] ${
        mode === "hand" ? "outline outline-2 outline-offset-[-2px] outline-palm/40" : ""
      } ${mode === "round" ? "outline outline-2 outline-offset-[-2px] outline-[#e4c27a]/70" : ""}`}
    >
      <div ref={containerRef} className="absolute inset-0 h-full w-full" />
      <MapStylePicker
        value={styleId}
        onChange={setMapStyle}
        compact
        className="absolute end-3 bottom-3 z-30"
      />
      {coach ? (
        <div className="pointer-events-none absolute inset-x-3 top-3 z-20 flex justify-center">
          <div
            className={`max-w-[min(100%,28rem)] rounded-2xl px-4 py-3 text-center shadow-[0_12px_28px_-18px_rgba(6,36,33,0.55)] ring-1 ring-black/5 ${modeTone}`}
          >
            <p className="text-sm font-semibold leading-6">{coach}</p>
            {coachStep ? <p className="mt-1 text-xs leading-5 opacity-85">{coachStep}</p> : null}
            {mode === "hand" && drawing && drawingHint ? (
              <p className="mt-1 text-xs font-medium text-[#e4c27a]">{drawingHint}</p>
            ) : null}
          </div>
        </div>
      ) : null}
      {mode === "hand" && !drawing && idleHint ? (
        <div className="pointer-events-none absolute inset-0 z-10 grid place-items-center">
          <div className="rounded-full border border-dashed border-white/50 bg-palm-deep/55 px-5 py-3 text-sm text-[#e7f2ec] backdrop-blur-[2px]">
            {idleHint}
          </div>
        </div>
      ) : null}
    </div>
  );
}
