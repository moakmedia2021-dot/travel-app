"use client";

import { useState } from "react";

type Props = {
  referralLink: string;
  shareText?: string;
};

export default function ShareButtons({
  referralLink,
  shareText = "Just got on the GetGoin waitlist — plan group trips, split costs, catch deals. Come get goin' with me:",
}: Props) {
  const [copied, setCopied] = useState(false);

  async function copy() {
    await navigator.clipboard.writeText(referralLink);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }

  const text = encodeURIComponent(`${shareText} ${referralLink}`);
  const twitter = `https://twitter.com/intent/tweet?text=${text}`;
  const whatsapp = `https://wa.me/?text=${text}`;

  return (
    <div className="space-y-3">
      <div className="flex items-stretch gap-2">
        <input
          readOnly
          value={referralLink}
          onClick={(e) => (e.target as HTMLInputElement).select()}
          className="flex-1 rounded-md border border-neutral-300 bg-neutral-50 px-3 py-2 text-sm font-mono text-neutral-700"
        />
        <button
          onClick={copy}
          className="h-11 rounded-md bg-neutral-900 px-4 text-sm font-semibold text-white hover:bg-neutral-700"
        >
          {copied ? "Copied" : "Copy"}
        </button>
      </div>

      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
        <a
          href={twitter}
          target="_blank"
          rel="noreferrer"
          className="flex h-11 items-center justify-center gap-2 rounded-md border border-neutral-300 bg-white text-sm font-medium text-neutral-700 hover:bg-neutral-50"
        >
          <svg className="h-4 w-4" viewBox="0 0 24 24" fill="currentColor">
            <path d="M18.9 1.5h3.5l-7.6 8.7L24 22.5h-7l-5.5-7.2-6.3 7.2H1.7l8.2-9.4L0 1.5h7.2l5 6.6 6.7-6.6z" />
          </svg>
          Twitter
        </a>
        <a
          href={whatsapp}
          target="_blank"
          rel="noreferrer"
          className="flex h-11 items-center justify-center gap-2 rounded-md border border-neutral-300 bg-white text-sm font-medium text-neutral-700 hover:bg-neutral-50"
        >
          <svg className="h-4 w-4" viewBox="0 0 24 24" fill="currentColor">
            <path d="M20 4A11 11 0 002 19l-2 5 5-2A11 11 0 1020 4zm-8 18a9 9 0 01-4.6-1.3l-3.4 1 1-3.4A9 9 0 1112 22zm5-6.6c-.3-.1-1.7-.8-2-1s-.4-.1-.6.1l-.8 1c-.2.2-.3.2-.5.1a7.4 7.4 0 01-2.2-1.4 8.3 8.3 0 01-1.5-1.9c-.2-.3 0-.4.1-.5l.4-.5.3-.5v-.5l-.9-2.2c-.2-.5-.4-.5-.6-.5h-.5a1 1 0 00-.7.3 3 3 0 00-1 2.2c0 1.3.9 2.5 1.1 2.7 0 0 1.8 2.7 4.3 3.8l1.4.5a3.4 3.4 0 001.6.1c.5-.1 1.5-.6 1.7-1.2.2-.6.2-1.1.1-1.2z" />
          </svg>
          WhatsApp
        </a>
        <button
          onClick={copy}
          className="flex h-11 items-center justify-center gap-2 rounded-md border border-neutral-300 bg-white text-sm font-medium text-neutral-700 hover:bg-neutral-50"
          title="Copy link to paste in Instagram, iMessage, etc."
        >
          <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M10 13a5 5 0 007 0l3-3a5 5 0 00-7-7l-1 1M14 11a5 5 0 00-7 0l-3 3a5 5 0 007 7l1-1" />
          </svg>
          {copied ? "Copied" : "Copy"}
        </button>
      </div>
    </div>
  );
}
