import Header from "@/components/Header";
import Hero from "@/components/Hero";
import AboutPreview from "@/components/AboutPreview";
import BBAStudentsSection from "@/components/BBAStudentsSection";
import FeaturedSection from "@/components/FeaturedSection";
import HRTopicsSection from "@/components/HRTopicsSection";
import PrinciplesOfManagementSection from "@/components/PrinciplesOfManagementSection";
import OrganizationalBehaviourSection from "@/components/OrganizationalBehaviourSection";
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
        <BBAStudentsSection />
        <FeaturedSection />
        <div id="hr-topics">
          <HRTopicsSection />
        </div>
        <div id="pom">
          <PrinciplesOfManagementSection />
        </div>
        <div id="ob">
          <OrganizationalBehaviourSection />
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
