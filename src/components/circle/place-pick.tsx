"use client";

import { useEffect, useRef, useState } from "react";
import { Map, Marker, type GeoJSONSource, setWorkerUrl } from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import { mapStyleUrl } from "@/lib/map-style";
import { centroid, inCountry, ringHolds, type CirclePlace, type LngLat, type MapCountry } from "@/lib/circle/place";

const VIEW: Record<MapCountry, { center: [number, number]; zoom: number }> = {
  ae: { center: [55.27, 25.2], zoom: 8 },
  om: { center: [57.6, 22.2], zoom: 6 },
};

function close(points: LngLat[]) {
  const first = points[0];
  const last = points[points.length - 1];
  if (first[0] === last[0] && first[1] === last[1]) return points;
  return [...points, first];
}

function fit(map: Map, ring: LngLat[]) {
  let minLng = ring[0][0];
  let maxLng = ring[0][0];
  let minLat = ring[0][1];
  let maxLat = ring[0][1];
  for (const [lng, lat] of ring) {
    minLng = Math.min(minLng, lng);
    maxLng = Math.max(maxLng, lng);
    minLat = Math.min(minLat, lat);
    maxLat = Math.max(maxLat, lat);
  }
  map.fitBounds(
    [
      [minLng, minLat],
      [maxLng, maxLat],
    ],
    { padding: 32, duration: 0 },
  );
}

function project(map: Map, points: LngLat[]) {
  return points
    .map((point) => {
      const px = map.project(point);
      return `${px.x.toFixed(1)},${px.y.toFixed(1)}`;
    })
    .join(" ");
}

export function PlacePick({
  country,
  mode = "point",
  place = null,
  boundary,
  onPlace,
  closeLabel,
  clearLabel,
  progress,
  outsideLabel,
}: {
  country: MapCountry;
  mode?: "point" | "range";
  place?: CirclePlace | null;
  boundary?: LngLat[];
  onPlace: (place: CirclePlace | null) => void;
  closeLabel?: string;
  clearLabel?: string;
  progress?: (count: number) => string;
  outsideLabel?: string;
}) {
  const node = useRef<HTMLDivElement>(null);
  const mapRef = useRef<Map | null>(null);
  const marks = useRef<Marker[]>([]);
  const countryRef = useRef(country);
  const modeRef = useRef(mode);
  const placeRef = useRef(place);
  const boundaryRef = useRef(boundary);
  const cornersRef = useRef<LngLat[]>([]);
  const onPlaceRef = useRef(onPlace);
  const drawRef = useRef<() => void>(() => {});
  const [corners, setCorners] = useState<LngLat[]>([]);
  const [outside, setOutside] = useState(false);
  const [yard, setYard] = useState("");
  const [outline, setOutline] = useState("");
  const [closedShape, setClosedShape] = useState(false);
  const [frame, setFrame] = useState({ w: 1, h: 1 });
  countryRef.current = country;
  modeRef.current = mode;
  placeRef.current = place;
  boundaryRef.current = boundary;
  cornersRef.current = corners;
  onPlaceRef.current = onPlace;

  useEffect(() => {
    const container = node.current;
    if (!container || mapRef.current) return;
    setWorkerUrl("/maplibre-gl-worker.mjs");
    const view = VIEW[countryRef.current];
    const yard = boundaryRef.current;
    const start = yard && yard.length >= 3 ? centroid(close(yard)) : view.center;
    const map = new Map({
      container,
      style: mapStyleUrl("muted"),
      center: start,
      zoom: yard && yard.length >= 3 ? 13 : view.zoom,
      attributionControl: false,
    });
    mapRef.current = map;
    let framed = false;
    const frameYard = () => {
      const yardRing = boundaryRef.current;
      const box = container.getBoundingClientRect();
      if (!yardRing || yardRing.length < 3 || box.width < 20 || box.height < 20) return;
      fit(map, yardRing);
      framed = true;
    };
    const arm = () => {
      if (map.getSource("draw")) return;
      map.addSource("draw", { type: "geojson", data: { type: "FeatureCollection", features: [] } });
      map.addLayer({
        id: "draw-fill",
        type: "fill",
        source: "draw",
        paint: { "fill-color": "#0f7a72", "fill-opacity": 0.28 },
      });
      map.addLayer({
        id: "draw-line",
        type: "line",
        source: "draw",
        layout: { "line-join": "round", "line-cap": "round" },
        paint: { "line-color": "#062421", "line-width": 3 },
      });
      const yardRing = boundaryRef.current;
      if (yardRing && yardRing.length >= 3) {
        const closed = close(yardRing);
        map.addSource("yard", {
          type: "geojson",
          data: {
            type: "Feature",
            properties: {},
            geometry: { type: "Polygon", coordinates: [closed] },
          },
        });
        map.addLayer(
          {
            id: "yard-fill",
            type: "fill",
            source: "yard",
            paint: { "fill-color": "#e4c27a", "fill-opacity": 0.28 },
          },
          "draw-fill",
        );
        map.addLayer(
          {
            id: "yard-line",
            type: "line",
            source: "yard",
            paint: { "line-color": "#8a6a32", "line-width": 2 },
          },
          "draw-fill",
        );
        frameYard();
      }
    };
    const drawOverlay = () => {
      const box = container.getBoundingClientRect();
      setFrame((prev) => (prev.w === box.width && prev.h === box.height ? prev : { w: box.width, h: box.height }));
      const limit = boundaryRef.current;
      const yardLine = limit && limit.length >= 2 ? project(map, limit) : "";
      setYard((prev) => (prev === yardLine ? prev : yardLine));
      const current = placeRef.current;
      const pts = current?.kind === "range" && current.ring
        ? current.ring.slice(0, -1)
        : cornersRef.current;
      const next = pts.length >= 2 ? project(map, pts) : "";
      setOutline((prev) => (prev === next ? prev : next));
      setClosedShape(current?.kind === "range");
    };
    drawRef.current = drawOverlay;
    map.on("load", arm);
    map.on("move", drawOverlay);
    map.on("click", (event) => {
      const next: LngLat = [event.lngLat.lng, event.lngLat.lat];
      const land = countryRef.current;
      if (!inCountry(land, next)) return;
      const limit = boundaryRef.current;
      if (limit && limit.length >= 3 && !ringHolds(limit, next)) {
        setOutside(true);
        return;
      }
      setOutside(false);
      if (modeRef.current === "point") {
        onPlaceRef.current({ kind: "point", country: land, point: next });
        return;
      }
      if (placeRef.current?.kind === "range") return;
      setCorners((points) => (points.length >= 12 ? points : [...points, next]));
    });
    const observer = new ResizeObserver(() => {
      map.resize();
      if (!framed) frameYard();
      drawOverlay();
    });
    observer.observe(container);
    return () => {
      observer.disconnect();
      marks.current.forEach((mark) => mark.remove());
      marks.current = [];
      map.remove();
      mapRef.current = null;
    };
  }, []);

  useEffect(() => {
    setCorners([]);
    setOutside(false);
  }, [country, mode]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    const go = () => {
      const yardRing = boundaryRef.current;
      if (yardRing && yardRing.length >= 3) {
        const box = map.getContainer().getBoundingClientRect();
        if (box.width >= 20 && box.height >= 20) fit(map, yardRing);
        return;
      }
      const view = VIEW[country];
      map.easeTo({ center: view.center, zoom: view.zoom, duration: 400 });
    };
    if (map.isStyleLoaded()) go();
    else map.once("load", go);
  }, [country]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    marks.current.forEach((mark) => mark.remove());
    marks.current = [];
    const dots = place?.kind === "point" ? [place.point] : place?.kind === "range" && place.ring ? place.ring.slice(0, -1) : corners;
    for (const point of dots) {
      marks.current.push(new Marker({ color: "#0f7a72" }).setLngLat(point).addTo(map));
    }
    const paint = () => {
      const source = map.getSource("draw") as GeoJSONSource | undefined;
      if (!source) return;
      const closed = place?.kind === "range" && place.ring ? place.ring : null;
      const line = corners.length >= 2 ? corners : [];
      const features = closed
        ? [{ type: "Feature" as const, properties: {}, geometry: { type: "Polygon" as const, coordinates: [closed] } }]
        : line.length
          ? [{ type: "Feature" as const, properties: {}, geometry: { type: "LineString" as const, coordinates: line } }]
          : [];
      source.setData({ type: "FeatureCollection", features });
    };
    if (map.isStyleLoaded() && map.getSource("draw")) paint();
    else map.once("idle", paint);
    drawRef.current();
  }, [corners, place]);

  function finish() {
    if (corners.length < 3) return;
    const ring = close(corners);
    onPlace({ kind: "range", country, point: centroid(ring), ring });
    setCorners([]);
  }

  return (
    <div>
      <div className="c-pick-frame">
        <div ref={node} className={mode === "range" ? "c-pick is-range" : "c-pick"} />
        {yard || outline ? (
          <svg className="c-pick-draw" viewBox={`0 0 ${frame.w} ${frame.h}`}>
            {yard ? <polygon className="is-yard" points={yard} /> : null}
            {outline ? (closedShape ? <polygon points={outline} /> : <polyline points={outline} />) : null}
          </svg>
        ) : null}
      </div>
      {mode === "range" && !closedShape && progress ? <p className="c-meta mt-2">{progress(corners.length)}</p> : null}
      {outside && outsideLabel ? <p className="c-ember mt-1 text-sm leading-6">{outsideLabel}</p> : null}
      {mode === "range" ? (
        <div className="mt-2 flex gap-2">
          <button type="button" className="c-pill c-press h-11 flex-1 text-sm" disabled={corners.length < 3} onClick={finish}>
            {closeLabel}
          </button>
          <button
            type="button"
            className="c-quiet c-press h-11 px-4 text-sm"
            disabled={!place && corners.length === 0}
            onClick={() => {
              setCorners([]);
              onPlace(null);
            }}
          >
            {clearLabel}
          </button>
        </div>
      ) : null}
    </div>
  );
}
