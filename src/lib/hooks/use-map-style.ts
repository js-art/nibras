"use client";

import { useCallback, useEffect, useState } from "react";
import {
  DEFAULT_MAP_STYLE,
  isMapStyleId,
  readMapStyle,
  writeMapStyle,
  type MapStyleId,
} from "@/lib/map-style";

const STORAGE_KEY = "nibras.mapStyle";

export function useMapStyle() {
  const [styleId, setStyleId] = useState<MapStyleId>(DEFAULT_MAP_STYLE);

  useEffect(() => {
    setStyleId(readMapStyle());
    function onStorage(event: StorageEvent) {
      if (event.key !== STORAGE_KEY) return;
      setStyleId(isMapStyleId(event.newValue) ? event.newValue : DEFAULT_MAP_STYLE);
    }
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);

  const setMapStyle = useCallback((id: MapStyleId) => {
    writeMapStyle(id);
    setStyleId(id);
  }, []);

  return { styleId, setMapStyle };
}
