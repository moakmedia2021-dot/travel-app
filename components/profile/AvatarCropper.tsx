"use client";

import { useState, useCallback } from "react";
import Cropper from "react-easy-crop";
import { getCroppedBlob, type CropArea } from "@/lib/cropImage";
import SheetHandle from "@/components/ui/SheetHandle";

type Props = {
  imageSrc: string;
  onCancel: () => void;
  onConfirm: (blob: Blob) => Promise<void> | void;
};

export default function AvatarCropper({ imageSrc, onCancel, onConfirm }: Props) {
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [croppedArea, setCroppedArea] = useState<CropArea | null>(null);
  const [working, setWorking] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const onCropComplete = useCallback((_: CropArea, areaPixels: CropArea) => {
    setCroppedArea(areaPixels);
  }, []);

  async function handleConfirm() {
    if (!croppedArea) return;
    setWorking(true);
    setError(null);
    try {
      const blob = await getCroppedBlob(imageSrc, croppedArea);
      await onConfirm(blob);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Crop failed");
      setWorking(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-neutral-900/60 px-0 sm:px-4">
      <div className="flex w-full max-w-md flex-col rounded-t-2xl sm:rounded-2xl bg-white shadow-xl">
        <SheetHandle />
        <div className="flex items-center justify-between border-b border-neutral-200 px-5 py-4">
          <h2 className="text-base font-semibold text-neutral-900">Crop your photo</h2>
          <button
            onClick={onCancel}
            disabled={working}
            className="text-neutral-400 hover:text-neutral-700 disabled:opacity-50"
            aria-label="Close"
          >
            <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="relative h-72 w-full bg-neutral-900 sm:h-80">
          <Cropper
            image={imageSrc}
            crop={crop}
            zoom={zoom}
            aspect={1}
            cropShape="round"
            showGrid={false}
            onCropChange={setCrop}
            onZoomChange={setZoom}
            onCropComplete={onCropComplete}
          />
        </div>

        <div className="space-y-3 px-5 py-4">
          <div>
            <label className="mb-1 block text-xs font-medium uppercase tracking-wide text-neutral-500">
              Zoom
            </label>
            <input
              type="range"
              min={1}
              max={4}
              step={0.05}
              value={zoom}
              onChange={(e) => setZoom(Number(e.target.value))}
              disabled={working}
              className="w-full accent-neutral-900"
            />
          </div>
          <p className="text-xs text-neutral-500">
            Drag to reposition. Pinch or use the slider to zoom.
          </p>
          {error && (
            <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>
          )}
        </div>

        <div className="flex items-center justify-end gap-2 border-t border-neutral-200 px-5 py-4">
          <button
            onClick={onCancel}
            disabled={working}
            className="rounded-md px-3 py-2 text-sm font-medium text-neutral-600 hover:text-neutral-900 disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            onClick={handleConfirm}
            disabled={working || !croppedArea}
            className="rounded-md bg-neutral-900 px-4 py-2 text-sm font-medium text-white hover:bg-neutral-700 disabled:opacity-50"
          >
            {working ? "Saving…" : "Use photo"}
          </button>
        </div>
      </div>
    </div>
  );
}
