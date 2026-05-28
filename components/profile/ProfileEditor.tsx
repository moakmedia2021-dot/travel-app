"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { updateProfile, uploadAvatar, type ProfileUpdate } from "@/app/actions/profile";
import { MemberAvatar } from "@/components/budget/MemberAvatar";
import AvatarCropper from "./AvatarCropper";
import { fileToDataURL } from "@/lib/cropImage";
import CountriesPicker from "./CountriesPicker";
import { createClient } from "@/lib/supabase/client";
import { resetUser } from "@/lib/analytics";
import { clearSentryUser } from "@/lib/errorContext";

type Props = {
  initial: ProfileUpdate & { id: string; email: string | null };
  isAdmin?: boolean;
};

export default function ProfileEditor({ initial, isAdmin = false }: Props) {
  const router = useRouter();
  const [form, setForm] = useState({
    full_name: initial.full_name ?? "",
    username: initial.username ?? "",
    bio: initial.bio ?? "",
    home_city: initial.home_city ?? "",
    avatar_url: initial.avatar_url ?? "",
    instagram_handle: initial.instagram_handle ?? "",
    travel_tags: (initial.travel_tags ?? []).join(", "),
    countries_visited: initial.countries_visited ?? [],
  });
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [cropSrc, setCropSrc] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (fileInputRef.current) fileInputRef.current.value = "";
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
    setForm((f) => ({ ...f, avatar_url: result.url }));
    setSaved(true);
    router.refresh();
    setTimeout(() => setSaved(false), 2000);
  }

  function update<K extends keyof typeof form>(key: K, value: string) {
    setForm((f) => ({ ...f, [key]: value }));
    setSaved(false);
  }

  async function handleSave() {
    setSaving(true);
    setError(null);
    setSaved(false);

    const tags = form.travel_tags
      .split(",")
      .map((t) => t.trim())
      .filter(Boolean);

    const result = await updateProfile({
      full_name: form.full_name || null,
      username: form.username || null,
      bio: form.bio || null,
      home_city: form.home_city || null,
      avatar_url: form.avatar_url || null,
      instagram_handle: form.instagram_handle.replace(/^@/, "") || null,
      travel_tags: tags,
      countries_visited: form.countries_visited,
    });

    setSaving(false);
    if (!result.ok) {
      setError(result.error);
      return;
    }
    setSaved(true);
    router.refresh();
    setTimeout(() => setSaved(false), 2000);
  }

  // Preview the avatar using the live form state.
  const previewProfile = {
    id: initial.id,
    username: form.username || null,
    full_name: form.full_name || null,
    avatar_url: form.avatar_url || null,
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-neutral-900">Your profile</h1>
        <p className="mt-1 text-sm text-neutral-500">
          This is how you appear to people you travel with.
        </p>
      </div>

      <div className="rounded-xl border border-neutral-200 bg-white p-5">
        <div className="flex items-center gap-4">
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading}
            className="group relative shrink-0 disabled:opacity-50"
            title="Change photo"
          >
            <MemberAvatar profile={previewProfile} size={72} />
            <div className="absolute inset-0 flex items-center justify-center rounded-full bg-black/50 text-xs font-medium text-white opacity-0 transition-opacity group-hover:opacity-100">
              {uploading ? "…" : "Edit"}
            </div>
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={handleFileChange}
          />
          <div className="min-w-0 flex-1">
            <div className="truncate text-base font-semibold text-neutral-900">
              {form.full_name || form.username || "Set your name below"}
            </div>
            {initial.email && (
              <div className="truncate text-sm text-neutral-500">{initial.email}</div>
            )}
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={uploading}
              className="mt-2 text-xs font-medium text-neutral-600 underline hover:text-neutral-900 disabled:opacity-50"
            >
              {uploading ? "Uploading…" : "Upload photo"}
            </button>
          </div>
        </div>
      </div>

      <div className="space-y-4 rounded-xl border border-neutral-200 bg-white p-5">
        <Field label="Full name">
          <input
            type="text"
            value={form.full_name}
            onChange={(e) => update("full_name", e.target.value)}
            placeholder="Alice Chen"
            className={inputClass}
          />
        </Field>

        <Field label="Username" hint="3-32 chars, lowercase letters/numbers/underscore">
          <div className="flex items-center gap-1">
            <span className="text-sm text-neutral-400">@</span>
            <input
              type="text"
              value={form.username}
              onChange={(e) => update("username", e.target.value.toLowerCase())}
              placeholder="alice"
              className={`${inputClass} flex-1`}
            />
          </div>
        </Field>

        <Field label="Bio">
          <textarea
            value={form.bio}
            onChange={(e) => update("bio", e.target.value)}
            rows={3}
            placeholder="A few words about you and how you travel."
            className={`${inputClass} resize-none`}
          />
        </Field>

        <Field label="Home city">
          <input
            type="text"
            value={form.home_city}
            onChange={(e) => update("home_city", e.target.value)}
            placeholder="Austin, TX"
            className={inputClass}
          />
        </Field>

        <Field label="Instagram handle" hint="Without the @">
          <input
            type="text"
            value={form.instagram_handle}
            onChange={(e) => update("instagram_handle", e.target.value.replace(/^@/, ""))}
            placeholder="alicechen"
            className={inputClass}
          />
        </Field>

        <Field label="Travel tags" hint="Comma-separated. Used to match you with similar travelers.">
          <input
            type="text"
            value={form.travel_tags}
            onChange={(e) => update("travel_tags", e.target.value)}
            placeholder="food, hiking, slow travel, photography"
            className={inputClass}
          />
        </Field>

        <Field label="Countries visited" hint={`${form.countries_visited.length} selected`}>
          <CountriesPicker
            selected={form.countries_visited}
            onChange={(arr) =>
              setForm((f) => ({ ...f, countries_visited: arr }))
            }
          />
        </Field>

        {error && (
          <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>
        )}
        {saved && (
          <p className="rounded-md bg-green-50 px-3 py-2 text-sm text-green-700">Saved ✓</p>
        )}

        <div className="flex justify-end">
          <button
            onClick={handleSave}
            disabled={saving}
            className="h-11 rounded-md bg-neutral-900 px-4 text-sm font-medium text-white hover:bg-neutral-700 disabled:opacity-50"
          >
            {saving ? "Saving…" : "Save profile"}
          </button>
        </div>
      </div>

      {/* Account links + sign out */}
      <div className="overflow-hidden rounded-xl border border-neutral-200 bg-white">
        <div className="border-b border-neutral-100 p-5">
          <h3 className="text-sm font-semibold text-neutral-900">Account</h3>
          <p className="mt-1 text-sm text-neutral-500">
            Manage settings, billing, and notifications.
          </p>
        </div>

        {isAdmin && (
          <a
            href="/admin/analytics"
            className="flex h-14 items-center justify-between border-b border-neutral-100 bg-amber-50/40 px-5 text-sm font-medium text-amber-900 hover:bg-amber-50"
          >
            <span className="flex items-center gap-3">
              <span className="flex h-7 w-7 items-center justify-center rounded-md bg-amber-200/60 text-amber-900">
                <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <rect x="3" y="11" width="18" height="11" rx="2" />
                  <path d="M7 11V7a5 5 0 0110 0v4" />
                </svg>
              </span>
              <span>
                Admin portal
                <span className="ml-2 rounded-full bg-amber-200 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-amber-900">
                  Owner
                </span>
              </span>
            </span>
            <svg className="h-4 w-4 text-amber-700" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
            </svg>
          </a>
        )}

        <a
          href="/settings"
          className="flex h-14 items-center justify-between border-b border-neutral-100 px-5 text-sm font-medium text-neutral-700 hover:bg-neutral-50"
        >
          <span className="flex items-center gap-3">
            <svg className="h-5 w-5 text-neutral-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="12" cy="12" r="3" />
              <path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 01-2.83 2.83l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-4 0v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83-2.83l.06-.06a1.65 1.65 0 00.33-1.82 1.65 1.65 0 00-1.51-1H3a2 2 0 010-4h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 012.83-2.83l.06.06a1.65 1.65 0 001.82.33H9a1.65 1.65 0 001-1.51V3a2 2 0 014 0v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 2.83l-.06.06a1.65 1.65 0 00-.33 1.82V9a1.65 1.65 0 001.51 1H21a2 2 0 010 4h-.09a1.65 1.65 0 00-1.51 1z" />
            </svg>
            Settings
          </span>
          <svg className="h-4 w-4 text-neutral-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
          </svg>
        </a>

        <a
          href="/settings/billing"
          className="flex h-14 items-center justify-between border-b border-neutral-100 px-5 text-sm font-medium text-neutral-700 hover:bg-neutral-50"
        >
          <span className="flex items-center gap-3">
            <svg className="h-5 w-5 text-neutral-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <rect x="2" y="6" width="20" height="14" rx="2" />
              <path d="M2 10h20M6 16h4" />
            </svg>
            Plan & billing
          </span>
          <svg className="h-4 w-4 text-neutral-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
          </svg>
        </a>

        <div className="p-5">
          <button
            onClick={async () => {
              const supabase = createClient();
              await supabase.auth.signOut();
              resetUser();
              clearSentryUser();
              router.push("/login");
              router.refresh();
            }}
            className="h-11 w-full rounded-md border border-neutral-300 bg-white px-4 text-sm font-medium text-neutral-700 hover:bg-neutral-50"
          >
            Sign out
          </button>
        </div>
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

const inputClass =
  "block w-full rounded-md border border-neutral-300 bg-white px-3 py-2 text-sm text-neutral-900 placeholder-neutral-400 shadow-sm focus:border-neutral-500 focus:outline-none focus:ring-1 focus:ring-neutral-500";

function Field({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label className="mb-1 block text-sm font-medium text-neutral-700">{label}</label>
      {children}
      {hint && <p className="mt-1 text-xs text-neutral-400">{hint}</p>}
    </div>
  );
}
