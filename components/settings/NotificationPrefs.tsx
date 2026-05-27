"use client";

import { useState } from "react";
import { toast } from "sonner";
import { updateNotificationPrefs } from "@/app/actions/account";
import type { NotificationPrefs } from "@/lib/notificationPrefs";

type Props = {
  initial: NotificationPrefs;
};

const PREFS: { key: keyof NotificationPrefs; label: string; desc: string }[] = [
  {
    key: "email_on_trip_invite",
    label: "Trip invites",
    desc: "Email me when someone invites me to a trip.",
  },
  {
    key: "email_on_connection_request",
    label: "Connection requests",
    desc: "Email me when someone wants to connect.",
  },
  {
    key: "email_on_deal_alert",
    label: "Deal alerts (Premium)",
    desc: "Email me about price drops on my upcoming trips.",
  },
];

export default function NotificationPrefsForm({ initial }: Props) {
  const [prefs, setPrefs] = useState<NotificationPrefs>(initial);
  const [saving, setSaving] = useState(false);

  async function toggle(key: keyof NotificationPrefs) {
    const next = { ...prefs, [key]: !prefs[key] };
    setPrefs(next);
    setSaving(true);
    const r = await updateNotificationPrefs(next);
    setSaving(false);
    if (!r.ok) {
      toast.error(r.error);
      setPrefs(prefs); // revert
    }
  }

  return (
    <div className="space-y-3 rounded-xl border border-neutral-200 bg-white p-5">
      <div>
        <h2 className="text-base font-semibold text-neutral-900">Notifications</h2>
        <p className="mt-1 text-sm text-neutral-500">
          {saving ? "Saving…" : "Choose what we email you about."}
        </p>
      </div>
      <div className="divide-y divide-neutral-100">
        {PREFS.map((p) => (
          <label
            key={p.key}
            className="flex cursor-pointer items-center justify-between gap-3 py-3"
          >
            <div className="min-w-0">
              <div className="text-sm font-medium text-neutral-900">{p.label}</div>
              <div className="text-xs text-neutral-500">{p.desc}</div>
            </div>
            <Toggle checked={!!prefs[p.key]} onChange={() => toggle(p.key)} />
          </label>
        ))}
      </div>
    </div>
  );
}

function Toggle({ checked, onChange }: { checked: boolean; onChange: () => void }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={onChange}
      className={`relative inline-flex h-7 w-12 shrink-0 cursor-pointer items-center rounded-full border-2 border-transparent transition-colors ${
        checked ? "bg-neutral-900" : "bg-neutral-300"
      }`}
    >
      <span
        className={`inline-block h-5 w-5 transform rounded-full bg-white shadow transition ${
          checked ? "translate-x-5" : "translate-x-1"
        }`}
      />
    </button>
  );
}
