import Link from "next/link";

const sections = [
  { title: "1. Acceptance of Terms", content: "By accessing or using KinRide, you agree to be bound by these Terms of Service. If you do not agree, do not use our platform." },
  { title: "2. Description of Service", content: "KinRide is a transportation network platform that connects riders with independent drivers. We facilitate ride requests, matching, communication, and payment processing. KinRide does not provide transportation services directly \u2014 drivers are independent contractors." },
  { title: "3. User Accounts", content: "You must be at least 18 years old to create an account. You are responsible for maintaining the confidentiality of your login credentials and for all activities under your account. You agree to provide accurate and current information." },
  { title: "4. Rider Terms", content: "Fares are estimated before your ride and may vary based on route, distance, and surge pricing. You may cancel a ride at any time, though cancellation fees may apply after a driver has been matched. You agree to treat drivers with respect and comply with all applicable laws during your ride." },
  { id: "driver-terms", title: "5. Driver Terms", content: "Drivers operate as independent contractors, not employees of KinRide. Drivers must maintain a valid driver\u2019s license, personal auto insurance, and pass background checks (via Checkr). Drivers must keep their vehicles in safe operating condition and comply with all local transportation regulations. Commission rates vary by plan (Standard 15%, Kin Pro 10%, Kin rides 8%)." },
  { title: "6. Safety Features", content: "KinRide provides safety features including 4-digit ride verification codes, real-time route monitoring, SOS emergency calling, and trip sharing. These features are provided to enhance safety but do not guarantee the safety of any ride. In an emergency, always call 911." },
  { title: "7. Payments & Pricing", content: "Fares include a base fee, per-mile charge, and applicable state fees. Surge pricing may apply during high-demand periods. Promo codes may be applied for discounts. Refunds are handled on a case-by-case basis. A per-ride assessment of $0.20 is collected as required by Massachusetts law." },
  { title: "8. Privacy", content: "Your use of KinRide is also governed by our Privacy Policy, which describes how we collect, use, and protect your data.", link: { href: "/privacy", label: "Read our Privacy Policy" } },
  { title: "9. Limitation of Liability", content: "KinRide is provided \\"as is\\" without warranties of any kind. To the maximum extent permitted by law, KinRide shall not be liable for any indirect, incidental, special, or consequential damages arising from your use of the platform." },
  { title: "10. Account Termination", content: "We reserve the right to suspend or terminate your account at any time for violation of these terms, fraudulent activity, safety concerns, or any other reason at our discretion. You may delete your account at any time from your profile settings." },
  { title: "11. Governing Law", content: "These terms are governed by the laws of the State of Delaware and the Commonwealth of Massachusetts. Any disputes shall be resolved in the courts of Massachusetts." },
  { title: "12. Contact Us", content: "If you have questions about these terms, please contact us.", link: { href: "/support", label: "Contact Support" } },
];

export default function TermsPage() {
  return (
    <div className="max-w-3xl mx-auto px-4 py-10 sm:py-16">
      <Link href="/" className="inline-flex items-center gap-1.5 text-sm text-foreground/50 hover:text-foreground transition-colors mb-8">
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
        Back to Home
      </Link>
      <h1 className="text-3xl font-bold text-foreground mb-2">Terms of Service</h1>
      <p className="text-sm text-foreground/40 mb-10">Last updated: February 2026</p>
      <div className="space-y-8">
        {sections.map((section, i) => (
          <section key={i} id={section.id}>
            <h2 className="text-lg font-semibold text-foreground mb-2">{section.title}</h2>
            <p className="text-foreground/70 leading-relaxed">{section.content}</p>
            {section.link && (
              <Link href={section.link.href} className="inline-block mt-2 text-sm text-primary font-medium hover:underline">
                {section.link.label} &rarr;
              </Link>
            )}
          </section>
        ))}
      </div>
      <div className="mt-16 pt-8 border-t border-card-border text-center">
        <div className="flex items-center justify-center gap-6 text-sm text-foreground/40">
          <Link href="/privacy" className="hover:text-foreground transition-colors">Privacy Policy</Link>
          <Link href="/support" className="hover:text-foreground transition-colors">Support</Link>
        </div>
      </div>
    </div>
  );
}
