import { Navigation } from "@/components/landing/navigation";
import { DemoSection, Hero } from "@/components/landing/hero";
import { FeaturesSection } from "@/components/landing/features-section";
import { ProductMockup } from "@/components/landing/product-mockup";
import { WorkflowSection } from "@/components/landing/workflow-section";
import { SecuritySection } from "@/components/landing/security-section";
import { CtaSection } from "@/components/landing/cta-section";
import { Footer } from "@/components/landing/footer";

export default function LandingPage() {
  return (
    <div className="flex min-h-dvh flex-col bg-background text-foreground">
      <Navigation />
      <main className="flex-1">
        <Hero />
        <DemoSection />
        <FeaturesSection />
        <ProductMockup />
        <WorkflowSection />
        <SecuritySection />
        <CtaSection />
      </main>
      <Footer />
    </div>
  );
}
