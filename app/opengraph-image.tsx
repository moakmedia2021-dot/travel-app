import { ImageResponse } from "next/og";

export const runtime = "edge";
export const alt = "GetGoin — plan trips together, find your people, book the trip.";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

async function loadInter(weight: number): Promise<ArrayBuffer | null> {
  try {
    const css = await (
      await fetch(
        `https://fonts.googleapis.com/css2?family=Inter:wght@${weight}`,
        { headers: { "User-Agent": "Mozilla/5.0" } }
      )
    ).text();
    const url = css.match(/src: url\((.+?)\) format/)?.[1];
    if (!url) return null;
    const res = await fetch(url);
    if (!res.ok) return null;
    return await res.arrayBuffer();
  } catch {
    return null;
  }
}

export default async function OpengraphImage() {
  const [bold, medium] = await Promise.all([loadInter(800), loadInter(500)]);
  const fonts = [
    bold && { name: "Inter", data: bold, weight: 800 as const, style: "normal" as const },
    medium && { name: "Inter", data: medium, weight: 500 as const, style: "normal" as const },
  ].filter(Boolean) as { name: string; data: ArrayBuffer; weight: 800 | 500; style: "normal" }[];

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          backgroundColor: "#fafafa",
          fontFamily: "Inter",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            width: 132,
            height: 132,
            borderRadius: 32,
            backgroundColor: "#171717",
            color: "#ffffff",
            fontSize: 84,
            fontWeight: 800,
          }}
        >
          G
        </div>
        <div style={{ display: "flex", marginTop: 44, fontSize: 96, fontWeight: 800, letterSpacing: -2 }}>
          <span style={{ color: "#171717" }}>Get</span>
          <span style={{ color: "#2563eb" }}>Goin</span>
        </div>
        <div
          style={{
            display: "flex",
            marginTop: 20,
            fontSize: 36,
            fontWeight: 500,
            color: "#525252",
            maxWidth: 820,
            textAlign: "center",
          }}
        >
          The group chat that actually books the trip.
        </div>
      </div>
    ),
    { ...size, fonts }
  );
}
