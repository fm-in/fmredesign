'use client';

import dynamic from 'next/dynamic';
import { HeroSectionV2 } from "@/components/sections/HeroSectionV2";
import { V2PageWrapper } from "@/components/layouts/V2PageWrapper";
import { PageLoader } from "@/components/ui/PageLoader";

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
const TestimonialsSectionV3 = dynamic(
  () => import("@/components/sections/v3/TestimonialsSectionV3").then(m => ({ default: m.TestimonialsSectionV3 }))
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

export default function Home() {
  return (
    <>
      <PageLoader />
      <V2PageWrapper starCount={25}>
        <HeroSectionV2 />
        <ServicesSectionV2 />
        <FeaturesSectionV2 />
        <ClientsSectionV2 />
        <TestimonialsSectionV3 />
        <CreativeMindsSectionV2 />
        <AcademySectionV2 />
        <ContactSectionV2 />
      </V2PageWrapper>
    </>
  );
}
