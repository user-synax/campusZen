import AboutView from "@/components/about/AboutView";

export const metadata = {
  title: "About — CampusZen",
  description:
    "CampusZen is a focused, student-only social network for Indian colleges — and a fully programmable surface for the agents that help students.",
  openGraph: {
    title: "About — CampusZen",
    description:
      "A focused, student-only social network for Indian colleges, open to agents by design.",
    type: "website",
  },
};

export default function AboutPage() {
  return <AboutView />;
}
