import type { Metadata } from "next";
import LegalPage from "@/components/legal/LegalPage";

export const metadata: Metadata = {
  title: "Terms of Service",
  description: "The terms that govern your use of GetGoin.",
};

export default function TermsPage() {
  return (
    <LegalPage title="Terms of Service" updated="May 30, 2026">
      <p>
        Welcome to GetGoin. These Terms of Service (&ldquo;Terms&rdquo;) govern your access to and
        use of the GetGoin website, apps, and services (collectively, the &ldquo;Service&rdquo;). By
        creating an account or using the Service, you agree to these Terms.
      </p>

      <h2>1. Your account</h2>
      <p>
        You must provide accurate information when you sign up and keep it up to date. You are
        responsible for activity that happens under your account and for keeping your login secure.
        You must be at least 13 years old to use the Service.
      </p>

      <h2>2. Acceptable use</h2>
      <p>You agree not to:</p>
      <ul>
        <li>Break the law or infringe anyone&rsquo;s rights while using the Service.</li>
        <li>Upload harmful, abusive, or misleading content.</li>
        <li>Attempt to disrupt, reverse-engineer, or gain unauthorized access to the Service.</li>
        <li>Use the Service to send spam or harvest other users&rsquo; data.</li>
      </ul>

      <h2>3. Your content</h2>
      <p>
        You keep ownership of the trips, posts, and other content you create. By posting content you
        grant GetGoin a worldwide, non-exclusive license to host and display it for the purpose of
        operating the Service. You are responsible for the content you share with others.
      </p>

      <h2>4. Premium and payments</h2>
      <p>
        Some features require a paid subscription. Prices and what&rsquo;s included are shown before
        you purchase. Subscriptions renew automatically until cancelled, and you can cancel at any
        time from your billing settings. Except where required by law, payments are non-refundable.
      </p>

      <h2>5. Third-party services</h2>
      <p>
        Flight, hotel, and activity results are provided by third parties. GetGoin is not
        responsible for the accuracy, availability, or fulfillment of those offers, and your
        bookings may be subject to the providers&rsquo; own terms.
      </p>

      <h2>6. Termination</h2>
      <p>
        You can stop using the Service and delete your account at any time. We may suspend or
        terminate access if you violate these Terms or use the Service in a way that could harm
        GetGoin or other users.
      </p>

      <h2>7. Disclaimers &amp; liability</h2>
      <p>
        The Service is provided &ldquo;as is&rdquo; without warranties of any kind. To the maximum
        extent permitted by law, GetGoin is not liable for indirect, incidental, or consequential
        damages arising from your use of the Service.
      </p>

      <h2>8. Changes</h2>
      <p>
        We may update these Terms from time to time. If we make material changes, we&rsquo;ll let you
        know. Continued use of the Service after changes take effect means you accept the updated
        Terms.
      </p>

      <h2>9. Contact</h2>
      <p>
        Questions about these Terms? Reach us at{" "}
        <a href="mailto:support@getgoin.app">support@getgoin.app</a>.
      </p>
    </LegalPage>
  );
}
