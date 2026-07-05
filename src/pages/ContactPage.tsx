import Header from "@/components/Header";
import Footer from "@/components/Footer";
import SEO from "@/components/SEO";
import { Mail } from "lucide-react";

const ContactPage = () => {
  return (
    <div className="min-h-screen bg-background">
      <SEO
        title="Contact"
        description="Have questions or want to collaborate? Reach out to the Karn HR Academy team."
        path="/contact"
      />
      <Header />
      <main className="mx-auto max-w-2xl px-6 py-16 text-center">
        <h1 className="mb-4 text-4xl font-bold text-foreground">Contact Us</h1>
        <p className="mb-8 text-muted-foreground">
          Have questions or want to collaborate? Reach out to us.
        </p>
        <div className="space-y-4">
          <div className="flex items-center justify-center gap-3">
            <Mail className="h-5 w-5 text-accent" />
            <a href="mailto:contact@karnhracademy.com" className="text-foreground hover:text-accent transition-colors">
              contact@karnhracademy.com
            </a>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default ContactPage;
