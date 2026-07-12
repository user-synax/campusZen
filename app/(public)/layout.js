import "../globals.css";
import Navbar from "@/components/landing/Navbar";

export const metadata = {
  title: 'CampusZen — Your Campus Community',
  description: 'Connect with students, discover events, join college communities.',
  openGraph: {
    title: 'CampusZen — Your Campus Community',
    description: 'Connect with students, discover events, join college communities.',
    type: 'website',
    url: process.env.NEXT_PUBLIC_APP_URL,
    images: [{ url: '/og-image.png', width: 1200, height: 630 }],
  },
};

export default function PublicLayout({ children }) {
  return (
    <div className="bg-[#0f0f0f] text-[#f0f0f0] antialiased min-h-screen">
      <Navbar />
      {children}
    </div>
  );
}