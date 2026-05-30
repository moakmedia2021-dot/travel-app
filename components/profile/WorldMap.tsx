"use client";

import { useState } from "react";
import { ComposableMap, Geographies, Geography } from "react-simple-maps";
import { ISO_N3_TO_A3 } from "@/lib/isoNumericToAlpha3";
import { NAME_TO_A3, normalizeCountryName } from "@/lib/countries";

const GEO_URL =
  "https://cdn.jsdelivr.net/npm/world-atlas@2.0.2/countries-110m.json";

type Props = {
  visited: string[]; // ISO alpha-3 codes
  height?: number;
  /** When provided, countries become clickable and toggle in/out of `visited`. */
  onToggle?: (a3: string) => void;
};

type GeoLike = { id?: string | number; properties?: { name?: string } };

// Resolve a map feature to our alpha-3 code + display name. Primary lookup is
// the ISO numeric id; we fall back to the country name so features without a
// numeric id (e.g. Kosovo) still resolve.
function resolve(geo: GeoLike): { a3: string | null; name: string } {
  const name = geo.properties?.name ?? "";
  if (geo.id != null) {
    const id3 = String(geo.id).padStart(3, "0");
    if (ISO_N3_TO_A3[id3]) return { a3: ISO_N3_TO_A3[id3], name };
  }
  const byName = NAME_TO_A3[normalizeCountryName(name)];
  return { a3: byName ?? null, name };
}

export default function WorldMap({ visited, height = 280, onToggle }: Props) {
  const visitedSet = new Set(visited);
  const interactive = typeof onToggle === "function";
  const [hovered, setHovered] = useState<string | null>(null);

  return (
    <div
      className="relative overflow-hidden rounded-lg border border-neutral-200 bg-neutral-50"
      style={{ height }}
    >
      {interactive && hovered && (
        <div className="pointer-events-none absolute left-1/2 top-2 z-10 -translate-x-1/2 rounded-full bg-neutral-900/85 px-3 py-1 text-xs font-medium text-white shadow">
          {hovered}
        </div>
      )}
      <ComposableMap
        projection="geoEqualEarth"
        projectionConfig={{ scale: 155 }}
        width={800}
        height={400}
        style={{ width: "100%", height: "100%" }}
      >
        <Geographies geography={GEO_URL}>
          {({ geographies }) =>
            geographies.map((geo) => {
              const { a3, name } = resolve(geo as GeoLike);
              const isVisited = a3 ? visitedSet.has(a3) : false;
              const clickable = interactive && !!a3;
              return (
                <Geography
                  key={geo.rsmKey}
                  geography={geo}
                  onClick={clickable ? () => onToggle!(a3!) : undefined}
                  onMouseEnter={interactive ? () => setHovered(name || null) : undefined}
                  onMouseLeave={interactive ? () => setHovered(null) : undefined}
                  style={{
                    default: {
                      fill: isVisited ? "#10b981" : "#e5e5e5",
                      stroke: "#fff",
                      strokeWidth: 0.4,
                      outline: "none",
                      cursor: clickable ? "pointer" : "default",
                    },
                    hover: {
                      fill: isVisited ? "#059669" : clickable ? "#bbf7d0" : "#d4d4d4",
                      stroke: "#fff",
                      strokeWidth: 0.4,
                      outline: "none",
                      cursor: clickable ? "pointer" : "default",
                    },
                    pressed: { fill: isVisited ? "#047857" : "#86efac", outline: "none" },
                  }}
                />
              );
            })
          }
        </Geographies>
      </ComposableMap>
    </div>
  );
}
