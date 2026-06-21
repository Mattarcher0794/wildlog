import { useEffect, useRef } from "react";
import maplibregl from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";

import type { DbSighting } from "@/lib/sightings.functions";

const TILE_STYLE = {
  version: 8,
  sources: {
    carto: {
      type: "raster",
      tiles: [
        "https://a.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}@2x.png",
        "https://b.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}@2x.png",
        "https://c.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}@2x.png",
      ],
      tileSize: 256,
      attribution:
        '© <a href="https://carto.com/attributions">CARTO</a> © OpenStreetMap contributors',
    },
  },
  layers: [
    {
      id: "carto-tiles",
      type: "raster",
      source: "carto",
      minzoom: 0,
      maxzoom: 20,
    },
  ],
} as const;

export function SightingsMap({
  sightings,
  onSelect,
}: {
  sightings: DbSighting[];
  onSelect?: (s: DbSighting) => void;
}) {
  const mapContainer = useRef<HTMLDivElement>(null);
  const mapRef = useRef<maplibregl.Map | null>(null);
  const onSelectRef = useRef(onSelect);
  onSelectRef.current = onSelect;

  useEffect(() => {
    if (!mapContainer.current || mapRef.current) return;

    const located = sightings.filter(
      (s) => s.lat != null && s.lng != null,
    ) as (DbSighting & { lat: number; lng: number })[];

    const map = new maplibregl.Map({
      container: mapContainer.current,
      style: TILE_STYLE as unknown as maplibregl.StyleSpecification,
      center: located.length
        ? [located[0].lng, located[0].lat]
        : [-1.5, 52.5], // fallback: UK center
      zoom: located.length ? 10 : 5,
      attributionControl: { compact: true },
    });

    mapRef.current = map;

    map.on("load", () => {
      map.resize();
      if (located.length === 0) return;

      const bounds = new maplibregl.LngLatBounds();
      located.forEach((s) => bounds.extend([s.lng, s.lat]));
      map.fitBounds(bounds, { padding: 60, maxZoom: 14, duration: 0 });

      located.forEach((s) => {
        const el = document.createElement("button");
        el.type = "button";
        el.setAttribute("aria-label", s.common_name);
        el.style.cssText = `
          width: 48px;
          height: 48px;
          border-radius: 9999px;
          border: 3px solid white;
          box-shadow: 0 2px 8px rgba(0,0,0,0.25);
          background-color: var(--moss-light, #cdd9b5);
          background-size: cover;
          background-position: center;
          cursor: pointer;
          padding: 0;
        `;
        if (s.image_url) {
          el.style.backgroundImage = `url('${s.image_url}')`;
        }
        el.addEventListener("click", (e) => {
          e.stopPropagation();
          onSelectRef.current?.(s);
        });

        new maplibregl.Marker({ element: el })
          .setLngLat([s.lng, s.lat])
          .addTo(map);
      });
    });

    return () => {
      map.remove();
      mapRef.current = null;
    };
  }, [sightings]);

  return (
    <div
      ref={mapContainer}
      className="h-full w-full overflow-hidden rounded-3xl"
    />
  );
}
