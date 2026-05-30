import type { Metadata } from "next";
import LegalPage from "@/components/legal/LegalPage";

export const metadata: Metadata = {
  title: "Privacy Policy",
  description: "How GetGoin collects, uses, and protects your data.",
};

export default function PrivacyPage() {
  return (
    <LegalPage title="Privacy Policy" updated="May 30, 2026">
      <p>
        This Privacy Policy explains what information GetGoin collects, how we use it, and the
        choices you have. We aim to collect only what we need to run the Service well.
      </p>

      <h2>1. Information we collect</h2>
      <ul>
        <li>
          <strong>Account info</strong> — your name, username, email, and password (stored
          encrypted).
        </li>
        <li>
          <strong>Content you create</strong> — trips, itineraries, expenses, posts, and profile
          details.
        </li>
        <li>
          <strong>Usage data</strong> — basic analytics about how you use the Service, used to fix
          bugs and improve features.
        </li>
        <li>
          <strong>Payment info</strong> — handled by our payment processor (Stripe). We do not store
          your full card details.
        </li>
      </ul>

      <h2>2. How we use your information</h2>
      <ul>
        <li>To provide, maintain, and improve the Service.</li>
        <li>To personalize your experience and surface relevant travel results.</li>
        <li>To communicate with you about your account, security, and updates.</li>
        <li>To detect, prevent, and address fraud or abuse.</li>
      </ul>

      <h2>3. How we share information</h2>
      <p>
        We don&rsquo;t sell your personal information. We share data only with service providers that
        help us operate the Service (such as hosting, analytics, payments, and travel partners), with
        people you choose to share trips with, or when required by law. Your email address is never
        shown to other users.
      </p>

      <h2>4. Data retention</h2>
      <p>
        We keep your information for as long as your account is active. When you delete your account,
        we remove or anonymize your personal data, except where we&rsquo;re required to retain it for
        legal or accounting reasons.
      </p>

      <h2>5. Your rights &amp; choices</h2>
      <ul>
        <li>Access, update, or delete your information from your settings.</li>
        <li>Delete your account at any time.</li>
        <li>Manage notification preferences.</li>
        <li>
          Request a copy of your data by emailing us at{" "}
          <a href="mailto:privacy@getgoin.app">privacy@getgoin.app</a>.
        </li>
      </ul>

      <h2>6. Security</h2>
      <p>
        We use industry-standard measures to protect your data, including encryption in transit and
        access controls. No system is perfectly secure, but we work hard to safeguard your
        information.
      </p>

      <h2>7. Children</h2>
      <p>
        GetGoin is not intended for children under 13, and we do not knowingly collect personal
        information from them.
      </p>

      <h2>8. Changes</h2>
      <p>
        We may update this policy from time to time. If we make material changes, we&rsquo;ll notify
        you. The &ldquo;last updated&rdquo; date above always reflects the current version.
      </p>

      <h2>9. Contact</h2>
      <p>
        Questions about your privacy? Email{" "}
        <a href="mailto:privacy@getgoin.app">privacy@getgoin.app</a>.
      </p>
    </LegalPage>
  );
}
