import { CheckCircle2 } from "lucide-react";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

const highlights = [
  "UGC NET Qualified",
  "PhD Scholar in HR",
  "Research Focus: Ethical HRM & Quiet Quitting",
];

const AboutPreview = () => {
  const [imageUrl, setImageUrl] = useState<string | null>(null);

  useEffect(() => {
    const { data } = supabase.storage.from("educator").getPublicUrl("profile.jpg");
    fetch(data.publicUrl, { method: "HEAD" }).then((res) => {
      if (res.ok) setImageUrl(data.publicUrl + "?t=" + Date.now());
    }).catch(() => {});
  }, []);

  return (
    <section className="bg-muted px-6 py-20">
      <div className="mx-auto max-w-6xl">
        <div className="grid items-center gap-12 lg:grid-cols-2">
          <div className="flex justify-center lg:justify-start">
            <div className="relative">
              <div className="h-72 w-72 rounded-2xl bg-primary/10 flex items-center justify-center overflow-hidden">
                {imageUrl ? (
                  <img src={imageUrl} alt="Educator" className="h-full w-full object-cover" />
                ) : (
                  <span className="text-6xl font-bold text-primary/20" style={{ fontFamily: "'Playfair Display', serif" }}>
                    HR
                  </span>
                )}
              </div>
              <div className="absolute -bottom-3 -right-3 rounded-lg bg-accent px-4 py-2">
                <span className="text-sm font-bold text-accent-foreground">Educator</span>
              </div>
            </div>
          </div>

          <div>
            <p className="mb-2 text-sm font-semibold uppercase tracking-[0.15em] text-accent">About</p>
            <h2 className="mb-4 text-3xl font-bold text-foreground md:text-4xl">
              Dedicated to Academic Excellence
            </h2>
            <p className="mb-6 leading-relaxed text-muted-foreground">
              With a passion for Human Resource Management and organizational sciences,
              this platform bridges the gap between rigorous academic research and
              practical HR knowledge.
            </p>
            <div className="space-y-3">
              {highlights.map((item) => (
                <div key={item} className="flex items-center gap-3">
                  <CheckCircle2 className="h-4 w-4 shrink-0 text-accent" />
                  <span className="text-sm font-medium text-foreground">{item}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default AboutPreview;
