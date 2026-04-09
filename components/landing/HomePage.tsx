"use client";

import { AnnouncementBar } from "./AnnouncementBar";
import { Navbar } from "./Navbar";
import { Hero } from "./Hero";
import { LogoMarquee } from "./LogoMarquee";
import { Capabilities } from "./Capabilities";
import { ValueProps } from "./ValueProps";
import { ProductShowcase } from "./ProductShowcase";
import { IntegrationHub } from "./IntegrationHub";
import { Pricing } from "./Pricing";
import { CTASection } from "./CTASection";
import { Footer } from "./Footer";

export function HomePage() {
  return (
    <div className="min-h-screen bg-scai-page">
      <AnnouncementBar />
      <Navbar />
      <main id="main-content">
        <Hero />
        <LogoMarquee />
        <Capabilities />
        <ValueProps />
        <ProductShowcase />
        <IntegrationHub />
        <Pricing />
        <CTASection />
      </main>
      <Footer />
    </div>
  );
}
