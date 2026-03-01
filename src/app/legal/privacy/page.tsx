import Link from "next/link";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Privacy Policy — Kayu",
  description: "Privacy Policy for the Kayu ride-sharing platform.",
};

const sections = [
  { id: "overview", title: "Overview" },
  { id: "data-collected", title: "Information We Collect" },
  { id: "how-we-use", title: "How We Use Your Information" },
  { id: "location", title: "Location Data" },
  { id: "payment-data", title: "Payment Data" },
  { id: "sharing", title: "Data Sharing & Disclosure" },
  { id: "retention", title: "Data Retention" },
  { id: "your-rights", title: "Your Rights & Choices" },
  { id: "massachusetts", title: "Massachusetts-Specific Rights" },
  { id: "ccpa", title: "CCPA Compliance" },
  { id: "children", title: "Children's Privacy" },
  { id: "security", title: "Security Measures" },
  { id: "cookies", title: "Cookies & Tracking Technologies" },
  { id: "changes", title: "Changes to This Policy" },
  { id: "contact", title: "Contact Information" },
];

export default function PrivacyPolicyPage() {
  return (
    <div className="min-h-screen bg-white">
      <header className="sticky top-0 z-30 bg-white border-b border-gray-200">
        <div className="max-w-3xl mx-auto px-6 py-4 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-1.5">
            <span className="text-xl font-bold text-primary">Kayu</span>
          </Link>
          <nav className="flex items-center gap-4 text-sm">
            <Link href="/legal/terms" className="text-gray-500 hover:text-gray-900 transition-colors">Terms</Link>
            <Link href="/legal/driver-agreement" className="text-gray-500 hover:text-gray-900 transition-colors">Driver Agreement</Link>
          </nav>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-6 py-12">
        <div className="mb-10">
          <Link href="/" className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-primary transition-colors mb-6">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
            Back to Kayu
          </Link>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Privacy Policy</h1>
          <p className="text-gray-500 text-sm">Last updated: February 2026 · Effective: March 2026</p>
          <p className="text-gray-600 text-sm mt-3 leading-relaxed">
            This Privacy Policy describes how Kayu, Inc. (&quot;Kayu,&quot; &quot;we,&quot; &quot;us,&quot; or &quot;our&quot;)
            collects, uses, shares, and protects your personal information when you use the Kayu ride-sharing
            platform (the &quot;Platform&quot;), currently piloting in Boston, Massachusetts. We are committed to
            protecting your privacy and complying with applicable data protection laws, including the
            Massachusetts Right of Privacy Act and the California Consumer Privacy Act (CCPA).
          </p>
        </div>

        <nav className="mb-12 rounded-xl border border-gray-200 bg-gray-50 p-6">
          <h2 className="text-sm font-semibold text-gray-900 uppercase tracking-wide mb-4">Table of Contents</h2>
          <ol className="space-y-1.5">
            {sections.map((s, i) => (
              <li key={s.id}>
                <a href={`#${s.id}`} className="text-sm text-gray-600 hover:text-primary transition-colors">
                  {i + 1}. {s.title}
                </a>
              </li>
            ))}
          </ol>
        </nav>

        <div className="space-y-10 text-gray-700 text-[15px] leading-relaxed">

          <section id="overview">
            <h2 className="text-xl font-semibold text-gray-900 mb-3">1. Overview</h2>
            <p className="mb-3">
              By using the Kayu Platform, you consent to the data practices described in this Privacy Policy.
              If you do not agree with these practices, please do not use the Platform. This policy applies to
              all users of the Platform, including Riders, Drivers, and visitors to our website.
            </p>
            <p>
              We may update this Privacy Policy from time to time. We will notify you of material changes by
              posting the updated policy on the Platform and updating the &quot;Last updated&quot; date above.
            </p>
          </section>

          <section id="data-collected">
            <h2 className="text-xl font-semibold text-gray-900 mb-3">2. Information We Collect</h2>
            <p className="mb-3">We collect the following categories of information:</p>

            <h3 className="font-semibold text-gray-900 mt-4 mb-2">2.1 Personal Information You Provide</h3>
            <ul className="list-disc pl-6 space-y-1.5">
              <li><strong>Account information:</strong> Name, email address, phone number, profile photo</li>
              <li><strong>Driver-specific information:</strong> Driver&apos;s license number, vehicle registration, insurance documentation, date of birth</li>
              <li><strong>Identity verification:</strong> Government-issued ID (processed through Stripe Identity)</li>
              <li><strong>Payment information:</strong> Payment method details (processed and stored by Stripe; we do not store card numbers)</li>
              <li><strong>Communications:</strong> In-app messages, support inquiries, and feedback</li>
            </ul>

            <h3 className="font-semibold text-gray-900 mt-4 mb-2">2.2 Information Collected Automatically</h3>
            <ul className="list-disc pl-6 space-y-1.5">
              <li><strong>Location data:</strong> Real-time GPS location during active rides (see Section 4)</li>
              <li><strong>Device information:</strong> Device type, operating system, browser type, unique device identifiers, IP address</li>
              <li><strong>Usage data:</strong> App interactions, features used, pages visited, timestamps, ride history</li>
              <li><strong>Log data:</strong> Server logs including access times, error reports, and referring URLs</li>
            </ul>

            <h3 className="font-semibold text-gray-900 mt-4 mb-2">2.3 Information from Third Parties</h3>
            <ul className="list-disc pl-6 space-y-1.5">
              <li><strong>Background check results:</strong> Criminal history and driving record information from Checkr (Drivers only)</li>
              <li><strong>Payment processing data:</strong> Transaction confirmations and payment status from Stripe</li>
              <li><strong>Authentication providers:</strong> Account information from Google or other OAuth providers if used for sign-in</li>
            </ul>
          </section>

          <section id="how-we-use">
            <h2 className="text-xl font-semibold text-gray-900 mb-3">3. How We Use Your Information</h2>
            <p className="mb-3">We use the information we collect for the following purposes:</p>

            <h3 className="font-semibold text-gray-900 mt-4 mb-2">3.1 Providing Services</h3>
            <ul className="list-disc pl-6 space-y-1.5">
              <li>Matching Riders with available Drivers</li>
              <li>Processing ride requests, fare calculations, and payments</li>
              <li>Enabling real-time ride tracking and navigation</li>
              <li>Facilitating communication between Riders and Drivers</li>
              <li>Managing your account, Kin network, and Kayu Wallet</li>
            </ul>

            <h3 className="font-semibold text-gray-900 mt-4 mb-2">3.2 Safety & Security</h3>
            <ul className="list-disc pl-6 space-y-1.5">
              <li>Verifying Driver identity and eligibility</li>
              <li>Conducting and monitoring background checks</li>
              <li>Detecting and preventing fraud, abuse, and unauthorized activity</li>
              <li>Supporting SOS and emergency features</li>
              <li>Maintaining trip records for safety and dispute resolution</li>
            </ul>

            <h3 className="font-semibold text-gray-900 mt-4 mb-2">3.3 Analytics & Improvement</h3>
            <ul className="list-disc pl-6 space-y-1.5">
              <li>Analyzing usage patterns to improve the Platform</li>
              <li>Optimizing ride-matching algorithms and fare estimation</li>
              <li>Conducting research and generating aggregate, de-identified insights</li>
            </ul>

            <h3 className="font-semibold text-gray-900 mt-4 mb-2">3.4 Communications</h3>
            <ul className="list-disc pl-6 space-y-1.5">
              <li>Sending ride confirmations, receipts, and status updates</li>
              <li>Delivering push notifications about ride activity</li>
              <li>Sending promotional offers, promo codes, and referral information (with your consent)</li>
              <li>Responding to customer support requests</li>
            </ul>
          </section>

          <section id="location">
            <h2 className="text-xl font-semibold text-gray-900 mb-3">4. Location Data</h2>
            <p className="mb-3">
              Location data is a critical component of the ride-sharing experience. We want you to understand
              exactly how we collect and use it:
            </p>
            <ul className="list-disc pl-6 space-y-1.5">
              <li><strong>During active rides:</strong> We collect real-time GPS location data from both Riders and Drivers to enable ride tracking, navigation, fare calculation, and safety features (such as trip sharing and SOS)</li>
              <li><strong>When not on a ride:</strong> We do not continuously track your location. Location data is collected only when you actively open the app to request a ride or when a Driver is online and available for ride requests</li>
              <li><strong>Trip sharing:</strong> When you share a trip link, the recipient can view your real-time location for the duration of that ride only</li>
              <li><strong>Ride history:</strong> Pickup and drop-off locations are stored as part of your ride history</li>
            </ul>
            <p className="mt-3">
              You may disable location services for the Kayu app in your device settings, but this will
              prevent the Platform from functioning properly and you will not be able to request or provide rides.
            </p>
          </section>

          <section id="payment-data">
            <h2 className="text-xl font-semibold text-gray-900 mb-3">5. Payment Data</h2>
            <p className="mb-3">
              All payment processing is handled by our third-party payment processor, <strong>Stripe</strong>.
              When you add a payment method to Kayu:
            </p>
            <ul className="list-disc pl-6 space-y-1.5">
              <li>Your credit card number, debit card number, or bank account details are transmitted directly to and stored by Stripe</li>
              <li><strong>Kayu does not store, process, or have access to your full card numbers</strong></li>
              <li>We receive only a tokenized reference, card brand, last four digits, and expiration date from Stripe for display purposes</li>
              <li>Stripe is PCI-DSS Level 1 certified, the highest level of payment security certification</li>
              <li>Driver payouts are processed through Stripe Connect and are subject to Stripe&apos;s terms</li>
            </ul>
            <p className="mt-3">
              For more information about how Stripe handles your payment data, please review{" "}
              <a href="https://stripe.com/privacy" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">
                Stripe&apos;s Privacy Policy
              </a>.
            </p>
          </section>

          <section id="sharing">
            <h2 className="text-xl font-semibold text-gray-900 mb-3">6. Data Sharing & Disclosure</h2>
            <p className="mb-3">
              We do not sell your personal information. We share your data only in the following circumstances:
            </p>

            <h3 className="font-semibold text-gray-900 mt-4 mb-2">6.1 With Other Users</h3>
            <ul className="list-disc pl-6 space-y-1.5 mb-3">
              <li><strong>Riders:</strong> When matched with a Driver, we share your first name, pickup/drop-off locations, and profile photo with your Driver</li>
              <li><strong>Drivers:</strong> When matched with a Rider, we share your first name, profile photo, vehicle information, license plate, and real-time location with your Rider</li>
              <li><strong>Trip sharing recipients:</strong> When a Rider shares their trip, the recipient can view the Driver&apos;s name, vehicle info, and real-time trip progress</li>
            </ul>

            <h3 className="font-semibold text-gray-900 mt-4 mb-2">6.2 With Service Providers</h3>
            <ul className="list-disc pl-6 space-y-1.5 mb-3">
              <li><strong>Stripe:</strong> Payment processing, identity verification, and Driver onboarding</li>
              <li><strong>Checkr:</strong> Background checks for Drivers (criminal history and driving record screening)</li>
              <li><strong>Mapping services:</strong> Route calculation and geocoding</li>
              <li><strong>Analytics providers:</strong> Aggregate usage analytics to improve the Platform</li>
              <li><strong>Cloud infrastructure:</strong> Data storage and hosting</li>
            </ul>

            <h3 className="font-semibold text-gray-900 mt-4 mb-2">6.3 Legal & Safety</h3>
            <p className="mb-3">We may disclose your information when we believe in good faith that disclosure is necessary to:</p>
            <ul className="list-disc pl-6 space-y-1.5">
              <li>Comply with applicable law, regulation, legal process, or governmental request</li>
              <li>Enforce our Terms of Service or other agreements</li>
              <li>Protect the safety, rights, or property of Kayu, our users, or the public</li>
              <li>Detect, prevent, or address fraud, security, or technical issues</li>
              <li>Respond to an emergency involving danger of death or serious physical injury</li>
            </ul>

            <h3 className="font-semibold text-gray-900 mt-4 mb-2">6.4 Business Transfers</h3>
            <p>
              In the event of a merger, acquisition, reorganization, bankruptcy, or sale of assets, your
              personal information may be transferred as part of that transaction. We will notify you of
              any such change in ownership or control of your personal information.
            </p>
          </section>

          <section id="retention">
            <h2 className="text-xl font-semibold text-gray-900 mb-3">7. Data Retention</h2>
            <p className="mb-3">
              We retain your personal information for as long as necessary to provide our services and
              fulfill the purposes described in this Privacy Policy. Specifically:
            </p>
            <ul className="list-disc pl-6 space-y-1.5">
              <li><strong>Account data:</strong> Retained for the duration of your account and for 30 days after account deletion to allow for recovery</li>
              <li><strong>Ride history:</strong> Retained for 3 years for safety, legal, and regulatory purposes</li>
              <li><strong>Location data:</strong> Real-time location data is retained for 90 days; pickup and drop-off locations are retained as part of ride history</li>
              <li><strong>Payment records:</strong> Retained for 7 years to comply with tax and financial reporting requirements</li>
              <li><strong>Background check records:</strong> Retained in accordance with Checkr&apos;s policies and applicable law</li>
              <li><strong>Support communications:</strong> Retained for 2 years after resolution</li>
            </ul>
            <p className="mt-3">
              After the applicable retention period, data is securely deleted or anonymized so that it can
              no longer be associated with you.
            </p>
          </section>

          <section id="your-rights">
            <h2 className="text-xl font-semibold text-gray-900 mb-3">8. Your Rights & Choices</h2>
            <p className="mb-3">You have the following rights regarding your personal information:</p>
            <ul className="list-disc pl-6 space-y-1.5">
              <li><strong>Access:</strong> Request a copy of the personal information we hold about you</li>
              <li><strong>Correction:</strong> Request that we correct inaccurate or incomplete personal information</li>
              <li><strong>Deletion:</strong> Request that we delete your personal information, subject to legal retention requirements</li>
              <li><strong>Data portability:</strong> Request your data in a commonly used, machine-readable format</li>
              <li><strong>Opt-out of marketing:</strong> Unsubscribe from promotional emails and push notifications at any time through your account settings</li>
              <li><strong>Withdraw consent:</strong> Where processing is based on consent, you may withdraw it at any time</li>
            </ul>
            <p className="mt-3">
              To exercise any of these rights, please contact us at{" "}
              <a href="mailto:privacy@kayu.app" className="text-primary hover:underline">privacy@kayu.app</a>.
              We will respond to your request within 30 days. We will not discriminate against you for
              exercising any of these rights.
            </p>
          </section>

          <section id="massachusetts">
            <h2 className="text-xl font-semibold text-gray-900 mb-3">9. Massachusetts-Specific Rights</h2>
            <p className="mb-3">
              As a company operating in the Commonwealth of Massachusetts, we comply with Massachusetts
              data protection laws, including:
            </p>
            <ul className="list-disc pl-6 space-y-1.5">
              <li><strong>MA Data Breach Notification Law (M.G.L. c. 93H):</strong> We will promptly notify affected individuals and the Massachusetts Attorney General&apos;s Office in the event of a data breach involving personal information</li>
              <li><strong>Standards for Protection of Personal Information (201 CMR 17.00):</strong> We maintain a comprehensive written information security program that includes administrative, technical, and physical safeguards to protect personal information</li>
              <li><strong>MA Right of Privacy:</strong> We respect your right to privacy under the Massachusetts Declaration of Rights, Article 14, and do not engage in unreasonable surveillance or data collection</li>
            </ul>
            <p className="mt-3">
              Massachusetts residents may file complaints regarding data privacy with the Massachusetts
              Attorney General&apos;s Office, Consumer Protection Division.
            </p>
          </section>

          <section id="ccpa">
            <h2 className="text-xl font-semibold text-gray-900 mb-3">10. CCPA Compliance</h2>
            <p className="mb-3">
              Although Kayu is based in Massachusetts, we extend California Consumer Privacy Act (CCPA) rights
              to all of our users. Under the CCPA, you have the right to:
            </p>
            <ul className="list-disc pl-6 space-y-1.5">
              <li><strong>Know:</strong> Request disclosure of the categories and specific pieces of personal information we have collected about you</li>
              <li><strong>Delete:</strong> Request deletion of your personal information</li>
              <li><strong>Opt-out of sale:</strong> We do not sell your personal information. If we ever change this practice, we will provide a &quot;Do Not Sell My Personal Information&quot; link</li>
              <li><strong>Non-discrimination:</strong> We will not deny you services, charge different prices, or provide a different quality of service for exercising your CCPA rights</li>
            </ul>
            <p className="mt-3">
              In the preceding 12 months, we have collected the categories of personal information described
              in Section 2. We have not sold any personal information. We have disclosed personal information
              for business purposes as described in Section 6.
            </p>
          </section>

          <section id="children">
            <h2 className="text-xl font-semibold text-gray-900 mb-3">11. Children&apos;s Privacy</h2>
            <p className="mb-3">
              The Kayu Platform is not intended for use by anyone under the age of <strong>18</strong>. We do
              not knowingly collect personal information from children under 18. If we learn that we have
              collected personal information from a child under 18, we will take steps to delete that
              information as quickly as possible.
            </p>
            <p>
              If you are a parent or guardian and believe your child has provided us with personal information,
              please contact us at{" "}
              <a href="mailto:privacy@kayu.app" className="text-primary hover:underline">privacy@kayu.app</a>.
            </p>
          </section>

          <section id="security">
            <h2 className="text-xl font-semibold text-gray-900 mb-3">12. Security Measures</h2>
            <p className="mb-3">
              We implement industry-standard security measures to protect your personal information,
              including:
            </p>
            <ul className="list-disc pl-6 space-y-1.5">
              <li>Encryption of data in transit (TLS/SSL) and at rest</li>
              <li>Secure authentication with session management and optional multi-factor authentication</li>
              <li>Regular security assessments and vulnerability testing</li>
              <li>Access controls limiting employee access to personal information on a need-to-know basis</li>
              <li>Secure development practices and code review processes</li>
              <li>Incident response procedures for detecting and responding to security events</li>
            </ul>
            <p className="mt-3">
              While we strive to protect your personal information, no method of electronic transmission
              or storage is 100% secure. We cannot guarantee absolute security, but we are committed to
              maintaining appropriate safeguards.
            </p>
          </section>

          <section id="cookies">
            <h2 className="text-xl font-semibold text-gray-900 mb-3">13. Cookies & Tracking Technologies</h2>
            <p className="mb-3">
              We use cookies and similar tracking technologies to operate and improve the Platform:
            </p>
            <ul className="list-disc pl-6 space-y-1.5">
              <li><strong>Essential cookies:</strong> Required for the Platform to function, including session management and authentication. These cannot be disabled.</li>
              <li><strong>Analytics cookies:</strong> Help us understand how users interact with the Platform so we can improve it. You may opt out of analytics cookies through your browser settings.</li>
              <li><strong>Preference cookies:</strong> Remember your settings and preferences (such as language, theme, and notification preferences)</li>
            </ul>
            <p className="mt-3">
              We do not use third-party advertising cookies or tracking pixels. You can manage cookie
              preferences through your browser settings. Note that disabling essential cookies may affect
              Platform functionality.
            </p>
          </section>

          <section id="changes">
            <h2 className="text-xl font-semibold text-gray-900 mb-3">14. Changes to This Policy</h2>
            <p className="mb-3">
              We may update this Privacy Policy from time to time to reflect changes in our practices,
              technology, legal requirements, or other factors. When we make material changes:
            </p>
            <ul className="list-disc pl-6 space-y-1.5">
              <li>We will update the &quot;Last updated&quot; date at the top of this policy</li>
              <li>We will post the revised policy on the Platform</li>
              <li>For significant changes, we will provide notice via email or in-app notification</li>
              <li>We may ask for your renewed consent where required by law</li>
            </ul>
            <p className="mt-3">
              We encourage you to review this Privacy Policy periodically. Your continued use of the
              Platform after the effective date of any changes constitutes your acceptance of the
              updated policy.
            </p>
          </section>

          <section id="contact">
            <h2 className="text-xl font-semibold text-gray-900 mb-3">15. Contact Information</h2>
            <p className="mb-3">
              If you have questions, concerns, or requests regarding this Privacy Policy or our data
              practices, please contact us:
            </p>
            <div className="bg-gray-50 rounded-xl border border-gray-200 p-5">
              <p className="font-semibold text-gray-900">Kayu, Inc. — Privacy Team</p>
              <p className="mt-1">Boston, Massachusetts</p>
              <p className="mt-1">
                Email:{" "}
                <a href="mailto:privacy@kayu.app" className="text-primary hover:underline">
                  privacy@kayu.app
                </a>
              </p>
            </div>
            <p className="mt-4 text-sm text-gray-500">
              For general support inquiries, please contact{" "}
              <a href="mailto:support@kayu.app" className="text-primary hover:underline">support@kayu.app</a>.
            </p>
          </section>
        </div>

        <footer className="mt-16 pt-8 border-t border-gray-200">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="flex items-center gap-1.5">
              <span className="font-bold text-primary">Kayu</span>
              <span className="text-gray-400 text-sm ml-2">© 2026 Kayu, Inc.</span>
            </div>
            <div className="flex items-center gap-4 text-sm">
              <Link href="/legal/terms" className="text-gray-500 hover:text-primary transition-colors">Terms of Service</Link>
              <Link href="/legal/driver-agreement" className="text-gray-500 hover:text-primary transition-colors">Driver Agreement</Link>
            </div>
          </div>
        </footer>
      </main>
    </div>
  );
}
