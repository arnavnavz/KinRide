import Link from "next/link";

const sections = [
  { title: "1. Information We Collect", content: "We collect information you provide directly: name, email address, phone number, and payment information. When you use KinRide, we also collect location data (during rides), ride history, device information, and usage analytics." },
  { title: "2. How We Use Your Information", content: "We use your information to: provide and improve our ride services, match riders with nearby drivers, process payments, communicate with you about rides, ensure safety through route monitoring and verification codes, comply with legal requirements, and prevent fraud." },
  { title: "3. Location Data", content: "Location data is collected during active rides for navigation, ETA calculation, route monitoring (to detect deviations for safety), and trip sharing features. Driver location is shared with matched riders during active rides. Location data is retained for 90 days and is not sold to third parties." },
  { title: "4. Data Sharing", content: "We share limited data with: drivers (your name and pickup location when matched), payment processors (Stripe) for transaction processing, background check providers (Checkr) for driver verification, and law enforcement when required by law or to protect safety. We do not sell your personal data to advertisers or data brokers." },
  { title: "5. Data Retention", content: "Ride history is retained for 3 years for legal and service purposes. Location data is retained for 90 days. Account data is retained until you request deletion. Payment transaction records are retained as required by financial regulations." },
  { title: "6. Your Rights", content: "You have the right to: access your personal data, correct inaccurate information, request deletion of your account and data, export your ride history, and opt out of promotional communications. You can manage your account from your profile, or contact us for data requests." },
  { title: "7. Security", content: "We implement industry-standard security measures including encryption in transit (TLS), secure password hashing (bcrypt), access controls, and regular security reviews. We use Sentry for error monitoring and maintain audit logs for sensitive operations." },
  { title: "8. Children\u2019s Privacy", content: "KinRide is not intended for users under 18 years of age. We do not knowingly collect personal information from children. If we learn that we have collected data from a child under 18, we will promptly delete it." },
  { title: "9. Changes to This Policy", content: "We may update this Privacy Policy from time to time. We will notify you of material changes via email or in-app notification. Continued use of KinRide after changes constitutes acceptance of the updated policy." },
  { title: "10. Contact Us", content: "If you have questions about this Privacy Policy or want to exercise your data rights, please contact us at support@kinride.com or through our support page." },
];

export default function PrivacyPage() {
  return (
    <div className="max-w-3xl mx-auto px-4 py-10 sm:py-16">
      <Link href="/" className="inline-flex items-center gap-1.5 text-sm text-foreground/50 hover:text-foreground transition-colors mb-8">
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
        Back to Home
      </Link>
      <h1 className="text-3xl font-bold text-foreground mb-2">Privacy Policy</h1>
      <p className="text-sm text-foreground/40 mb-10">Last updated: February 2026</p>
      <div className="space-y-8">
        {sections.map((section, i) => (
          <section key={i}>
            <h2 className="text-lg font-semibold text-foreground mb-2">{section.title}</h2>
            <p className="text-foreground/70 leading-relaxed">{section.content}</p>
          </section>
        ))}
      </div>
      <div className="mt-16 pt-8 border-t border-card-border text-center">
        <div className="flex items-center justify-center gap-6 text-sm text-foreground/40">
          <Link href="/terms" className="hover:text-foreground transition-colors">Terms of Service</Link>
          <Link href="/support" className="hover:text-foreground transition-colors">Support</Link>
        </div>
      </div>
    </div>
  );
}
