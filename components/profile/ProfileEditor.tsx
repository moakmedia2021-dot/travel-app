"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { updateProfile, type ProfileUpdate } from "@/app/actions/profile";
import { MemberAvatar } from "@/components/budget/MemberAvatar";

type Props = {
  initial: ProfileUpdate & { id: string; email: string | null };
};

export default function ProfileEditor({ initial }: Props) {
  const router = useRouter();
  const [form, setForm] = useState({
    full_name: initial.full_name ?? "",
    username: initial.username ?? "",
    bio: initial.bio ?? "",
    home_city: initial.home_city ?? "",
    avatar_url: initial.avatar_url ?? "",
  });
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function update<K extends keyof typeof form>(key: K, value: string) {
    setForm((f) => ({ ...f, [key]: value }));
    setSaved(false);
  }

  async function handleSave() {
    setSaving(true);
    setError(null);
    setSaved(false);

    const result = await updateProfile({
      full_name: form.full_name || null,
      username: form.username || null,
      bio: form.bio || null,
      home_city: form.home_city || null,
      avatar_url: form.avatar_url || null,
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
          <MemberAvatar profile={previewProfile} size={64} />
          <div>
            <div className="text-base font-semibold text-neutral-900">
              {form.full_name || form.username || "Set your name below"}
            </div>
            {initial.email && (
              <div className="text-sm text-neutral-500">{initial.email}</div>
            )}
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

        <Field label="Avatar URL" hint="Paste a link to any image (square works best)">
          <input
            type="url"
            value={form.avatar_url}
            onChange={(e) => update("avatar_url", e.target.value)}
            placeholder="https://…"
            className={inputClass}
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
            className="rounded-md bg-neutral-900 px-4 py-2 text-sm font-medium text-white hover:bg-neutral-700 disabled:opacity-50"
          >
            {saving ? "Saving…" : "Save profile"}
          </button>
        </div>
      </div>
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
