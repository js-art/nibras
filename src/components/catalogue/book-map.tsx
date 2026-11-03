"use client";

import { useEffect, useRef, useState } from "react";
import { Map, Marker, NavigationControl, setWorkerUrl } from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import { FALLBACK_IMAGE, pick, shortAmount, type Project } from "@/data/atlas";
import { useMapStyle } from "@/lib/hooks/use-map-style";
import { mapStyleUrl } from "@/lib/map-style";
import { Link } from "@/i18n/navigation";

export type MapPin = {
  project: Project;
  label: string;
  place: string;
  price: string;
  meta: string;
};

export function BookMap({
  pins,
  locale,
  selectedId,
  onSelect,
  inView,
  closeLabel,
  prevLabel,
  nextLabel,
  readLabel,
  className = "",
}: {
  pins: MapPin[];
  locale: string;
  selectedId: string | null;
  onSelect: (id: string | null) => void;
  inView: (count: number) => string;
  closeLabel: string;
  prevLabel: string;
  nextLabel: string;
  readLabel: string;
  className?: string;
}) {
  const { styleId } = useMapStyle();
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<Map | null>(null);
  const markersRef = useRef<Marker[]>([]);
  const onSelectRef = useRef(onSelect);
  onSelectRef.current = onSelect;

  useEffect(() => {
    const container = containerRef.current;
    if (!container || mapRef.current) return;
    setWorkerUrl("/maplibre-gl-worker.mjs");
    const map = new Map({
      container,
      style: mapStyleUrl(styleId),
      center: [55.27, 25.15],
      zoom: 10.4,
      attributionControl: false,
    });
    map.addControl(new NavigationControl({ showCompass: false }), "top-right");
    mapRef.current = map;
    const resize = () => map.resize();
    const observer = new ResizeObserver(resize);
    observer.observe(container);
    map.on("load", resize);
    requestAnimationFrame(resize);
    return () => {
      observer.disconnect();
      markersRef.current.forEach((marker) => marker.remove());
      markersRef.current = [];
      map.remove();
      mapRef.current = null;
    };
    // The basemap is chosen once, from the saved map style.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const pinKey = pins.map((pin) => pin.project.id).join("|");
  const [visible, setVisible] = useState(pins.length);

  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    const count = () => {
      try {
        const bounds = map.getBounds();
        setVisible(pins.filter((pin) => bounds.contains(pin.project.point)).length);
      } catch {
        /* style not ready */
      }
    };
    map.on("moveend", count);
    map.on("load", count);
    count();
    return () => {
      map.off("moveend", count);
      map.off("load", count);
    };
  }, [pins]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !pins.length) return;
    const frame = () => focusMap(map, pins);
    if (map.isStyleLoaded()) frame();
    else map.once("load", frame);
    // Refit when the filtered set changes, not when a pin is selected.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pinKey]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    const draw = () => {
      markersRef.current.forEach((marker) => marker.remove());
      markersRef.current = pins.map((pin) => {
        const active = pin.project.id === selectedId;
        const button = document.createElement("button");
        button.type = "button";
        button.textContent = pin.price;
        button.setAttribute("aria-pressed", active ? "true" : "false");
        button.className = active
          ? "relative z-10 cursor-pointer rounded-full border-0 bg-palm-deep px-2.5 py-1.5 text-xs font-semibold whitespace-nowrap text-[#e7f2ec] shadow-[0_12px_28px_-16px_rgba(7,31,22,0.55)]"
          : "cursor-pointer rounded-full border-0 bg-white px-2.5 py-1.5 text-xs font-semibold whitespace-nowrap text-palm-deep shadow-[0_12px_28px_-16px_rgba(7,31,22,0.55)]";
        button.addEventListener("click", (event) => {
          event.stopPropagation();
          onSelectRef.current(pin.project.id);
        });
        return new Marker({ element: button, anchor: "center" }).setLngLat(pin.project.point).addTo(map);
      });
    };
    if (map.isStyleLoaded()) draw();
    else map.once("load", draw);
  }, [pins, selectedId]);

  useEffect(() => {
    const map = mapRef.current;
    const pin = pins.find((item) => item.project.id === selectedId);
    if (!map || !pin) return;
    const go = () =>
      map.easeTo({
        center: pin.project.point,
        zoom: Math.max(map.getZoom(), 12),
        padding: { top: 56, bottom: 148, left: 48, right: 72 },
        duration: 450,
      });
    if (map.isStyleLoaded()) go();
    else map.once("load", go);
  }, [pins, selectedId]);

  const index = pins.findIndex((pin) => pin.project.id === selectedId);
  const selected = index >= 0 ? pins[index] : null;

  function step(dir: number) {
    if (!pins.length) return;
    const next = index < 0 ? 0 : (index + dir + pins.length) % pins.length;
    onSelect(pins[next].project.id);
  }

  return (
    <div className={`relative h-full min-h-80 overflow-hidden bg-[#e7efe9] ${className}`}>
      <div ref={containerRef} className="absolute inset-0 h-full w-full" />
      <p className="pointer-events-none absolute start-3 top-3 rounded-lg bg-white/95 px-3 py-2 text-xs font-medium text-palm-deep shadow-[0_12px_28px_-20px_rgba(7,31,22,0.45)] rtl:start-auto rtl:end-3">
        {inView(visible)}
      </p>
      {selected ? (
        <div className="absolute inset-x-3 bottom-3 z-10 flex justify-start">
          <article className="flex w-full max-w-xl gap-3 rounded-lg bg-white p-2.5 shadow-[0_12px_28px_-16px_rgba(7,31,22,0.55)]">
            <img
              src={selected.project.image || FALLBACK_IMAGE}
              alt=""
              className="h-[5.5rem] w-[7.25rem] shrink-0 rounded-lg object-cover"
            />
            <div className="flex min-w-0 flex-1 flex-col justify-center">
              <div className="flex items-start gap-2">
                <h3 className="min-w-0 flex-1 truncate font-display text-base leading-snug text-palm-deep">
                  {pick(selected.project.names, locale)}
                </h3>
                <button
                  type="button"
                  className="grid size-8 shrink-0 place-items-center rounded-lg text-palm-deep hover:bg-[#e7f2ec]"
                  aria-label={closeLabel}
                  onClick={() => onSelect(null)}
                >
                  <CloseIcon />
                </button>
              </div>
              <p className="truncate text-sm text-mist">{selected.place}</p>
              <p className="flex min-w-0 items-baseline gap-1.5 text-sm text-ink">
                <bdi className="shrink-0">{selected.price}</bdi>
                {selected.meta ? (
                  <>
                    <span className="text-mist" aria-hidden="true">
                      ·
                    </span>
                    <bdi className="truncate">{selected.meta}</bdi>
                  </>
                ) : null}
              </p>
              <div className="mt-1 flex items-center gap-2">
                <Link
                  locale={locale}
                  href={`/projects/${selected.project.id}`}
                  className="inline-flex h-8 items-center rounded-lg bg-[#e7f2ec] px-3 text-sm font-medium text-palm-deep"
                >
                  {readLabel}
                </Link>
                <span className="ms-auto flex gap-1">
                  <button
                    type="button"
                    className="grid size-8 place-items-center rounded-lg text-palm-deep hover:bg-[#e7f2ec]"
                    aria-label={prevLabel}
                    onClick={() => step(-1)}
                  >
                    <Chevron dir="prev" />
                  </button>
                  <button
                    type="button"
                    className="grid size-8 place-items-center rounded-lg text-palm-deep hover:bg-[#e7f2ec]"
                    aria-label={nextLabel}
                    onClick={() => step(1)}
                  >
                    <Chevron dir="next" />
                  </button>
                </span>
              </div>
            </div>
          </article>
        </div>
      ) : null}
    </div>
  );
}

function Chevron({ dir }: { dir: "prev" | "next" }) {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 16 16"
      aria-hidden="true"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      className={dir === "prev" ? "rtl:-scale-x-100" : "-scale-x-100 rtl:scale-x-100"}
    >
      <path d="M10 3.5 5.5 8 10 12.5" />
    </svg>
  );
}

function CloseIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 14 14" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="1.6">
      <path d="M3 3l8 8M11 3 3 11" />
    </svg>
  );
}

function focusMap(map: Map, pins: MapPin[]) {
  let west = pins[0].project.point[0];
  let east = west;
  let south = pins[0].project.point[1];
  let north = south;
  for (const pin of pins) {
    west = Math.min(west, pin.project.point[0]);
    east = Math.max(east, pin.project.point[0]);
    south = Math.min(south, pin.project.point[1]);
    north = Math.max(north, pin.project.point[1]);
  }
  const sprawling = east - west > 1.4 || north - south > 1.1;
  if (pins.length > 1 && sprawling) {
    map.easeTo({ center: [55.27, 25.18], zoom: 10.8, duration: 500 });
    return;
  }
  map.fitBounds(
    [
      [west, south],
      [east, north],
    ],
    { padding: 72, maxZoom: pins.length === 1 ? 13 : 12, duration: 500 },
  );
}

export function pinPrice(project: Project, ask: string) {
  if (project.startPrice <= 0) return ask;
  return `${shortAmount(project.startPrice, project.currency)} ${project.currency}`;
}
