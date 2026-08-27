import Footer from "@/components/landing/Footer";
import PricingView from "@/components/pricing/PricingView";

export const metadata = {
    title: "Pricing — CampusZen",
    description:
        "Free for students. CampusZen Pro unlocks polls, more media, and profile customization. College and enterprise plans available.",
};

export default function PricingPage() {
    return (
        <>
            <PricingView />
            <Footer />
        </>
    );
}
