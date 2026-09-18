// Server component: the FM Academy block needs live pricing, and fetching it
// here means the numbers are in the HTML rather than arriving after hydration.
// Nothing on this page required a client boundary — the sections below are all
// client components in their own right and stay that way.
import dynamic from 'next/dynamic';
import { HeroSectionV2 } from "@/components/sections/HeroSectionV2";
import { V2PageWrapper } from "@/components/layouts/V2PageWrapper";
import { PageLoader } from "@/components/ui/PageLoader";
import { getAcademyHomePricing } from "@/lib/academy/home-pricing";

// Prices change when a promotion opens or closes, not per request.
export const revalidate = 60;

// Dynamically import below-the-fold sections to reduce initial bundle
// SSR enabled so search engines see full content
const ServicesSectionV2 = dynamic(
  () => import("@/components/sections/ServicesSectionV2").then(m => ({ default: m.ServicesSectionV2 }))
);
const FeaturesSectionV2 = dynamic(
  () => import("@/components/sections/FeaturesSectionV2").then(m => ({ default: m.FeaturesSectionV2 }))
);
const ClientsSectionV2 = dynamic(
  () => import("@/components/sections/ClientsSectionV2").then(m => ({ default: m.ClientsSectionV2 }))
);
const TestimonialsSectionV2 = dynamic(
  () => import("@/components/sections/TestimonialsSectionV2").then(m => ({ default: m.TestimonialsSectionV2 }))
);
const CreativeMindsSectionV2 = dynamic(
  () => import("@/components/sections/CreativeMindsSectionV2").then(m => ({ default: m.CreativeMindsSectionV2 }))
);
const AcademySectionV2 = dynamic(
  () => import("@/components/sections/AcademySectionV2").then(m => ({ default: m.AcademySectionV2 }))
);
const ContactSectionV2 = dynamic(
  () => import("@/components/sections/ContactSectionV2").then(m => ({ default: m.ContactSectionV2 }))
);

export default async function Home() {
  const academyPricing = await getAcademyHomePricing();

  return (
    <>
      <PageLoader />
      <V2PageWrapper starCount={25}>
        <HeroSectionV2 />
        <ServicesSectionV2 />
        <FeaturesSectionV2 />
        <ClientsSectionV2 />
        <TestimonialsSectionV2 />
        <CreativeMindsSectionV2 />
        <AcademySectionV2 pricing={academyPricing} />
        <ContactSectionV2 />
      </V2PageWrapper>
    </>
  );
}
