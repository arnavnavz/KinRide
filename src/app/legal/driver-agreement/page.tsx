import Link from "next/link";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Driver Agreement — Kayu",
  description: "Independent Driver Agreement for the Kayu ride-sharing platform.",
};

const sections = [
  { id: "relationship", title: "Independent Contractor Relationship" },
  { id: "eligibility", title: "Eligibility Requirements" },
  { id: "verification", title: "Verification Process" },
  { id: "commission", title: "Commission Structure" },
  { id: "kinpro", title: "KinPro Subscription" },
  { id: "kin-code", title: "Kin Code System" },
  { id: "payments", title: "Payment & Payout Schedule" },
  { id: "vehicle", title: "Vehicle & Safety Requirements" },
  { id: "insurance", title: "Insurance Requirements" },
  { id: "conduct", title: "Conduct Standards" },
  { id: "deactivation", title: "Deactivation Criteria" },
  { id: "data", title: "Data & Privacy" },
  { id: "ip", title: "Intellectual Property" },
  { id: "indemnification", title: "Indemnification" },
  { id: "tnc", title: "Massachusetts TNC Compliance" },
  { id: "governing-law", title: "Governing Law" },
  { id: "modifications", title: "Modifications to This Agreement" },
  { id: "termination", title: "Termination" },
  { id: "contact", title: "Contact Information" },
];

export default function DriverAgreementPage() {
  return (
    <div className="min-h-screen bg-white">
      <header className="sticky top-0 z-30 bg-white border-b border-gray-200">
        <div className="max-w-3xl mx-auto px-6 py-4 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-1.5">
            <span className="text-xl font-bold text-primary">Kayu</span>
          </Link>
          <nav className="flex items-center gap-4 text-sm">
            <Link href="/legal/terms" className="text-gray-500 hover:text-gray-900 transition-colors">Terms</Link>
            <Link href="/legal/privacy" className="text-gray-500 hover:text-gray-900 transition-colors">Privacy</Link>
          </nav>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-6 py-12">
        <div className="mb-10">
          <Link href="/" className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-primary transition-colors mb-6">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
            Back to Kayu
          </Link>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Driver Agreement</h1>
          <p className="text-gray-500 text-sm">Last updated: February 2026 · Effective: March 2026</p>
          <p className="text-gray-600 text-sm mt-3 leading-relaxed">
            This Independent Driver Agreement (&quot;Agreement&quot;) is entered into between you (&quot;Driver,&quot;
            &quot;you,&quot; or &quot;your&quot;) and Kayu, Inc. (&quot;Kayu,&quot; &quot;we,&quot; &quot;us,&quot; or &quot;our&quot;),
            and governs your use of the Kayu ride-sharing platform (the &quot;Platform&quot;) as an independent
            transportation provider. The Platform is currently operating as a pilot in Boston, Massachusetts.
            By registering as a Driver on the Platform, you agree to the terms of this Agreement.
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

          <section id="relationship">
            <h2 className="text-xl font-semibold text-gray-900 mb-3">1. Independent Contractor Relationship</h2>
            <p className="mb-3">
              You acknowledge and agree that you are an <strong>independent contractor</strong> and not an
              employee, agent, joint venturer, or partner of Kayu. Nothing in this Agreement creates an
              employment relationship between you and Kayu. You are not entitled to any employee benefits,
              including but not limited to health insurance, workers&apos; compensation, unemployment insurance,
              or retirement benefits from Kayu.
            </p>
            <p className="mb-3">As an independent contractor, you:</p>
            <ul className="list-disc pl-6 space-y-1.5">
              <li>Have full discretion to accept or reject any ride request</li>
              <li>Set your own schedule and determine when, where, and for how long you use the Platform</li>
              <li>Are free to use other ride-sharing or transportation platforms simultaneously</li>
              <li>Provide your own vehicle, smartphone, and other tools necessary to perform transportation services</li>
              <li>Are solely responsible for your own tax obligations, including self-employment taxes, quarterly estimated payments, and annual filings</li>
            </ul>
            <p className="mt-3">
              Kayu will issue a Form 1099-NEC (or applicable tax form) for earnings exceeding applicable
              IRS thresholds. You are responsible for maintaining your own records and filing your own taxes.
            </p>
          </section>

          <section id="eligibility">
            <h2 className="text-xl font-semibold text-gray-900 mb-3">2. Eligibility Requirements</h2>
            <p className="mb-3">To register and remain active as a Driver on the Kayu Platform, you must meet all of the following requirements:</p>

            <h3 className="font-semibold text-gray-900 mt-4 mb-2">2.1 Personal Requirements</h3>
            <ul className="list-disc pl-6 space-y-1.5">
              <li>Be at least <strong>21 years of age</strong></li>
              <li>Hold a valid <strong>Massachusetts driver&apos;s license</strong> (or valid license from another U.S. state with Massachusetts driving privileges) for at least one (1) year</li>
              <li>Have a clean driving record with no more than three (3) minor violations in the past three (3) years</li>
              <li>Have no DUI/DWI convictions in the past seven (7) years</li>
              <li>Have no felony convictions in the past seven (7) years</li>
              <li>Be legally authorized to work in the United States</li>
            </ul>

            <h3 className="font-semibold text-gray-900 mt-4 mb-2">2.2 Vehicle Requirements</h3>
            <ul className="list-disc pl-6 space-y-1.5">
              <li>Model year <strong>2012 or newer</strong></li>
              <li>Four (4) doors</li>
              <li>Registered in the Commonwealth of Massachusetts with a current registration</li>
              <li>Passes a current Massachusetts state inspection</li>
              <li>No salvage or rebuilt title</li>
              <li>Seats at least four (4) passengers (excluding the driver)</li>
              <li>Maintained in good mechanical condition, clean, and free of cosmetic damage that could affect safety or passenger comfort</li>
            </ul>
          </section>

          <section id="verification">
            <h2 className="text-xl font-semibold text-gray-900 mb-3">3. Verification Process</h2>
            <p className="mb-3">
              Before you can accept rides on the Platform, you must complete the following verification steps:
            </p>

            <h3 className="font-semibold text-gray-900 mt-4 mb-2">3.1 Identity Verification</h3>
            <p className="mb-3">
              You must complete identity verification through <strong>Stripe Identity</strong>. This involves
              submitting a photo of your government-issued ID and a selfie for biometric comparison. Stripe
              processes this verification; Kayu does not store copies of your government ID.
            </p>

            <h3 className="font-semibold text-gray-900 mt-4 mb-2">3.2 Background Check</h3>
            <p className="mb-3">
              You must consent to and pass a background check administered through <strong>Checkr</strong>.
              The background check includes:
            </p>
            <ul className="list-disc pl-6 space-y-1.5">
              <li>Social Security Number trace</li>
              <li>National criminal database search</li>
              <li>County criminal records search</li>
              <li>Sex offender registry search</li>
              <li>Motor vehicle records (MVR) check</li>
              <li>Global watchlist search</li>
            </ul>
            <p className="mt-3">
              Background checks are conducted in compliance with the Fair Credit Reporting Act (FCRA). You
              will have the opportunity to review and dispute any findings before a final determination is made.
              Kayu may require periodic re-verification and ongoing background checks.
            </p>

            <h3 className="font-semibold text-gray-900 mt-4 mb-2">3.3 Document Submission</h3>
            <p>
              You must upload clear photos of your valid driver&apos;s license, vehicle registration, and
              proof of insurance through the Platform. These documents are reviewed by Kayu and must be
              kept current at all times.
            </p>
          </section>

          <section id="commission">
            <h2 className="text-xl font-semibold text-gray-900 mb-3">4. Commission Structure</h2>
            <p className="mb-3">
              Kayu charges a commission on each completed ride, which is deducted from the fare before
              payout. The commission rate depends on your subscription status and whether the Rider is
              in your Kin network:
            </p>
            <div className="overflow-x-auto">
              <table className="w-full text-sm border border-gray-200 rounded-lg overflow-hidden mt-2 mb-3">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="text-left px-4 py-2.5 font-semibold text-gray-900 border-b border-gray-200">Scenario</th>
                    <th className="text-left px-4 py-2.5 font-semibold text-gray-900 border-b border-gray-200">Commission</th>
                    <th className="text-left px-4 py-2.5 font-semibold text-gray-900 border-b border-gray-200">Driver Keeps</th>
                  </tr>
                </thead>
                <tbody>
                  <tr className="border-b border-gray-100">
                    <td className="px-4 py-2.5">Standard (no Kin, no KinPro)</td>
                    <td className="px-4 py-2.5 font-medium">15%</td>
                    <td className="px-4 py-2.5">85%</td>
                  </tr>
                  <tr className="border-b border-gray-100 bg-gray-50/50">
                    <td className="px-4 py-2.5">Standard + KinPro (no Kin)</td>
                    <td className="px-4 py-2.5 font-medium">10%</td>
                    <td className="px-4 py-2.5">90%</td>
                  </tr>
                  <tr className="border-b border-gray-100">
                    <td className="px-4 py-2.5">Kin ride (no KinPro)</td>
                    <td className="px-4 py-2.5 font-medium">8%</td>
                    <td className="px-4 py-2.5">92%</td>
                  </tr>
                  <tr>
                    <td className="px-4 py-2.5">Kin ride + KinPro</td>
                    <td className="px-4 py-2.5 font-medium text-primary">0%</td>
                    <td className="px-4 py-2.5 font-medium text-primary">100%</td>
                  </tr>
                </tbody>
              </table>
            </div>
            <p>
              The commission is calculated on the total fare amount (base fare + distance + time). Tips
              are never subject to commission — you keep 100% of all tips.
            </p>
          </section>

          <section id="kinpro">
            <h2 className="text-xl font-semibold text-gray-900 mb-3">5. KinPro Subscription</h2>
            <p className="mb-3">
              KinPro is a voluntary monthly subscription available for <strong>$30.00 per month</strong>.
              KinPro is not required to drive on the Platform. Benefits include:
            </p>
            <ul className="list-disc pl-6 space-y-1.5">
              <li><strong>Reduced commissions:</strong> 10% on standard rides (down from 15%) and 0% on Kin rides (down from 8%)</li>
              <li><strong>Priority matching:</strong> Higher priority in the ride-matching algorithm when multiple Drivers are available</li>
              <li><strong>Premium analytics:</strong> Detailed earnings breakdowns, peak-time insights, and performance metrics</li>
              <li><strong>Enhanced visibility:</strong> KinPro badge on your profile visible to Riders</li>
            </ul>
            <p className="mt-3">
              KinPro subscriptions are billed monthly through Stripe and auto-renew on the same day each
              month. You may cancel at any time through your Driver dashboard; cancellation takes effect at
              the end of the current billing period. No prorated refunds are provided for partial months.
            </p>
          </section>

          <section id="kin-code">
            <h2 className="text-xl font-semibold text-gray-900 mb-3">6. Kin Code System</h2>
            <p className="mb-3">
              Each Driver on the Platform receives a unique <strong>Kin Code</strong> — a shareable code
              that Riders can use to add you to their personal Kin network. The Kin system is central to
              the Kayu experience:
            </p>
            <ul className="list-disc pl-6 space-y-1.5">
              <li><strong>Adding to Kin:</strong> When a Rider enters your Kin Code, you are added to their list of preferred Drivers</li>
              <li><strong>Kin ride requests:</strong> When a Rider in your Kin requests a ride, you receive priority notification before the request is sent to other Drivers</li>
              <li><strong>Lower commissions:</strong> Rides completed with Kin Riders qualify for reduced commission rates (see Section 4)</li>
              <li><strong>Building loyalty:</strong> The Kin system incentivizes building direct relationships with Riders, resulting in more consistent ride requests</li>
            </ul>
            <p className="mt-3">
              Your Kin Code is displayed in your Driver dashboard and can be shared via text, social media,
              or printed materials. You may not offer monetary incentives to Riders for adding your Kin Code,
              except through official Kayu referral programs.
            </p>
          </section>

          <section id="payments">
            <h2 className="text-xl font-semibold text-gray-900 mb-3">7. Payment & Payout Schedule</h2>
            <p className="mb-3">
              Driver payouts are processed through <strong>Stripe Connect</strong>. You must set up a
              Stripe Connect account to receive payments.
            </p>

            <h3 className="font-semibold text-gray-900 mt-4 mb-2">7.1 Payout Timing</h3>
            <ul className="list-disc pl-6 space-y-1.5 mb-3">
              <li>Standard payouts are initiated weekly on Mondays for the previous week&apos;s earnings</li>
              <li>Payouts typically arrive in your bank account within 2–3 business days after initiation</li>
              <li>Instant payouts may be available through Stripe for an additional fee</li>
            </ul>

            <h3 className="font-semibold text-gray-900 mt-4 mb-2">7.2 Fare Breakdown</h3>
            <p className="mb-3">For each completed ride, the fare is calculated based on:</p>
            <ul className="list-disc pl-6 space-y-1.5 mb-3">
              <li>Base fare</li>
              <li>Per-mile rate</li>
              <li>Per-minute rate</li>
              <li>Applicable demand multipliers</li>
              <li>Tolls and surcharges (passed through to the Rider)</li>
            </ul>

            <h3 className="font-semibold text-gray-900 mt-4 mb-2">7.3 Tips</h3>
            <p className="mb-3">
              Riders may add a tip during or after a ride. <strong>You retain 100% of all tips</strong> — Kayu
              does not charge any commission or processing fee on tips. Tips are included in your regular payout.
            </p>

            <h3 className="font-semibold text-gray-900 mt-4 mb-2">7.4 Tax Obligations</h3>
            <p>
              As an independent contractor, you are responsible for all applicable federal, state, and local
              taxes on your earnings. Kayu will provide a Form 1099-NEC for earnings at or above IRS
              reporting thresholds. We recommend consulting a tax professional regarding your obligations.
            </p>
          </section>

          <section id="vehicle">
            <h2 className="text-xl font-semibold text-gray-900 mb-3">8. Vehicle & Safety Requirements</h2>
            <p className="mb-3">You must maintain your vehicle in compliance with the following standards at all times while using the Platform:</p>
            <ul className="list-disc pl-6 space-y-1.5">
              <li>All safety equipment (seatbelts, airbags, lights, turn signals, mirrors) must be functional</li>
              <li>Tires must have adequate tread depth and be properly inflated</li>
              <li>The vehicle must be clean, both interior and exterior</li>
              <li>No smoking, vaping, or use of any tobacco products in the vehicle while providing rides</li>
              <li>A current Massachusetts state inspection sticker must be displayed</li>
              <li>The vehicle must display the Kayu trade dress (if provided) as required by Massachusetts TNC regulations</li>
            </ul>
            <p className="mt-3">
              Kayu reserves the right to require periodic vehicle inspections. Failure to maintain vehicle
              standards may result in temporary deactivation until the issue is resolved.
            </p>
          </section>

          <section id="insurance">
            <h2 className="text-xl font-semibold text-gray-900 mb-3">9. Insurance Requirements</h2>
            <p className="mb-3">
              Massachusetts law requires specific insurance coverage for Transportation Network Company
              (TNC) drivers. You must maintain the following at all times:
            </p>

            <h3 className="font-semibold text-gray-900 mt-4 mb-2">9.1 Personal Auto Insurance</h3>
            <p className="mb-3">
              You must carry personal automobile insurance that meets or exceeds Massachusetts minimum
              requirements. Your personal policy must <strong>not exclude</strong> TNC activity, or you
              must carry a TNC endorsement.
            </p>

            <h3 className="font-semibold text-gray-900 mt-4 mb-2">9.2 TNC Insurance (per MA General Laws Chapter 159A½)</h3>
            <p className="mb-3">The following coverage periods apply while you are using the Platform:</p>
            <ul className="list-disc pl-6 space-y-1.5">
              <li><strong>Period 1 — App on, waiting for request:</strong> Minimum $50,000 per person / $100,000 per accident bodily injury, $30,000 property damage liability</li>
              <li><strong>Period 2 — Ride accepted, en route to pickup:</strong> $1,000,000 combined single limit liability, uninsured/underinsured motorist coverage, contingent comprehensive and collision</li>
              <li><strong>Period 3 — Passenger in vehicle:</strong> $1,000,000 combined single limit liability, uninsured/underinsured motorist coverage, contingent comprehensive and collision</li>
            </ul>
            <p className="mt-3">
              Kayu maintains a commercial TNC insurance policy that provides coverage during Periods 2 and 3
              as required by Massachusetts law. You are responsible for maintaining appropriate coverage for
              Period 1 through your personal auto insurance policy with a TNC endorsement.
            </p>
            <p className="mt-3">
              You must provide proof of current insurance coverage and promptly notify Kayu of any changes,
              lapses, or cancellations. Driving without valid insurance will result in immediate deactivation.
            </p>
          </section>

          <section id="conduct">
            <h2 className="text-xl font-semibold text-gray-900 mb-3">10. Conduct Standards</h2>
            <p className="mb-3">While using the Kayu Platform, you agree to:</p>
            <ul className="list-disc pl-6 space-y-1.5">
              <li>Treat all Riders, other Drivers, and Kayu personnel with respect and professionalism</li>
              <li>Never discriminate against Riders based on race, color, national origin, religion, sex, gender identity, sexual orientation, age, disability, or any other protected characteristic</li>
              <li>Never operate your vehicle while under the influence of alcohol, drugs, or any impairing substance</li>
              <li>Comply with all applicable federal, state, and local traffic laws</li>
              <li>Never use a handheld mobile device while driving (Massachusetts Hands-Free Law, M.G.L. c. 90 § 13B)</li>
              <li>Never engage in aggressive, threatening, or harassing behavior toward any person</li>
              <li>Never solicit Riders for off-platform rides or payments</li>
              <li>Accurately report all rides conducted through the Platform</li>
              <li>Maintain your account information, documents, and certifications current and accurate</li>
            </ul>
          </section>

          <section id="deactivation">
            <h2 className="text-xl font-semibold text-gray-900 mb-3">11. Deactivation Criteria</h2>
            <p className="mb-3">
              Kayu may temporarily or permanently deactivate your Driver account for any of the following reasons:
            </p>

            <h3 className="font-semibold text-gray-900 mt-4 mb-2">11.1 Automatic Deactivation</h3>
            <ul className="list-disc pl-6 space-y-1.5 mb-3">
              <li>Failed or flagged background check (initial or ongoing)</li>
              <li>Expired or revoked driver&apos;s license</li>
              <li>Lapsed insurance coverage</li>
              <li>Failed vehicle inspection</li>
              <li>Safety violation reports verified by Kayu</li>
            </ul>

            <h3 className="font-semibold text-gray-900 mt-4 mb-2">11.2 Performance-Based Deactivation</h3>
            <ul className="list-disc pl-6 space-y-1.5 mb-3">
              <li>Driver rating falling below <strong>4.5</strong> (on a 5.0 scale) after a minimum of 25 rated rides</li>
              <li>Excessive cancellation rate (above 20% over a 30-day rolling period)</li>
              <li>Multiple verified complaints from Riders regarding conduct, safety, or service quality</li>
            </ul>

            <h3 className="font-semibold text-gray-900 mt-4 mb-2">11.3 Immediate Deactivation</h3>
            <ul className="list-disc pl-6 space-y-1.5">
              <li>Any form of violence, assault, or threat toward a Rider or any other person</li>
              <li>Driving under the influence of alcohol or drugs</li>
              <li>Discrimination or harassment</li>
              <li>Criminal activity</li>
              <li>Fraud, including fare manipulation or fake rides</li>
              <li>Soliciting Riders for off-platform services or payments</li>
            </ul>
            <p className="mt-3">
              If your account is deactivated, you will be notified via email with the reason for deactivation.
              You may appeal by contacting{" "}
              <a href="mailto:drivers@kayu.app" className="text-primary hover:underline">drivers@kayu.app</a>{" "}
              within 14 days. Appeals are reviewed on a case-by-case basis and Kayu&apos;s decision is final.
            </p>
          </section>

          <section id="data">
            <h2 className="text-xl font-semibold text-gray-900 mb-3">12. Data & Privacy</h2>
            <p className="mb-3">
              Your use of the Platform is also governed by our{" "}
              <Link href="/legal/privacy" className="text-primary hover:underline">Privacy Policy</Link>,
              which describes how we collect, use, and protect your information.
            </p>
            <p className="mb-3">As a Driver, additional data considerations apply:</p>
            <ul className="list-disc pl-6 space-y-1.5">
              <li><strong>Location tracking:</strong> Your real-time location is tracked while you are online and available for rides, and during active rides. This is necessary for ride matching, navigation, and safety.</li>
              <li><strong>Ride data:</strong> Details of all completed rides (route, duration, fare, rating) are retained and may be used for analytics, safety review, and dispute resolution.</li>
              <li><strong>Rider information:</strong> You will receive limited Rider information (first name, pickup/drop-off) for each ride. You must not retain, share, or misuse Rider personal information.</li>
              <li><strong>Verification data:</strong> Identity documents and background check results are handled by Stripe and Checkr respectively, in accordance with their privacy policies and applicable law.</li>
            </ul>
          </section>

          <section id="ip">
            <h2 className="text-xl font-semibold text-gray-900 mb-3">13. Intellectual Property</h2>
            <p className="mb-3">
              The Kayu name, logo, trademarks, Platform software, algorithms, and all related intellectual
              property are owned exclusively by Kayu, Inc. You are granted a limited, non-exclusive,
              non-transferable, revocable license to use the Platform solely for the purpose of providing
              transportation services as described in this Agreement.
            </p>
            <p>
              You may not copy, modify, reverse engineer, decompile, or create derivative works based on
              the Platform or any of its components. Any feedback, suggestions, or improvements you provide
              to Kayu regarding the Platform become the property of Kayu.
            </p>
          </section>

          <section id="indemnification">
            <h2 className="text-xl font-semibold text-gray-900 mb-3">14. Indemnification</h2>
            <p className="mb-3">
              You agree to indemnify, defend, and hold harmless Kayu, Inc. and its officers, directors,
              employees, agents, and affiliates from and against any and all claims, liabilities, damages,
              losses, costs, and expenses (including reasonable attorneys&apos; fees) arising out of or in
              connection with:
            </p>
            <ul className="list-disc pl-6 space-y-1.5">
              <li>Your use of the Platform or provision of transportation services</li>
              <li>Your breach of this Agreement or any applicable law or regulation</li>
              <li>Any accident, injury, death, or property damage arising from your operation of a motor vehicle</li>
              <li>Any claim by a Rider or third party related to a ride you provided</li>
              <li>Your failure to maintain required licenses, insurance, or vehicle standards</li>
              <li>Any tax liability arising from your earnings on the Platform</li>
            </ul>
            <p className="mt-3">
              This indemnification obligation survives the termination of this Agreement.
            </p>
          </section>

          <section id="tnc">
            <h2 className="text-xl font-semibold text-gray-900 mb-3">15. Massachusetts TNC Compliance</h2>
            <p className="mb-3">
              Kayu operates as a Transportation Network Company (TNC) under{" "}
              <strong>Massachusetts General Laws Chapter 159A½</strong> (An Act Regulating Transportation
              Network Companies). As a Driver on the Platform, you acknowledge and agree to comply with all
              applicable provisions, including:
            </p>
            <ul className="list-disc pl-6 space-y-1.5">
              <li><strong>Division registration:</strong> Kayu is registered with the Massachusetts Department of Public Utilities (DPU) as a TNC</li>
              <li><strong>Background checks:</strong> You consent to the background check requirements mandated by M.G.L. c. 159A½, § 4, including criminal background checks and driving history reviews</li>
              <li><strong>Insurance compliance:</strong> You agree to maintain insurance coverage consistent with M.G.L. c. 159A½, § 5, across all coverage periods (see Section 9)</li>
              <li><strong>Trade dress:</strong> When available, you agree to display Kayu trade dress (a physical or digital identifier) as required under M.G.L. c. 159A½, § 3</li>
              <li><strong>Accessibility:</strong> You agree not to discriminate against passengers with disabilities and to comply with all applicable accessibility requirements</li>
              <li><strong>Record keeping:</strong> Kayu maintains trip records as required by the DPU, including origin and destination (by zip code), date and time, distance, fare, and accessibility requests</li>
              <li><strong>Per-ride assessment:</strong> A per-ride assessment of $0.20 is collected by Kayu and remitted to the Commonwealth of Massachusetts as required by law</li>
            </ul>
            <p className="mt-3">
              Massachusetts TNC regulations are subject to change. Kayu will notify you of any regulatory
              changes that affect your obligations as a Driver. It is your responsibility to remain informed
              of and comply with all applicable laws.
            </p>
          </section>

          <section id="governing-law">
            <h2 className="text-xl font-semibold text-gray-900 mb-3">16. Governing Law</h2>
            <p className="mb-3">
              This Agreement shall be governed by and construed in accordance with the laws of the
              <strong> Commonwealth of Massachusetts</strong>, without regard to its conflict of law provisions.
            </p>
            <p className="mb-3">
              Any dispute arising out of or relating to this Agreement shall first be submitted to good-faith
              mediation administered by a mutually agreed-upon mediator in Boston, Massachusetts. If mediation
              is unsuccessful within thirty (30) days, either party may pursue binding arbitration under the
              rules of the American Arbitration Association (AAA) in Boston, Massachusetts.
            </p>
            <p>
              Notwithstanding the foregoing, either party may seek injunctive relief in a court of competent
              jurisdiction in Suffolk County, Massachusetts, to prevent irreparable harm pending the outcome
              of arbitration.
            </p>
          </section>

          <section id="modifications">
            <h2 className="text-xl font-semibold text-gray-900 mb-3">17. Modifications to This Agreement</h2>
            <p className="mb-3">
              Kayu reserves the right to modify this Agreement at any time. We will provide notice of material
              changes by posting the updated Agreement on the Platform, updating the &quot;Last updated&quot; date,
              and sending you a notification via email or the Platform.
            </p>
            <p>
              If you do not agree with the modified terms, you may terminate this Agreement by ceasing to use
              the Platform. Your continued use of the Platform after the effective date of any modifications
              constitutes your acceptance of the updated Agreement.
            </p>
          </section>

          <section id="termination">
            <h2 className="text-xl font-semibold text-gray-900 mb-3">18. Termination</h2>
            <p className="mb-3">
              Either party may terminate this Agreement at any time, with or without cause:
            </p>
            <ul className="list-disc pl-6 space-y-1.5">
              <li><strong>By you:</strong> You may stop using the Platform at any time. To formally close your Driver account, contact us at <a href="mailto:drivers@kayu.app" className="text-primary hover:underline">drivers@kayu.app</a> or through your account settings.</li>
              <li><strong>By Kayu:</strong> We may deactivate or terminate your account at any time for any reason, including but not limited to violation of this Agreement, safety concerns, or failure to meet eligibility requirements.</li>
            </ul>
            <p className="mt-3">
              Upon termination, you will receive a final payout for any completed rides not yet paid, less
              any outstanding fees or charges. Sections of this Agreement that by their nature should
              survive termination — including independent contractor status, indemnification, intellectual
              property, limitation of liability, and governing law — shall survive.
            </p>
          </section>

          <section id="contact">
            <h2 className="text-xl font-semibold text-gray-900 mb-3">19. Contact Information</h2>
            <p className="mb-3">
              If you have questions about this Driver Agreement, your account, or driving with Kayu,
              please contact our Driver support team:
            </p>
            <div className="bg-gray-50 rounded-xl border border-gray-200 p-5">
              <p className="font-semibold text-gray-900">Kayu, Inc. — Driver Support</p>
              <p className="mt-1">Boston, Massachusetts</p>
              <p className="mt-1">
                Email:{" "}
                <a href="mailto:drivers@kayu.app" className="text-primary hover:underline">
                  drivers@kayu.app
                </a>
              </p>
            </div>
            <p className="mt-4 text-sm text-gray-500">
              For general inquiries, please contact{" "}
              <a href="mailto:support@kayu.app" className="text-primary hover:underline">support@kayu.app</a>.
              For privacy-related requests, contact{" "}
              <a href="mailto:privacy@kayu.app" className="text-primary hover:underline">privacy@kayu.app</a>.
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
              <Link href="/legal/privacy" className="text-gray-500 hover:text-primary transition-colors">Privacy Policy</Link>
            </div>
          </div>
        </footer>
      </main>
    </div>
  );
}
