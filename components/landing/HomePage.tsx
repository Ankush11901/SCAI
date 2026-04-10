"use client";

import { AnnouncementBar } from "./AnnouncementBar";
import { Navbar } from "./Navbar";
import { Hero } from "./Hero";
import { LogoMarquee } from "./LogoMarquee";
import { Capabilities } from "./Capabilities";
import { ValueProps } from "./ValueProps";
import { ProductShowcase } from "./ProductShowcase";
import { IntegrationHub } from "./IntegrationHub";
import { Testimonials } from "./Testimonials";
import { Pricing } from "./Pricing";
import { CTASection } from "./CTASection";
import { Footer } from "./Footer";

export function HomePage() {
  return (
    <div className="min-h-screen bg-scai-page">
      <AnnouncementBar />
      <Navbar />
      <main id="main-content">
        <div className="flex min-h-[calc(100dvh-104px)] flex-col">
          <Hero />
          <LogoMarquee />
        </div>
        <Capabilities />
        <ValueProps />
        <ProductShowcase />
        <IntegrationHub />
        <Testimonials />
        <Pricing />
        <CTASection />
      </main>
      <Footer />
    </div>
  );
}
