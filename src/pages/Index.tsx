import Header from "@/components/Header";
import Hero from "@/components/Hero";
import AboutPreview from "@/components/AboutPreview";
import FeaturedSection from "@/components/FeaturedSection";
import HRTopicsSection from "@/components/HRTopicsSection";
import NewspaperHighlights from "@/components/NewspaperHighlights";
import TestimonialsSection from "@/components/TestimonialsSection";
import NewsletterSignup from "@/components/NewsletterSignup";
import Footer from "@/components/Footer";

const Index = () => {
  return (
    <div className="min-h-screen bg-background">
      <Header />
      <Hero />
      <AboutPreview />
      <FeaturedSection />
      <div id="hr-topics">
        <HRTopicsSection />
      </div>
      <NewspaperHighlights />
      <TestimonialsSection />
      <NewsletterSignup />
      <Footer />
    </div>
  );
};

export default Index;
