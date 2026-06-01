import Header from "@/components/Header";
import Hero from "@/components/Hero";
import AboutPreview from "@/components/AboutPreview";
import FeaturedSection from "@/components/FeaturedSection";
import HRTopicsSection from "@/components/HRTopicsSection";
import NewspaperHighlights from "@/components/NewspaperHighlights";
import TestimonialsSection from "@/components/TestimonialsSection";
import NewsletterSignup from "@/components/NewsletterSignup";
import Footer from "@/components/Footer";
import SEO from "@/components/SEO";

const Index = () => {
  return (
    <div className="min-h-screen bg-background">
      <SEO
        title="HR & Management Research Hub"
        description="Academic resource hub for MBA, BBA, UGC NET HR aspirants — notes, quizzes, blogs, and books on Human Resource Management."
        path="/"
      />
      <Header />
      <main>
        <Hero />
        <AboutPreview />
        <FeaturedSection />
        <div id="hr-topics">
          <HRTopicsSection />
        </div>
        <NewspaperHighlights />
        <TestimonialsSection />
        <NewsletterSignup />
      </main>
      <Footer />
    </div>
  );
};

export default Index;
