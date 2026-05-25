// Full-screen layout for the onboarding wizard — no navbar.
export default function OnboardingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <div className="min-h-screen bg-neutral-50">{children}</div>;
}
