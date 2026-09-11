import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import SEO from "@/components/SEO";
import { SocialIconRow } from "@/components/SocialIcons";
import { LIVE_CHANNELS, CONTACT_EMAIL } from "@/lib/socialLinks";
import { CheckCircle2, ArrowRight } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

const highlights = [
  "MBA in Human Resource Management",
  "UGC NET Qualified",
  "PhD Scholar in Human Resource Management",
  "Research Focus: Ethical HRM & Quiet Quitting",
  "Published researcher in peer-reviewed journals",
];

const SOCIALS = [
  ...LIVE_CHANNELS.map(c => ({ key: c.key, label: c.label, url: c.url })),
  { key: "email", label: "Email", url: `mailto:${CONTACT_EMAIL}` },
];

const AboutPage = () => {
  const [imageUrl, setImageUrl] = useState<string | null>(null);

  useEffect(() => {
    const { data } = supabase.storage.from("educator").getPublicUrl("profile.jpg");
    fetch(data.publicUrl, { method: "HEAD" }).then((res) => {
      if (res.ok) setImageUrl(data.publicUrl + "?t=" + Date.now());
    }).catch(() => {});
  }, []);

  return (
    <div className="min-h-screen bg-background">
      <SEO
        title="About Karn HR Academy"
        description="Karn HR Academy is a free, unit-wise study hub for HR & Management students — MBA, BBA, B.Com and UGC NET/JRF Labour Welfare (Code 55). Notes, MCQs, PYQs and lectures by Nupur Karn, UGC NET qualified educator and PhD scholar."
        path="/about"
      />
      <Header />
      <main id="main-content" className="mx-auto max-w-4xl px-6 py-16">
        <h1 className="mb-8 text-4xl font-bold text-foreground">About</h1>

        {/* ── About the academy ───────────────────────────────────────── */}
        <section className="mb-16" aria-labelledby="about-academy">
          <h2 id="about-academy" className="mb-4 text-xl font-bold text-foreground">Karn HR Academy</h2>
          <div className="space-y-4 leading-relaxed text-muted-foreground">
            <p>
              Karn HR Academy is a free study hub for HR &amp; Management students — built by an educator, not a
              content farm.
            </p>
            <p>
              We cover the subjects MBA, BBA and B.Com students actually sit exams in: Human Resource Management,
              Organisational Behaviour, Principles of Management, Strategic Management, Business Communication,
              Managerial &amp; Business Economics, OD &amp; Change Management and International HRM — plus a
              dedicated, unit-wise hub for{" "}
              <Link to="/ugc-net-labour-welfare" className="text-accent-deep hover:underline">UGC NET/JRF Labour Welfare</Link>{" "}
              (Paper II, Code 55).
            </p>
            <p>
              Every subject is organised the way your syllabus is: unit by unit, topic by topic, with structured
              notes, MCQ practice sets, previous year question papers and video lectures — so you study in the
              order you'll be examined.
            </p>
            <p>
              Founded by Nupur Karn — MBA, UGC NET qualified, PhD scholar and HR educator — who writes and
              reviews the content herself.
            </p>
            <p className="font-semibold text-foreground">Learn · Grow · Succeed.</p>
          </div>

          <div className="mt-6 flex flex-wrap items-center gap-x-6 gap-y-3">
            <SocialIconRow items={SOCIALS} size={40} />
            <Link to="/connect" className="inline-flex items-center gap-1 text-sm font-semibold text-accent-deep hover:underline">
              All channels &amp; QR codes <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </div>
        </section>

        {/* ── About the educator ──────────────────────────────────────── */}
        <section aria-labelledby="about-educator">
          <h2 id="about-educator" className="mb-6 text-xl font-bold text-foreground">The Educator</h2>
          <div className="grid items-start gap-12 lg:grid-cols-2">
            <div className="flex justify-center">
              <div className="relative">
                <div className="h-72 w-72 rounded-2xl bg-primary/10 flex items-center justify-center overflow-hidden">
                  {imageUrl ? (
                    <img src={imageUrl} alt="Nupur Karn, founder of Karn HR Academy" className="h-full w-full object-cover" />
                  ) : (
                    <span className="font-display text-6xl font-bold text-primary/20">HR</span>
                  )}
                </div>
                <div className="absolute -bottom-3 -right-3 rounded-lg bg-accent px-4 py-2">
                  <span className="text-sm font-bold text-accent-foreground">Educator</span>
                </div>
              </div>
            </div>
            <div>
              <p className="mb-1 text-lg font-bold text-foreground">Nupur Karn</p>
              <p className="mb-6 leading-relaxed text-muted-foreground">
                HR educator, researcher and academic content creator. Nupur's work bridges rigorous academic
                research and practical HR knowledge for students preparing for university exams and UGC NET/JRF.
              </p>
              <div className="space-y-3">
                {highlights.map((item) => (
                  <div key={item} className="flex items-center gap-3">
                    <CheckCircle2 className="h-4 w-4 shrink-0 text-accent-deep" />
                    <span className="text-sm font-medium text-foreground">{item}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>
      </main>
      <Footer />
    </div>
  );
};

export default AboutPage;
