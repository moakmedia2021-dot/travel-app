import Link from "next/link";
import JoinForm from "./JoinForm";

type Props = {
  waitlistCount: number;
  referralCode?: string | null;
};

const FEATURES = [
  {
    title: "One plan, everyone on it",
    desc: "Drag-and-drop itineraries with flights, hotels, and activities. Weather, maps, and budget live right alongside the plan — and everyone sees updates in real time.",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <rect x="3" y="4" width="18" height="18" rx="2" />
        <path d="M16 2v4M8 2v4M3 10h18M8 15h2M14 15h2M8 19h2M14 19h2" />
      </svg>
    ),
  },
  {
    title: "Split it without the drama",
    desc: "Invite friends, log shared costs, and settle up clean — no spreadsheet, no awkward Venmo reminders. Everyone pays their share and moves on.",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="9" cy="8" r="4" />
        <circle cx="17" cy="6" r="3" />
        <path d="M2 21c0-4 3-7 7-7s7 3 7 7M14 19c1-3 3-5 6-5s4 2 4 5" />
      </svg>
    ),
  },
  {
    title: "Deals, found for you",
    desc: "Live flight and hotel prices from the same sources the big booking sites use. Spot a good one, drop it straight into the itinerary and budget.",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M17.8 19.2L16 11l3.5-3.5C21 6 21.5 4 21 3c-1-.5-3 0-4.5 1.5L13 8 4.8 6.2c-.5-.1-.9.1-1.1.5l-.3.5c-.2.5-.1 1 .3 1.3L9 12l-2 3H4l-1 1 3 2 2 3 1-1v-3l3-2 3.5 5.3c.3.4.8.5 1.3.3l.5-.2c.4-.3.6-.7.5-1.2z" />
      </svg>
    ),
  },
];

const STEPS = [
  {
    title: "Join the waitlist",
    body: "Drop your email above. You'll get a referral link to share with friends.",
  },
  {
    title: "Move up the line",
    body: "Every signup from your referral link moves you up 5 spots. The further you move, the faster you get in.",
  },
  {
    title: "Get early access",
    body: "When your turn comes up, we'll email you a one-tap signup link. No password reset, no waiting.",
  },
];

export default function Landing({ waitlistCount, referralCode }: Props) {
  return (
    <div className="min-h-screen bg-neutral-50 text-neutral-900">
      <Header />

      {/* Hero */}
      <section className="px-4 pt-12 pb-16 sm:pt-20 sm:pb-24">
        <div className="mx-auto max-w-3xl text-center">
          <span className="inline-block rounded-full border border-neutral-300 bg-white px-3 py-1 text-xs font-medium uppercase tracking-wide text-neutral-600">
            Early access · invite only
          </span>
          <h1 className="mt-5 text-3xl font-semibold tracking-tight sm:text-5xl md:text-6xl">
            The group chat
            <br />
            that actually
            <br />
            <span className="text-neutral-500">books the trip.</span>
          </h1>
          <p className="mx-auto mt-5 max-w-xl text-base text-neutral-600 sm:text-lg">
            Plan it together, split the costs, and catch the deals — all in one place.
            No more 200-message threads and a trip that never happens.
          </p>

          <div className="mx-auto mt-8 max-w-lg text-left">
            <JoinForm referralCode={referralCode} />
          </div>

          {waitlistCount > 0 && (
            <p className="mt-5 text-sm text-neutral-500">
              Join{" "}
              <span className="font-semibold text-neutral-900">
                {waitlistCount.toLocaleString()}
              </span>{" "}
              traveler{waitlistCount === 1 ? "" : "s"} already on the waitlist
            </p>
          )}
        </div>
      </section>

      {/* Features */}
      <section className="border-t border-neutral-200 bg-white px-4 py-16 sm:py-20">
        <div className="mx-auto max-w-6xl">
          <h2 className="text-center text-xs font-semibold uppercase tracking-wide text-neutral-500">
            Everything the trip needs, in one place
          </h2>
          <div className="mt-8 grid grid-cols-1 gap-6 sm:gap-8 md:grid-cols-3">
            {FEATURES.map((f) => (
              <div key={f.title} className="rounded-xl border border-neutral-200 bg-white p-6">
                <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-neutral-900 text-white">
                  <span className="h-6 w-6 block">{f.icon}</span>
                </div>
                <h3 className="mt-4 text-lg font-semibold">{f.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-neutral-600">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Social proof */}
      <section className="border-t border-neutral-200 bg-neutral-50 px-4 py-16 text-center">
        <div className="mx-auto max-w-2xl">
          <h2 className="text-3xl font-semibold sm:text-4xl">
            Join{" "}
            <span className="bg-gradient-to-r from-blue-600 to-green-600 bg-clip-text text-transparent">
              {waitlistCount.toLocaleString()}
            </span>{" "}
            travelers already on the waitlist
          </h2>
          <p className="mt-3 text-neutral-600">
            Every referral moves you up 5 spots. The earlier you join, the better.
          </p>
        </div>
      </section>

      {/* How it works */}
      <section className="border-t border-neutral-200 bg-white px-4 py-16 sm:py-20">
        <div className="mx-auto max-w-5xl">
          <h2 className="text-center text-xs font-semibold uppercase tracking-wide text-neutral-500">
            How it works
          </h2>
          <div className="mt-8 grid grid-cols-1 gap-6 md:grid-cols-3">
            {STEPS.map((s, i) => (
              <div key={s.title} className="rounded-xl border border-neutral-200 bg-white p-6">
                <span className="flex h-10 w-10 items-center justify-center rounded-full bg-neutral-900 text-base font-semibold text-white">
                  {i + 1}
                </span>
                <h3 className="mt-4 text-lg font-semibold">{s.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-neutral-600">{s.body}</p>
              </div>
            ))}
          </div>

          <div className="mt-12 text-center">
            <p className="text-sm font-medium text-neutral-700">Ready to skip the line?</p>
            <div className="mx-auto mt-4 max-w-md">
              <JoinForm referralCode={referralCode} size="compact" />
            </div>
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
}

function Header() {
  return (
    <header className="border-b border-neutral-200 bg-white">
      <nav className="mx-auto flex h-14 max-w-7xl items-center justify-between px-4 sm:h-16 sm:px-6 lg:px-8">
        <Link href="/" className="text-base font-bold tracking-tight sm:text-lg">
          Get<span className="text-blue-600">Goin</span>
        </Link>
        <a href="#join" className="text-sm font-medium text-neutral-600 hover:text-neutral-900">
          Join waitlist
        </a>
      </nav>
    </header>
  );
}

function Footer() {
  return (
    <footer className="border-t border-neutral-200 bg-white px-4 py-10 sm:px-6 lg:px-8">
      <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-4 sm:flex-row">
        <p className="text-xs text-neutral-500">© {new Date().getFullYear()} GetGoin</p>
        <div className="flex items-center gap-5 text-sm text-neutral-500">
          <a
            href="https://twitter.com/"
            target="_blank"
            rel="noreferrer"
            className="hover:text-neutral-900"
            aria-label="Twitter / X"
          >
            <svg className="h-4 w-4" viewBox="0 0 24 24" fill="currentColor">
              <path d="M18.9 1.5h3.5l-7.6 8.7L24 22.5h-7l-5.5-7.2-6.3 7.2H1.7l8.2-9.4L0 1.5h7.2l5 6.6 6.7-6.6zm-1.2 18.7h1.9L6.4 3.6H4.4l13.3 16.6z" />
            </svg>
          </a>
          <a
            href="https://instagram.com/"
            target="_blank"
            rel="noreferrer"
            className="hover:text-neutral-900"
            aria-label="Instagram"
          >
            <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <rect x="2" y="2" width="20" height="20" rx="5" />
              <circle cx="12" cy="12" r="4" />
              <circle cx="17.5" cy="6.5" r="0.8" fill="currentColor" stroke="none" />
            </svg>
          </a>
          <a href="/privacy" className="hover:text-neutral-900">Privacy</a>
          <a href="/terms" className="hover:text-neutral-900">Terms</a>
        </div>
      </div>
    </footer>
  );
}
