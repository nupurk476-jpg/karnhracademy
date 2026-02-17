import Header from "@/components/Header";
import Hero from "@/components/Hero";
import AboutPreview from "@/components/AboutPreview";
import FeaturedSection from "@/components/FeaturedSection";
import NewsletterSignup from "@/components/NewsletterSignup";
import Footer from "@/components/Footer";

const Index = () => {
  return (
    <div className="min-h-screen bg-background">
      <Header />
      <Hero />
      <AboutPreview />
      <FeaturedSection />
      <NewsletterSignup />
      <Footer />
    </div>
  );
};

export default Index;
