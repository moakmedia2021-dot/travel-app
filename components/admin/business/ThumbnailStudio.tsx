"use client";

import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";

type Orientation = "horizontal" | "vertical";
type VPos = "top" | "center" | "bottom";

const DIMS: Record<Orientation, { w: number; h: number; label: string }> = {
  horizontal: { w: 1280, h: 720, label: "16:9 · YouTube" },
  vertical: { w: 1080, h: 1920, label: "9:16 · Reels / TikTok" },
};

const inputClass =
  "block w-full rounded-md border border-neutral-300 bg-white px-3 py-2 text-sm text-neutral-900 placeholder-neutral-400 shadow-sm focus:border-neutral-500 focus:outline-none focus:ring-1 focus:ring-neutral-500";

export default function ThumbnailStudio() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const imgRef = useRef<HTMLImageElement | null>(null);

  const [orientation, setOrientation] = useState<Orientation>("horizontal");
  const [headline, setHeadline] = useState("I stayed in the COOLEST Airbnb");
  const [subtext, setSubtext] = useState("");
  const [accent, setAccent] = useState("#2563eb");
  const [textColor, setTextColor] = useState("#ffffff");
  const [vpos, setVpos] = useState<VPos>("bottom");
  const [fontScale, setFontScale] = useState(1);
  const [scrim, setScrim] = useState(0.45);
  const [uppercase, setUppercase] = useState(true);
  const [imgLoaded, setImgLoaded] = useState(false);

  function onFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const img = new Image();
    img.onload = () => {
      imgRef.current = img;
      setImgLoaded(true);
    };
    img.onerror = () => toast.error("Couldn't load image");
    img.src = URL.createObjectURL(file);
  }

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const { w, h } = DIMS[orientation];
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // Background
    const img = imgRef.current;
    if (img) {
      // cover-fit
      const scale = Math.max(w / img.width, h / img.height);
      const dw = img.width * scale;
      const dh = img.height * scale;
      ctx.drawImage(img, (w - dw) / 2, (h - dh) / 2, dw, dh);
    } else {
      const grad = ctx.createLinearGradient(0, 0, w, h);
      grad.addColorStop(0, "#1f2937");
      grad.addColorStop(1, "#0f172a");
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, w, h);
    }

    // Scrim for legibility (stronger near the text)
    if (scrim > 0) {
      const g = ctx.createLinearGradient(0, 0, 0, h);
      const top = vpos === "top" ? scrim : 0;
      const bot = vpos === "bottom" ? scrim : 0;
      const mid = vpos === "center" ? scrim : Math.max(top, bot) * 0.4;
      g.addColorStop(0, `rgba(0,0,0,${top})`);
      g.addColorStop(0.5, `rgba(0,0,0,${mid})`);
      g.addColorStop(1, `rgba(0,0,0,${bot})`);
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, w, h);
    }

    // Text
    const pad = w * 0.06;
    const maxWidth = w - pad * 2;
    const baseSize = (orientation === "vertical" ? w * 0.11 : w * 0.085) * fontScale;
    const headText = uppercase ? headline.toUpperCase() : headline;

    ctx.textAlign = "left";
    ctx.fillStyle = textColor;
    ctx.font = `800 ${baseSize}px Inter, system-ui, sans-serif`;
    const lines = wrap(ctx, headText, maxWidth);
    const lineH = baseSize * 1.08;
    const subSize = baseSize * 0.42;
    const subLines = subtext ? wrap(ctx, subtext, maxWidth) : [];
    const blockH = lines.length * lineH + (subLines.length ? subLines.length * subSize * 1.25 + lineH * 0.3 : 0);

    let y: number;
    if (vpos === "top") y = pad + baseSize;
    else if (vpos === "center") y = (h - blockH) / 2 + baseSize;
    else y = h - pad - blockH + baseSize;

    // accent bar
    ctx.fillStyle = accent;
    ctx.fillRect(pad, y - baseSize, w * 0.012, blockH);

    const textX = pad + w * 0.012 + w * 0.025;

    ctx.fillStyle = textColor;
    ctx.font = `800 ${baseSize}px Inter, system-ui, sans-serif`;
    ctx.shadowColor = "rgba(0,0,0,0.35)";
    ctx.shadowBlur = baseSize * 0.12;
    ctx.shadowOffsetY = baseSize * 0.04;
    lines.forEach((ln, i) => ctx.fillText(ln, textX, y + i * lineH));
    ctx.shadowColor = "transparent";

    if (subLines.length) {
      ctx.font = `600 ${subSize}px Inter, system-ui, sans-serif`;
      ctx.fillStyle = accent;
      const subY = y + lines.length * lineH + subSize;
      subLines.forEach((ln, i) => ctx.fillText(ln, textX, subY + i * subSize * 1.25));
    }
  }, [orientation, headline, subtext, accent, textColor, vpos, fontScale, scrim, uppercase, imgLoaded]);

  function download() {
    const canvas = canvasRef.current;
    if (!canvas) return;
    canvas.toBlob((blob) => {
      if (!blob) return;
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `thumbnail-${orientation}-${Date.now()}.png`;
      a.click();
      URL.revokeObjectURL(url);
    }, "image/png");
  }

  return (
    <div className="grid gap-4 lg:grid-cols-[1fr_360px]">
      {/* Preview */}
      <div className="flex items-center justify-center rounded-xl border border-neutral-200 bg-neutral-100 p-4">
        <canvas
          ref={canvasRef}
          className="max-h-[60vh] max-w-full rounded-lg shadow-lg"
          style={{ aspectRatio: orientation === "horizontal" ? "16 / 9" : "9 / 16", height: orientation === "vertical" ? "60vh" : undefined, width: orientation === "horizontal" ? "100%" : undefined }}
        />
      </div>

      {/* Controls */}
      <div className="space-y-3 rounded-xl border border-neutral-200 bg-white p-4">
        <div className="grid grid-cols-2 gap-2">
          {(Object.keys(DIMS) as Orientation[]).map((o) => (
            <button
              key={o}
              onClick={() => setOrientation(o)}
              className={`rounded-md border px-2 py-2 text-xs font-medium ${
                orientation === o ? "border-neutral-900 bg-neutral-900 text-white" : "border-neutral-200 text-neutral-600 hover:border-neutral-300"
              }`}
            >
              {DIMS[o].label}
            </button>
          ))}
        </div>

        <label className="block">
          <span className="mb-1 block text-xs font-medium text-neutral-500">Background photo</span>
          <input type="file" accept="image/*" onChange={onFile} className="block w-full text-xs text-neutral-500 file:mr-3 file:rounded-md file:border-0 file:bg-neutral-900 file:px-3 file:py-1.5 file:text-xs file:font-medium file:text-white" />
        </label>

        <textarea className={inputClass} rows={2} value={headline} onChange={(e) => setHeadline(e.target.value)} placeholder="Headline" />
        <input className={inputClass} value={subtext} onChange={(e) => setSubtext(e.target.value)} placeholder="Subtext (optional)" />

        <div className="grid grid-cols-2 gap-3">
          <label className="text-xs">
            <span className="mb-1 block font-medium text-neutral-500">Text</span>
            <input type="color" value={textColor} onChange={(e) => setTextColor(e.target.value)} className="h-9 w-full rounded-md border border-neutral-300" />
          </label>
          <label className="text-xs">
            <span className="mb-1 block font-medium text-neutral-500">Accent</span>
            <input type="color" value={accent} onChange={(e) => setAccent(e.target.value)} className="h-9 w-full rounded-md border border-neutral-300" />
          </label>
        </div>

        <div>
          <span className="mb-1 block text-xs font-medium text-neutral-500">Text position</span>
          <div className="grid grid-cols-3 gap-2">
            {(["top", "center", "bottom"] as VPos[]).map((p) => (
              <button key={p} onClick={() => setVpos(p)} className={`rounded-md border px-2 py-1.5 text-xs font-medium capitalize ${vpos === p ? "border-neutral-900 bg-neutral-50 text-neutral-900" : "border-neutral-200 text-neutral-500"}`}>
                {p}
              </button>
            ))}
          </div>
        </div>

        <Slider label="Text size" value={fontScale} min={0.6} max={1.6} step={0.05} onChange={setFontScale} />
        <Slider label="Darken photo" value={scrim} min={0} max={0.85} step={0.05} onChange={setScrim} />

        <label className="flex items-center gap-2 text-sm text-neutral-700">
          <input type="checkbox" checked={uppercase} onChange={(e) => setUppercase(e.target.checked)} className="h-4 w-4 rounded border-neutral-300" />
          Uppercase headline
        </label>

        <button onClick={download} className="w-full rounded-md bg-neutral-900 px-4 py-2.5 text-sm font-medium text-white hover:bg-neutral-700">
          ⬇ Download PNG
        </button>
        <p className="text-xs text-neutral-400">Switch orientation and download again to export both YouTube and Reels sizes.</p>
      </div>
    </div>
  );
}

function Slider({ label, value, min, max, step, onChange }: { label: string; value: number; min: number; max: number; step: number; onChange: (v: number) => void }) {
  return (
    <label className="block text-xs">
      <span className="mb-1 flex justify-between font-medium text-neutral-500">
        <span>{label}</span>
        <span className="tabular-nums text-neutral-400">{value.toFixed(2)}</span>
      </span>
      <input type="range" min={min} max={max} step={step} value={value} onChange={(e) => onChange(Number(e.target.value))} className="w-full accent-neutral-900" />
    </label>
  );
}

function wrap(ctx: CanvasRenderingContext2D, text: string, maxWidth: number): string[] {
  const words = text.split(/\s+/).filter(Boolean);
  const lines: string[] = [];
  let line = "";
  for (const word of words) {
    const test = line ? `${line} ${word}` : word;
    if (ctx.measureText(test).width > maxWidth && line) {
      lines.push(line);
      line = word;
    } else {
      line = test;
    }
  }
  if (line) lines.push(line);
  return lines.length ? lines : [""];
}
