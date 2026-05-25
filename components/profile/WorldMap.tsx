"use client";

import { ComposableMap, Geographies, Geography } from "react-simple-maps";

// Topojson source — world countries with ISO-A3 codes in properties.
// Hosted by react-simple-maps; can be swapped for a local copy later.
const GEO_URL =
  "https://cdn.jsdelivr.net/npm/world-atlas@2.0.2/countries-110m.json";

// world-atlas uses numeric IDs that map to ISO-N3. We'll match against the
// "name" property since ISO-A3 isn't in the file. Build a name→A3 lookup.
import { COUNTRIES } from "@/lib/countries";

const NAME_TO_A3: Record<string, string> = Object.fromEntries(
  COUNTRIES.map((c) => [c.name.toLowerCase(), c.code])
);
// A few aliases for names that differ between world-atlas and our list
const ALIASES: Record<string, string> = {
  "united states of america": "USA",
  "russian federation": "RUS",
  "czech republic": "CZE",
  "korea, republic of": "KOR",
  "south korea": "KOR",
  "united kingdom": "GBR",
  "iran (islamic republic of)": "IRN",
  "viet nam": "VNM",
};

function a3For(name: string | undefined): string | null {
  if (!name) return null;
  const lower = name.toLowerCase();
  return NAME_TO_A3[lower] ?? ALIASES[lower] ?? null;
}

type Props = {
  visited: string[]; // ISO-A3 codes
  height?: number;
};

export default function WorldMap({ visited, height = 280 }: Props) {
  const visitedSet = new Set(visited);

  return (
    <div className="overflow-hidden rounded-lg border border-neutral-200 bg-neutral-50" style={{ height }}>
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
              const a3 = a3For(geo.properties.name);
              const isVisited = a3 && visitedSet.has(a3);
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
