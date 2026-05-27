"use client";

import { ComposableMap, Geographies, Geography } from "react-simple-maps";
import { ISO_N3_TO_A3 } from "@/lib/isoNumericToAlpha3";

const GEO_URL =
  "https://cdn.jsdelivr.net/npm/world-atlas@2.0.2/countries-110m.json";

type Props = {
  visited: string[]; // ISO alpha-3 codes
  height?: number;
};

function a3For(geo: { id?: string | number; properties?: { name?: string } }): string | null {
  // world-atlas uses ISO 3166-1 numeric ids — pad to 3 digits
  if (geo.id != null) {
    const id3 = String(geo.id).padStart(3, "0");
    if (ISO_N3_TO_A3[id3]) return ISO_N3_TO_A3[id3];
  }
  return null;
}

export default function WorldMap({ visited, height = 280 }: Props) {
  const visitedSet = new Set(visited);

  return (
    <div
      className="overflow-hidden rounded-lg border border-neutral-200 bg-neutral-50"
      style={{ height }}
    >
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
              const a3 = a3For(geo);
              const isVisited = a3 ? visitedSet.has(a3) : false;
              return (
                <Geography
                  key={geo.rsmKey}
                  geography={geo}
                  style={{
                    default: {
                      fill: isVisited ? "#10b981" : "#e5e5e5",
                      stroke: "#fff",
                      strokeWidth: 0.4,
                      outline: "none",
                    },
                    hover: {
                      fill: isVisited ? "#10b981" : "#d4d4d4",
                      outline: "none",
                    },
                    pressed: { outline: "none" },
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
