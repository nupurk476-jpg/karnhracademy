import Header from "@/components/Header";
import Hero from "@/components/Hero";
import AudienceCards from "@/components/AudienceCards";
import ResearchAreas from "@/components/ResearchAreas";
import Resources from "@/components/Resources";
import About from "@/components/About";
import Footer from "@/components/Footer";

const Index = () => {
  return (
    <div className="min-h-screen bg-background">
      <Header />
      <Hero />
      <AudienceCards />
      <ResearchAreas />
      <Resources />
      <About />
      <Footer />
    </div>
  );
};

export default Index;
