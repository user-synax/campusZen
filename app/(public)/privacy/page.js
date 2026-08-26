import LegalLayout from "@/components/shared/LegalLayout";

export const metadata = {
  title: "Privacy Policy | CampusZen",
  description: "Learn how CampusZen collects, uses, and protects your personal data. We are committed to student data privacy and safety.",
  alternates: {
    canonical: "/privacy",
  },
  openGraph: {
    title: "Privacy Policy | CampusZen",
    description: "Your privacy matters. Read how we protect your student data.",
    url: "https://campuszen.vercel.app/privacy",
    type: "website",
  },
};

const sections = [
  { id: "data-collection", title: "1. Data Collection" },
  { id: "data-usage", title: "2. How We Use Data" },
  { id: "data-sharing", title: "3. Data Sharing" },
  { id: "deletion", title: "4. Data Deletion" },
  { id: "cookies", title: "5. Cookies Policy" },
  { id: "contact", title: "6. Questions" },
];

export default function PrivacyPage() {
  return (
    <LegalLayout
      title="Privacy Policy"
      lastUpdated="April 9, 2026"
      sections={sections}
    >
      <section className="space-y-8">
        <p className="text-xl md:text-2xl font-medium text-foreground leading-relaxed">
          Your privacy is important to us. This Privacy Policy explains what information CampusZen collects and how we use it to build your campus community.
        </p>
      </section>

      <section id="data-collection" className="scroll-mt-32">
        <h2 className="text-3xl md:text-4xl font-black text-white mb-8 tracking-tight">1. Data Collection</h2>
        <div className="space-y-8">
          <p>
            To provide the best campus experience, we collect the following:
          </p>
          <div className="grid gap-6">
            {[
              { label: "Account Info", desc: "Name, username, student email, college, and year of study." },
              { label: "Profile Info", desc: "Your bio, profile picture, and campus interactions." },
              { label: "User Content", desc: "Posts, comments, and images you upload." }
            ].map((item, i) => (
              <div key={i} className="p-6 rounded-2xl bg-white/[0.03] border border-white/5 flex gap-4">
                <span className="text-primary font-bold">0{i+1}</span>
                <div>
                  <span className="font-bold text-white block mb-1">{item.label}</span>
                  <p className="text-sm opacity-80">{item.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section id="data-usage" className="scroll-mt-32">
        <h2 className="text-3xl md:text-4xl font-black text-white mb-8 tracking-tight">2. How We Use Data</h2>
        <div className="space-y-6">
          <p>We use your data strictly for platform functionality:</p>
          <ul className="grid gap-4 list-none pl-0">
            {[
              "Enabling college-specific content feeds.",
              "Processing Viper Coins (VP) rewards and transfers.",
              "Platform verification and student safety.",
              "Improving student tools and resources."
            ].map((item, i) => (
              <li key={i} className="flex gap-4">
                <span className="text-primary font-bold">/</span>
                <span>{item}</span>
              </li>
            ))}
          </ul>
        </div>
      </section>

      <section id="data-sharing" className="scroll-mt-32">
        <h2 className="text-3xl md:text-4xl font-black text-white mb-8 tracking-tight">3. Data Sharing</h2>
        <div className="p-10 rounded-[2.5rem] bg-gradient-to-br from-primary/10 to-transparent border border-primary/20 space-y-6">
          <h3 className="text-2xl font-bold text-white">Our No-Selling Guarantee</h3>
          <p className="text-lg">
            CampusZen is built by a solo developer for students. <strong>We NEVER sell your personal data</strong> to third parties or advertisers. Period.
          </p>
        </div>
      </section>

      <section id="deletion" className="scroll-mt-32">
        <h2 className="text-3xl md:text-4xl font-black text-white mb-8 tracking-tight">4. Data Deletion</h2>
        <div className="space-y-6">
          <p>
            You have full control. You can delete your posts or comments at any time.
          </p>
          <p>
            For permanent account deletion, email <strong>usersynax@gmail.com</strong> from your registered student account.
          </p>
        </div>
      </section>

      <section id="cookies" className="scroll-mt-32">
        <h2 className="text-3xl md:text-4xl font-black text-white mb-8 tracking-tight">5. Cookies</h2>
        <p>
          We use only essential cookies to maintain your login session. No tracking, no marketing, no nonsense.
        </p>
      </section>

      <section id="contact" className="scroll-mt-32">
        <h2 className="text-3xl md:text-4xl font-black text-white mb-8 tracking-tight">6. Questions?</h2>
        <p>
          Reach out directly to the developer at:
          <br />
          <a href="mailto:usersynax@gmail.com" className="text-primary font-bold hover:underline">
            usersynax@gmail.com
          </a>
        </p>
      </section>
    </LegalLayout>
  );
}
