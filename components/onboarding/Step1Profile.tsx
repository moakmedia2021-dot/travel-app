"use client";

import { useEffect, useRef, useState } from "react";
import { MemberAvatar } from "@/components/budget/MemberAvatar";
import AvatarCropper from "@/components/profile/AvatarCropper";
import { fileToDataURL } from "@/lib/cropImage";
import { uploadAvatar } from "@/app/actions/profile";
import { checkUsernameAvailable } from "@/app/actions/onboarding";

type State = {
  full_name: string;
  username: string;
  home_city: string;
  avatar_url: string | null;
};

type Props = {
  userId: string;
  email: string;
  value: State;
  onChange: (s: State) => void;
  onNext: () => void;
};

type UsernameStatus = "idle" | "checking" | "available" | "unavailable" | "invalid";

export default function Step1Profile({ value, onChange, onNext, userId, email }: Props) {
  const [usernameStatus, setUsernameStatus] = useState<UsernameStatus>("idle");
  const [cropSrc, setCropSrc] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement | null>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Debounced username check
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    const u = value.username.trim();
    if (!u) {
      setUsernameStatus("idle");
      return;
    }
    if (!/^[a-z0-9_]{3,32}$/.test(u)) {
      setUsernameStatus("invalid");
      return;
    }
    setUsernameStatus("checking");
    debounceRef.current = setTimeout(async () => {
      const ok = await checkUsernameAvailable(u);
      setUsernameStatus(ok ? "available" : "unavailable");
    }, 400);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [value.username]);

  function update<K extends keyof State>(key: K, v: State[K]) {
    onChange({ ...value, [key]: v });
  }

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (fileRef.current) fileRef.current.value = "";
    if (!file) return;
    if (file.size > 20 * 1024 * 1024) {
      setError("Image must be under 20MB");
      return;
    }
    setError(null);
    try {
      const dataUrl = await fileToDataURL(file);
      setCropSrc(dataUrl);
    } catch {
      setError("Couldn't read that image");
    }
  }

  async function handleCropConfirm(blob: Blob) {
    setUploading(true);
    setError(null);
    const fd = new FormData();
    fd.append("file", new File([blob], "avatar.jpg", { type: "image/jpeg" }));
    const result = await uploadAvatar(fd);
    setUploading(false);
    setCropSrc(null);
    if (!result.ok) {
      setError(result.error);
      return;
    }
    update("avatar_url", result.url);
  }

  const canContinue =
    value.full_name.trim().length > 0 &&
    (usernameStatus === "available" || (!value.username && false)) &&
    !uploading;

  const previewProfile = {
    id: userId,
    full_name: value.full_name || null,
    username: value.username || null,
    avatar_url: value.avatar_url,
  };

  return (
    <div className="space-y-6">
      <div className="text-center">
        <h1 className="text-2xl font-semibold text-neutral-900 sm:text-3xl">
          Who are you as a traveler?
        </h1>
        <p className="mt-2 text-sm text-neutral-500">
          The basics. You can change all of this later.
        </p>
      </div>

      <div className="flex flex-col items-center gap-3">
        <button
          type="button"
          onClick={() => fileRef.current?.click()}
          disabled={uploading}
          className="group relative disabled:opacity-50"
        >
          <MemberAvatar profile={previewProfile} size={96} />
          <div className="absolute inset-0 flex items-center justify-center rounded-full bg-black/50 text-xs font-medium text-white opacity-0 transition-opacity group-hover:opacity-100">
            {uploading ? "…" : value.avatar_url ? "Change" : "Upload"}
          </div>
        </button>
        <input
          ref={fileRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={handleFileChange}
        />
        <button
          type="button"
          onClick={() => fileRef.current?.click()}
          disabled={uploading}
          className="text-xs font-medium text-neutral-500 underline hover:text-neutral-900 disabled:opacity-50"
        >
          {uploading ? "Uploading…" : value.avatar_url ? "Change photo" : "Upload a photo (optional)"}
        </button>
      </div>

      <div className="space-y-4">
        <Field label="Display name" required>
          <input
            type="text"
            value={value.full_name}
            onChange={(e) => update("full_name", e.target.value)}
            placeholder="Alice Chen"
            className={inputClass}
            autoFocus
          />
        </Field>

        <Field
          label="Username"
          required
          hint={usernameHint(usernameStatus)}
          hintTone={usernameStatus === "available" ? "good" : usernameStatus === "unavailable" || usernameStatus === "invalid" ? "bad" : "muted"}
        >
          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-neutral-400">@</span>
            <input
              type="text"
              value={value.username}
              onChange={(e) => update("username", e.target.value.toLowerCase())}
              placeholder="alice"
              className={`${inputClass} pl-7`}
            />
            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs">
              {usernameStatus === "checking" && <span className="text-neutral-400">…</span>}
              {usernameStatus === "available" && <span className="text-green-600">✓</span>}
              {(usernameStatus === "unavailable" || usernameStatus === "invalid") && (
                <span className="text-red-600">✕</span>
              )}
            </span>
          </div>
        </Field>

        <Field label="Home city">
          <input
            type="text"
            value={value.home_city}
            onChange={(e) => update("home_city", e.target.value)}
            placeholder="Austin, TX"
            className={inputClass}
          />
        </Field>
      </div>

      {error && (
        <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>
      )}

      <p className="text-center text-xs text-neutral-400">Signed in as {email}</p>

      <div className="flex justify-end">
        <button
          onClick={onNext}
          disabled={!canContinue}
          className="rounded-md bg-neutral-900 px-5 py-2.5 text-sm font-medium text-white hover:bg-neutral-700 disabled:opacity-50"
        >
          Continue
        </button>
      </div>

      {cropSrc && (
        <AvatarCropper
          imageSrc={cropSrc}
          onCancel={() => setCropSrc(null)}
          onConfirm={handleCropConfirm}
        />
      )}
    </div>
  );
}

function usernameHint(s: UsernameStatus): string | undefined {
  switch (s) {
    case "checking":
      return "Checking availability…";
    case "available":
      return "Available";
    case "unavailable":
      return "Already taken";
    case "invalid":
      return "3-32 chars: lowercase letters, numbers, underscore";
    default:
      return "Lowercase letters, numbers, and underscores only";
  }
}

const inputClass =
  "block w-full rounded-md border border-neutral-300 bg-white px-3 py-2.5 text-sm text-neutral-900 placeholder-neutral-400 shadow-sm focus:border-neutral-500 focus:outline-none focus:ring-1 focus:ring-neutral-500";

function Field({
  label,
  required,
  hint,
  hintTone = "muted",
  children,
}: {
  label: string;
  required?: boolean;
  hint?: string;
  hintTone?: "muted" | "good" | "bad";
  children: React.ReactNode;
}) {
  const hintClass =
    hintTone === "good"
      ? "text-green-600"
      : hintTone === "bad"
        ? "text-red-600"
        : "text-neutral-400";
  return (
    <div>
      <label className="mb-1 block text-sm font-medium text-neutral-700">
        {label}
        {required && <span className="text-red-500"> *</span>}
      </label>
      {children}
      {hint && <p className={`mt-1 text-xs ${hintClass}`}>{hint}</p>}
    </div>
  );
}
