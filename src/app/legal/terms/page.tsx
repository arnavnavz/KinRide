import Link from "next/link";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Terms of Service — Kayu",
  description: "Terms of Service for the Kayu ride-sharing platform.",
};

const sections = [
  { id: "acceptance", title: "Acceptance of Terms" },
  { id: "services", title: "Description of Services" },
  { id: "accounts", title: "Account Registration & Eligibility" },
  { id: "rider", title: "Rider Responsibilities" },
  { id: "driver", title: "Driver Responsibilities" },
  { id: "payments", title: "Payments & Fees" },
  { id: "kinpro", title: "KinPro Subscription" },
  { id: "promos", title: "Promo Codes & Referral Credits" },
  { id: "wallet", title: "Wallet & Credits" },
  { id: "cancellation", title: "Cancellation & Refund Policy" },
  { id: "safety", title: "Safety & Emergency Features" },
  { id: "ip", title: "Intellectual Property" },
  { id: "liability", title: "Limitation of Liability" },
  { id: "disputes", title: "Dispute Resolution" },
  { id: "modifications", title: "Modification of Terms" },
  { id: "termination", title: "Termination" },
  { id: "contact", title: "Contact Information" },
];

export default function TermsOfServicePage() {
  return (
    <div className="min-h-screen bg-white">
      {/* Header */}
      <header className="sticky top-0 z-30 bg-white border-b border-gray-200">
        <div className="max-w-3xl mx-auto px-6 py-4 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-1.5">
            <span className="text-xl font-bold text-primary">Kayu</span>
          </Link>
          <nav className="flex items-center gap-4 text-sm">
            <Link href="/legal/privacy" className="text-gray-500 hover:text-gray-900 transition-colors">Privacy</Link>
            <Link href="/legal/driver-agreement" className="text-gray-500 hover:text-gray-900 transition-colors">Driver Agreement</Link>
          </nav>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-6 py-12">
        {/* Title */}
        <div className="mb-10">
          <Link href="/" className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-primary transition-colors mb-6">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
            Back to Kayu
          </Link>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Terms of Service</h1>
          <p className="text-gray-500 text-sm">Last updated: February 2026 · Effective: March 2026</p>
          <p className="text-gray-600 text-sm mt-3 leading-relaxed">
            Welcome to Kayu. These Terms of Service (&quot;Terms&quot;) govern your access to and use of the Kayu
            ride-sharing platform, including our website, mobile application, and related services
            (collectively, the &quot;Platform&quot;), operated by Kayu, Inc. (&quot;Kayu,&quot; &quot;we,&quot; &quot;us,&quot; or &quot;our&quot;),
            currently piloting in Boston, Massachusetts.
          </p>
        </div>

        {/* Table of Contents */}
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

        {/* Sections */}
        <div className="space-y-10 text-gray-700 text-[15px] leading-relaxed">

          <section id="acceptance">
            <h2 className="text-xl font-semibold text-gray-900 mb-3">1. Acceptance of Terms</h2>
            <p className="mb-3">
              By accessing or using the Kayu Platform, you agree to be bound by these Terms, our Privacy Policy,
              and all applicable laws and regulations. If you do not agree to these Terms, you must not access or
              use the Platform.
            </p>
            <p>
              Your continued use of the Platform following any changes to these Terms constitutes acceptance of
              those changes. We encourage you to review these Terms periodically.
            </p>
          </section>

          <section id="services">
            <h2 className="text-xl font-semibold text-gray-900 mb-3">2. Description of Services</h2>
            <p className="mb-3">
              Kayu provides a technology platform that connects riders with independent, third-party transportation
              providers (&quot;Drivers&quot;). Kayu is not a transportation carrier, taxi service, or common carrier.
              Kayu does not provide transportation services. All transportation is provided by independent Drivers
              who are not employees, agents, or representatives of Kayu.
            </p>
            <p className="mb-3">The Platform enables:</p>
            <ul className="list-disc pl-6 space-y-1.5">
              <li>Riders to request rides from available Drivers or from their personal network of trusted Drivers (&quot;Kin&quot;)</li>
              <li>Drivers to receive and accept ride requests</li>
              <li>Real-time GPS tracking and trip sharing</li>
              <li>In-app payments and digital wallet functionality</li>
              <li>Rating and review systems</li>
              <li>AI-powered route and fare estimation</li>
              <li>Communication between Riders and Drivers</li>
            </ul>
          </section>

          <section id="accounts">
            <h2 className="text-xl font-semibold text-gray-900 mb-3">3. Account Registration & Eligibility</h2>
            <p className="mb-3">
              To use the Platform, you must create an account by providing accurate, current, and complete
              information. You must be at least <strong>18 years of age</strong> to register as a Rider and at
              least <strong>21 years of age</strong> to register as a Driver.
            </p>
            <p className="mb-3">You agree to:</p>
            <ul className="list-disc pl-6 space-y-1.5">
              <li>Maintain the security and confidentiality of your account credentials</li>
              <li>Promptly update your account information if it changes</li>
              <li>Accept responsibility for all activities that occur under your account</li>
              <li>Not create more than one account or transfer your account to any other person</li>
              <li>Notify us immediately of any unauthorized use of your account</li>
            </ul>
            <p className="mt-3">
              Kayu reserves the right to refuse, suspend, or terminate accounts at its discretion, including
              for violation of these Terms or for fraudulent activity.
            </p>
          </section>

          <section id="rider">
            <h2 className="text-xl font-semibold text-gray-900 mb-3">4. Rider Responsibilities</h2>
            <p className="mb-3">As a Rider, you agree to:</p>
            <ul className="list-disc pl-6 space-y-1.5">
              <li><strong>Payment:</strong> Pay all fares, fees, tolls, and applicable charges for completed rides. You authorize Kayu to charge your selected payment method or debit your Kayu Wallet.</li>
              <li><strong>Behavior:</strong> Treat Drivers with respect. You must not engage in discriminatory, abusive, threatening, or illegal behavior during any ride.</li>
              <li><strong>Accuracy:</strong> Provide accurate pickup and drop-off locations. You are responsible for being at the designated pickup point at the requested time.</li>
              <li><strong>Property:</strong> You are responsible for any damage to a Driver&apos;s vehicle caused by you or your guests.</li>
              <li><strong>Legal compliance:</strong> Comply with all applicable laws, including seatbelt usage and passenger capacity limits.</li>
              <li><strong>Cancellation:</strong> Cancellations made after a Driver has been dispatched may incur a cancellation fee as described in Section 10.</li>
            </ul>
          </section>

          <section id="driver">
            <h2 className="text-xl font-semibold text-gray-900 mb-3">5. Driver Responsibilities</h2>
            <p className="mb-3">As a Driver on the Kayu Platform, you agree to:</p>
            <ul className="list-disc pl-6 space-y-1.5">
              <li><strong>Licensing:</strong> Maintain a valid Massachusetts driver&apos;s license at all times</li>
              <li><strong>Insurance:</strong> Carry and maintain automobile insurance that meets or exceeds Massachusetts requirements, including TNC endorsement as required under MA General Laws Chapter 159A½</li>
              <li><strong>Vehicle standards:</strong> Operate a vehicle that is registered in Massachusetts, passes state inspection, and meets Kayu&apos;s vehicle requirements (model year 2012 or newer, 4 doors, no salvage title)</li>
              <li><strong>Background check:</strong> Submit to and pass an initial and ongoing background check administered through Checkr</li>
              <li><strong>Identity verification:</strong> Complete identity verification through Stripe Identity</li>
              <li><strong>Safety:</strong> Adhere to all traffic laws, maintain a safe driving environment, and never operate the vehicle under the influence of drugs or alcohol</li>
              <li><strong>Conduct:</strong> Treat all Riders with respect and professionalism. Discrimination of any kind is strictly prohibited.</li>
            </ul>
            <p className="mt-3">
              For a complete description of Driver obligations, please refer to the
              {" "}<Link href="/legal/driver-agreement" className="text-primary hover:underline">Driver Agreement</Link>.
            </p>
          </section>

          <section id="payments">
            <h2 className="text-xl font-semibold text-gray-900 mb-3">6. Payments & Fees</h2>
            <p className="mb-3">
              All payments are processed securely through Stripe. Kayu does not store your credit card
              information on its servers.
            </p>
            <h3 className="font-semibold text-gray-900 mt-4 mb-2">6.1 Fare Calculation</h3>
            <p className="mb-3">
              Fares are calculated based on distance, estimated duration, base fare, and applicable demand
              factors. A fare estimate is provided before you confirm a ride; actual charges may vary
              based on route changes, traffic, or detours.
            </p>
            <h3 className="font-semibold text-gray-900 mt-4 mb-2">6.2 Commission Structure</h3>
            <p className="mb-3">Kayu&apos;s commission on each ride depends on the relationship between the Rider and Driver:</p>
            <div className="overflow-x-auto">
              <table className="w-full text-sm border border-gray-200 rounded-lg overflow-hidden mt-2 mb-3">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="text-left px-4 py-2.5 font-semibold text-gray-900 border-b border-gray-200">Scenario</th>
                    <th className="text-left px-4 py-2.5 font-semibold text-gray-900 border-b border-gray-200">Commission</th>
                  </tr>
                </thead>
                <tbody>
                  <tr className="border-b border-gray-100">
                    <td className="px-4 py-2.5">Standard (no Kin, no KinPro)</td>
                    <td className="px-4 py-2.5 font-medium">15%</td>
                  </tr>
                  <tr className="border-b border-gray-100 bg-gray-50/50">
                    <td className="px-4 py-2.5">Driver has KinPro (no Kin)</td>
                    <td className="px-4 py-2.5 font-medium">10%</td>
                  </tr>
                  <tr className="border-b border-gray-100">
                    <td className="px-4 py-2.5">Rider is in Driver&apos;s Kin (no KinPro)</td>
                    <td className="px-4 py-2.5 font-medium">8%</td>
                  </tr>
                  <tr>
                    <td className="px-4 py-2.5">Kin ride + Driver has KinPro</td>
                    <td className="px-4 py-2.5 font-medium text-primary">0%</td>
                  </tr>
                </tbody>
              </table>
            </div>
            <h3 className="font-semibold text-gray-900 mt-4 mb-2">6.3 Payment Processing</h3>
            <p>
              Payment processing services are provided by Stripe and are subject to
              Stripe&apos;s terms and conditions. Kayu facilitates payments between Riders and Drivers
              but is not a party to the payment transaction between you and Stripe.
            </p>
          </section>

          <section id="kinpro">
            <h2 className="text-xl font-semibold text-gray-900 mb-3">7. KinPro Subscription</h2>
            <p className="mb-3">
              KinPro is a voluntary monthly subscription available to Drivers for <strong>$30.00 per month</strong>.
              KinPro benefits include:
            </p>
            <ul className="list-disc pl-6 space-y-1.5">
              <li>Reduced commission rates (10% standard, 0% for Kin rides)</li>
              <li>Priority placement in ride-matching algorithms</li>
              <li>Access to premium analytics and earnings insights</li>
              <li>Enhanced profile visibility to Riders</li>
            </ul>
            <p className="mt-3">
              KinPro subscriptions auto-renew monthly and can be canceled at any time through the
              Platform. Cancellation takes effect at the end of the current billing period. No partial
              refunds are provided for unused portions of a billing period.
            </p>
          </section>

          <section id="promos">
            <h2 className="text-xl font-semibold text-gray-900 mb-3">8. Promo Codes & Referral Credits</h2>
            <p className="mb-3">
              Kayu may offer promotional codes and referral credit programs from time to time. Promo
              codes are subject to the specific terms associated with each promotion, including
              expiration dates and usage limits.
            </p>
            <ul className="list-disc pl-6 space-y-1.5">
              <li>Promo codes are non-transferable and may only be used once unless otherwise stated</li>
              <li>Referral credits are applied to your Kayu Wallet upon the referred user&apos;s first completed ride</li>
              <li>Kayu reserves the right to modify or discontinue any promotional program at any time</li>
              <li>Abuse of promotional programs, including the creation of multiple accounts, may result in account termination</li>
            </ul>
          </section>

          <section id="wallet">
            <h2 className="text-xl font-semibold text-gray-900 mb-3">9. Wallet & Credits</h2>
            <p className="mb-3">
              The Kayu Wallet allows you to store credits that can be applied toward ride fares. Credits
              may be earned through referral programs, promotional offers, or loyalty rewards.
            </p>
            <ul className="list-disc pl-6 space-y-1.5">
              <li>Wallet credits have no cash value and cannot be redeemed for cash</li>
              <li>Credits are automatically applied to eligible rides</li>
              <li>Unused credits may expire as specified in the applicable promotional terms</li>
              <li>Wallet balances are non-transferable between accounts</li>
            </ul>
          </section>

          <section id="cancellation">
            <h2 className="text-xl font-semibold text-gray-900 mb-3">10. Cancellation & Refund Policy</h2>
            <h3 className="font-semibold text-gray-900 mt-4 mb-2">10.1 Rider Cancellation</h3>
            <ul className="list-disc pl-6 space-y-1.5">
              <li>Free cancellation within 2 minutes of ride confirmation</li>
              <li>A cancellation fee of up to $5.00 may apply after a Driver has been dispatched</li>
              <li>No-shows (failure to appear at the pickup location within 5 minutes of Driver arrival) may incur a fee equal to the cancellation fee plus the base fare</li>
            </ul>
            <h3 className="font-semibold text-gray-900 mt-4 mb-2">10.2 Driver Cancellation</h3>
            <ul className="list-disc pl-6 space-y-1.5 mb-3">
              <li>Excessive cancellations by Drivers may result in reduced ride-matching priority or temporary deactivation</li>
              <li>Drivers should only cancel rides for legitimate safety or operational reasons</li>
            </ul>
            <h3 className="font-semibold text-gray-900 mt-4 mb-2">10.3 Refunds</h3>
            <p>
              If you believe you were charged incorrectly, you may request a refund through the Platform
              within 14 days of the transaction. Kayu will review all refund requests and process
              approved refunds within 5–10 business days.
            </p>
          </section>

          <section id="safety">
            <h2 className="text-xl font-semibold text-gray-900 mb-3">11. Safety & Emergency Features</h2>
            <p className="mb-3">
              Kayu is committed to the safety of all users. The Platform includes the following safety features:
            </p>
            <ul className="list-disc pl-6 space-y-1.5">
              <li><strong>SOS button:</strong> An in-ride emergency button that connects you directly to 911 and shares your real-time location with emergency services</li>
              <li><strong>Trip sharing:</strong> Share a live trip link with friends or family so they can track your ride in real time</li>
              <li><strong>Driver verification:</strong> All Drivers undergo identity verification (Stripe Identity) and background checks (Checkr) before being approved on the Platform</li>
              <li><strong>Ride tracking:</strong> Real-time GPS tracking for all active rides, accessible to both Rider and Driver</li>
              <li><strong>Two-way ratings:</strong> Riders and Drivers rate each other after every trip to maintain community standards</li>
            </ul>
            <p className="mt-3">
              In case of a safety emergency, always call 911 first. Kayu&apos;s safety features are designed to
              supplement, not replace, emergency services.
            </p>
          </section>

          <section id="ip">
            <h2 className="text-xl font-semibold text-gray-900 mb-3">12. Intellectual Property</h2>
            <p className="mb-3">
              The Kayu name, logo, trademarks, and all content, features, and functionality of the
              Platform — including text, graphics, software, and design — are owned by Kayu, Inc. and
              are protected by United States and international copyright, trademark, and other
              intellectual property laws.
            </p>
            <p>
              You may not copy, modify, distribute, sell, or lease any part of the Platform or its
              content, nor may you reverse engineer or attempt to extract the source code of any
              software used in the Platform, except as permitted by law.
            </p>
          </section>

          <section id="liability">
            <h2 className="text-xl font-semibold text-gray-900 mb-3">13. Limitation of Liability</h2>
            <p className="mb-3">
              TO THE MAXIMUM EXTENT PERMITTED BY APPLICABLE LAW, KAYU AND ITS OFFICERS, DIRECTORS,
              EMPLOYEES, AND AGENTS SHALL NOT BE LIABLE FOR ANY INDIRECT, INCIDENTAL, SPECIAL,
              CONSEQUENTIAL, OR PUNITIVE DAMAGES, INCLUDING BUT NOT LIMITED TO LOSS OF PROFITS, DATA,
              USE, GOODWILL, OR OTHER INTANGIBLE LOSSES, ARISING OUT OF OR IN CONNECTION WITH:
            </p>
            <ul className="list-disc pl-6 space-y-1.5 mb-3">
              <li>Your access to or use of (or inability to access or use) the Platform</li>
              <li>Any conduct or content of any third party on the Platform, including Drivers or Riders</li>
              <li>Any transportation services provided by Drivers</li>
              <li>Unauthorized access, use, or alteration of your transmissions or content</li>
            </ul>
            <p>
              IN NO EVENT SHALL KAYU&apos;S TOTAL LIABILITY TO YOU FOR ALL CLAIMS ARISING FROM OR RELATED TO
              THE PLATFORM EXCEED THE AMOUNT YOU PAID TO KAYU IN THE SIX (6) MONTHS PRECEDING THE EVENT
              GIVING RISE TO THE CLAIM, OR ONE HUNDRED DOLLARS ($100), WHICHEVER IS GREATER.
            </p>
          </section>

          <section id="disputes">
            <h2 className="text-xl font-semibold text-gray-900 mb-3">14. Dispute Resolution</h2>
            <p className="mb-3">
              These Terms are governed by and construed in accordance with the laws of the
              <strong> Commonwealth of Massachusetts</strong>, without regard to its conflict of law principles.
            </p>
            <p className="mb-3">
              Any dispute arising out of or relating to these Terms or the Platform shall first be
              submitted to good-faith mediation. If mediation is unsuccessful, the dispute shall be
              resolved by binding arbitration administered by the American Arbitration Association (AAA)
              under its Consumer Arbitration Rules, conducted in Boston, Massachusetts.
            </p>
            <p>
              YOU AND KAYU AGREE THAT EACH MAY BRING CLAIMS AGAINST THE OTHER ONLY IN YOUR OR ITS
              INDIVIDUAL CAPACITY AND NOT AS A PLAINTIFF OR CLASS MEMBER IN ANY PURPORTED CLASS OR
              REPRESENTATIVE PROCEEDING.
            </p>
          </section>

          <section id="modifications">
            <h2 className="text-xl font-semibold text-gray-900 mb-3">15. Modification of Terms</h2>
            <p className="mb-3">
              Kayu reserves the right to modify these Terms at any time. We will provide notice of
              material changes by posting the updated Terms on the Platform and updating the &quot;Last
              updated&quot; date. For significant changes, we may also provide notice via email or in-app
              notification.
            </p>
            <p>
              Your continued use of the Platform after the effective date of any modifications
              constitutes your acceptance of the updated Terms. If you do not agree to the modified
              Terms, you must stop using the Platform.
            </p>
          </section>

          <section id="termination">
            <h2 className="text-xl font-semibold text-gray-900 mb-3">16. Termination</h2>
            <p className="mb-3">
              You may terminate your account at any time by contacting us or through your account
              settings. Kayu may suspend or terminate your access to the Platform at any time, with or
              without cause or notice, including for violation of these Terms.
            </p>
            <p>
              Upon termination, your right to use the Platform ceases immediately. Sections of these
              Terms that by their nature should survive termination — including intellectual property,
              limitation of liability, dispute resolution, and indemnification — shall survive.
            </p>
          </section>

          <section id="contact">
            <h2 className="text-xl font-semibold text-gray-900 mb-3">17. Contact Information</h2>
            <p className="mb-3">
              If you have any questions about these Terms of Service, please contact us:
            </p>
            <div className="bg-gray-50 rounded-xl border border-gray-200 p-5">
              <p className="font-semibold text-gray-900">Kayu, Inc.</p>
              <p className="mt-1">Boston, Massachusetts</p>
              <p className="mt-1">
                Email:{" "}
                <a href="mailto:support@kayu.app" className="text-primary hover:underline">
                  support@kayu.app
                </a>
              </p>
            </div>
          </section>
        </div>

        {/* Footer */}
        <footer className="mt-16 pt-8 border-t border-gray-200">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="flex items-center gap-1.5">
              <span className="font-bold text-primary">Kayu</span>
              <span className="text-gray-400 text-sm ml-2">© 2026 Kayu, Inc.</span>
            </div>
            <div className="flex items-center gap-4 text-sm">
              <Link href="/legal/privacy" className="text-gray-500 hover:text-primary transition-colors">Privacy Policy</Link>
              <Link href="/legal/driver-agreement" className="text-gray-500 hover:text-primary transition-colors">Driver Agreement</Link>
            </div>
          </div>
        </footer>
      </main>
    </div>
  );
}
