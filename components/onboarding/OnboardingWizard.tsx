"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import ProgressDots from "./ProgressDots";
import Step1Profile from "./Step1Profile";
import Step2Style from "./Step2Style";
import Step3Countries from "./Step3Countries";
import Step4FirstTrip from "./Step4FirstTrip";
import { completeOnboarding } from "@/app/actions/onboarding";

type Props = {
  userId: string;
  email: string;
  initialFullName: string;
};

const TOTAL_STEPS = 4;

export default function OnboardingWizard({ userId, email, initialFullName }: Props) {
  const router = useRouter();
  const [step, setStep] = useState(0);

  const [step1, setStep1] = useState({
    full_name: initialFullName,
    username: "",
    home_city: "",
    avatar_url: null as string | null,
  });
  const [tags, setTags] = useState<string[]>([]);
  const [countries, setCountries] = useState<string[]>([]);

  function next() {
    setStep((s) => Math.min(TOTAL_STEPS - 1, s + 1));
  }
  function back() {
    setStep((s) => Math.max(0, s - 1));
  }

  async function finish(
    trip:
      | { title: string; destination: string; start_date: string; end_date: string; visibility: "private" | "group" | "public" }
      | null
  ) {
    const result = await completeOnboarding({
      full_name: step1.full_name,
      username: step1.username,
      home_city: step1.home_city,
      avatar_url: step1.avatar_url,
      travel_tags: tags,
      countries_visited: countries,
      trip: trip
        ? {
            title: trip.title,
            destination: trip.destination || null,
            start_date: trip.start_date || null,
            end_date: trip.end_date || null,
            visibility: trip.visibility,
          }
        : null,
    });

    if (!result.ok) {
      throw new Error(result.error);
    }

    if (result.data.tripId) {
      router.push(`/trips/${result.data.tripId}`);
    } else if (trip === null) {
      router.push("/discover");
    } else {
      router.push("/dashboard");
    }
    router.refresh();
  }

  return (
    <div className="mx-auto flex min-h-screen max-w-2xl flex-col px-4 py-6">
      <ProgressDots current={step} total={TOTAL_STEPS} />

      {/* Slide track. 4 panels side-by-side, translate by -100% per step. */}
      <div className="relative flex-1 overflow-hidden">
        <div
          className="flex transition-transform duration-500 ease-out"
          style={{ transform: `translateX(-${step * 100}%)` }}
        >
          <Panel>
            <Step1Profile
              userId={userId}
              email={email}
              value={step1}
              onChange={setStep1}
              onNext={next}
            />
          </Panel>
          <Panel>
            <Step2Style value={tags} onChange={setTags} onBack={back} onNext={next} />
          </Panel>
          <Panel>
            <Step3Countries
              value={countries}
              onChange={setCountries}
              onBack={back}
              onNext={next}
            />
          </Panel>
          <Panel>
            <Step4FirstTrip onBack={back} onSubmit={finish} />
          </Panel>
        </div>
      </div>
    </div>
  );
}

function Panel({ children }: { children: React.ReactNode }) {
  // Each panel takes 100% of the track's width.
  return (
    <div className="w-full shrink-0 px-1 py-4">
      <div className="mx-auto max-w-md">{children}</div>
    </div>
  );
}
