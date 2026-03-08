import { Star, Quote } from "lucide-react";

const testimonials = [
  {
    name: "Priya S.",
    role: "MBA Student",
    text: "I stumbled upon KarnHR Academy while prepping for my MBA HRM exams and honestly, it's been a lifesaver. The notes are crisp, the quizzes actually make you think, and I love how everything is organized by topic. Two months in and I still come back every week!",
    rating: 5,
  },
  {
    name: "Rohan M.",
    role: "HR Executive",
    text: "As someone who just started their career in HR, this site feels like having a mentor available 24/7. The quiz leaderboard keeps me competitive with myself, and the resources on each HR topic are genuinely useful — not just fluff.",
    rating: 5,
  },
  {
    name: "Ananya K.",
    role: "HR Research Scholar",
    text: "What I appreciate most is how simple and clean everything is. No distractions, just solid content. I've downloaded almost every note and PDF here. The blog posts are short but packed with insights. Keep it up!",
    rating: 5,
  },
  {
    name: "Vikram T.",
    role: "PG Student",
    text: "My professor recommended this to our class and now half of us are hooked on the quizzes 😄 The timer adds just enough pressure to make it feel real. I've definitely improved my scores over the past couple months.",
    rating: 4,
  },
  {
    name: "Deepika R.",
    role: "Assistant HR Manager",
    text: "I've tried a lot of HR study platforms and most feel either too academic or too shallow. KarnHR Academy hits the sweet spot — practical, well-structured, and clearly made by someone who genuinely cares about HR education.",
    rating: 5,
  },
];

const initials = (name: string) => name.split(" ").map((n) => n[0]).join("").toUpperCase();

const TestimonialsSection = () => {
  return (
    <section className="border-t border-border bg-background py-20">
      <div className="mx-auto max-w-6xl px-6">
        <div className="mb-12 text-center">
          <span className="mb-2 inline-block rounded-full bg-accent/10 px-4 py-1 text-xs font-semibold uppercase tracking-widest text-accent">
            Testimonials
          </span>
          <h2
            className="mt-3 text-3xl font-bold text-foreground md:text-4xl"
            style={{ fontFamily: "'Playfair Display', serif" }}
          >
            What Our Learners Say
          </h2>
          <p className="mx-auto mt-3 max-w-2xl text-muted-foreground">
            Real feedback from students and professionals who use KarnHR Academy.
          </p>
        </div>

        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {testimonials.map((t, i) => (
            <div
              key={i}
              className="relative flex flex-col rounded-lg border border-border bg-card p-6 transition-shadow hover:shadow-md"
            >
              <Quote className="absolute right-4 top-4 h-8 w-8 text-accent/15" />
              <div className="mb-4 flex items-center gap-1">
                {Array.from({ length: 5 }).map((_, si) => (
                  <Star
                    key={si}
                    className={`h-4 w-4 ${si < t.rating ? "fill-yellow-400 text-yellow-400" : "text-muted-foreground/30"}`}
                  />
                ))}
              </div>
              <p className="mb-6 flex-1 text-sm leading-relaxed text-muted-foreground">
                "{t.text}"
              </p>
              <div className="flex items-center gap-3 border-t border-border pt-4">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-accent/10 text-sm font-bold text-accent">
                  {initials(t.name)}
                </div>
                <div>
                  <p className="text-sm font-semibold text-foreground">{t.name}</p>
                  <p className="text-xs text-muted-foreground">{t.role}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default TestimonialsSection;
