import LegalLayout from "@/components/shared/LegalLayout";

export const metadata = {
  title: "Terms of Service | CampusZen",
  description: "Read the Terms of Service for CampusZen. Rules and guidelines for the exclusive student social network.",
  alternates: {
    canonical: "/terms",
  },
  openGraph: {
    title: "Terms of Service | CampusZen",
    description: "Our community guidelines and terms of service.",
    url: "https://campuszen.vercel.app/terms",
    type: "website",
  },
};

const sections = [
  { id: "eligibility", title: "1. Eligibility" },
  { id: "use-policy", title: "2. Acceptable Use" },
  { id: "content", title: "3. Content Ownership" },
  { id: "termination", title: "4. Account Termination" },
  { id: "currency", title: "5. Viper Coins (VP)" },
  { id: "contact", title: "6. Contact" },
];

export default function TermsPage() {
  return (
    <LegalLayout
      title="Terms of Service"
      lastUpdated="April 9, 2026"
      sections={sections}
    >
      <section className="space-y-8">
        <p className="text-xl md:text-2xl font-medium text-foreground leading-relaxed">
          Welcome to CampusZen. These Terms of Service ("Terms") govern your access to and use of CampusZen's website and services. By using CampusZen, you agree to be bound by these Terms.
        </p>
      </section>

      <section id="eligibility" className="scroll-mt-32">
        <h2 className="text-3xl md:text-4xl font-black text-white mb-8 tracking-tight">1. Eligibility</h2>
        <div className="space-y-6">
          <p>
            CampusX is exclusively for students currently enrolled in Indian colleges and universities.
          </p>
          <ul className="grid gap-4 list-none pl-0">
            {[
              "You must be at least 18 years of age.",
              "You must have a valid college-issued email address or proof of enrollment.",
              "Individual college verification may be required to access specific campus feeds."
            ].map((item, i) => (
              <li key={i} className="flex gap-4">
                <span className="text-primary font-bold">/</span>
                <span>{item}</span>
              </li>
            ))}
          </ul>
        </div>
      </section>

      <section id="use-policy" className="scroll-mt-32">
        <h2 className="text-3xl md:text-4xl font-black text-white mb-8 tracking-tight">2. Acceptable Use Policy</h2>
        <div className="space-y-6">
          <p>
            CampusX is a community space. To keep it safe, you agree NOT to:
          </p>
          <ul className="grid gap-4 list-none pl-0">
            {[
              "Harass, bully, or intimidate other students.",
              "Create fake accounts or impersonate other students, faculty, or staff.",
              "Post sexually explicit, violent, or illegal content.",
              "Use the platform for commercial spam or unauthorized advertising.",
              "Attempt to scrape, hack, or disrupt the platform's functionality."
            ].map((item, i) => (
              <li key={i} className="flex gap-4">
                <span className="text-primary font-bold">/</span>
                <span>{item}</span>
              </li>
            ))}
          </ul>
        </div>
      </section>

      <section id="content" className="scroll-mt-32">
        <h2 className="text-3xl md:text-4xl font-black text-white mb-8 tracking-tight">3. Content Ownership</h2>
        <div className="space-y-8">
          <div className="p-8 rounded-3xl bg-white/[0.03] border border-white/5 space-y-4">
            <h3 className="text-xl font-bold text-white">Your Content</h3>
            <p>
              You maintain ownership of the text, photos, and other content you post on CampusX. However, by posting, you grant CampusX a worldwide, non-exclusive, royalty-free license to host, store, use, display, and distribute that content for the purpose of operating and improving the platform.
            </p>
          </div>
          <div className="p-8 rounded-3xl bg-white/[0.03] border border-white/5 space-y-4">
            <h3 className="text-xl font-bold text-white">Our Content</h3>
            <p>
              The CampusX name, logo, site design, and code are owned by the developer and protected by intellectual property laws.
            </p>
          </div>
        </div>
      </section>

      <section id="termination" className="scroll-mt-32">
        <h2 className="text-3xl md:text-4xl font-black text-white mb-8 tracking-tight">4. Account Termination</h2>
        <div className="space-y-6">
          <p>
            We reserve the right to suspend or terminate your account at any time, with or without notice, if we believe you have violated these terms or if we are investigating suspicious activity.
          </p>
          <p>
            Upon termination, your right to use the platform immediately ceases, and your content may be deleted according to our data retention practices.
          </p>
        </div>
      </section>

      <section id="currency" className="scroll-mt-32">
        <h2 className="text-3xl md:text-4xl font-black text-white mb-8 tracking-tight">5. Viper Coins (VP)</h2>
        <div className="space-y-6 text-orange-200/80">
          <p className="font-semibold text-orange-400">Important Disclaimer:</p>
          <ul className="grid gap-3 list-none pl-0 italic">
            {[
              "Viper Coins (VP) have no real-world monetary value.",
              "They cannot be exchanged for cash or legal tender.",
              "The developer reserves the right to modify or reset the system anytime."
            ].map((item, i) => (
              <li key={i} className="flex gap-4">
                <span>•</span>
                <span>{item}</span>
              </li>
            ))}
          </ul>
        </div>
      </section>

      <section id="contact" className="scroll-mt-32">
        <h2 className="text-3xl md:text-4xl font-black text-white mb-8 tracking-tight">6. Contact</h2>
        <p>
          If you have any questions, reach out to the developer at:
          <br />
          <a href="mailto:usersynax@gmail.com" className="text-primary font-bold hover:underline">
            usersynax@gmail.com
          </a>
        </p>
      </section>
    </LegalLayout>
  );
}
