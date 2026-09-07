import Header from "@/components/Header";
import Footer from "@/components/Footer";
import SEO from "@/components/SEO";

const TermsPage = () => {
  const lastUpdated = "5 July 2026";

  return (
    <div className="min-h-screen bg-background">
      <SEO
        title="Terms of Use"
        description="The terms and conditions for using Karn HR Academy's notes, quizzes, lectures, and other resources."
        path="/terms"
      />
      <Header />
      <main id="main-content" className="mx-auto max-w-3xl px-6 py-16">
        <h1 className="mb-2 text-4xl font-bold text-foreground">Terms of Use</h1>
        <p className="mb-10 text-sm text-muted-foreground">Last updated: {lastUpdated}</p>

        <div className="space-y-8 text-sm leading-relaxed text-muted-foreground">
          <section>
            <h2 className="mb-2 text-lg font-semibold text-foreground">1. Acceptance of terms</h2>
            <p>
              By accessing or using Karn HR Academy ("the Site"), you agree to these Terms of Use.
              If you do not agree, please do not use the Site.
            </p>
          </section>

          <section>
            <h2 className="mb-2 text-lg font-semibold text-foreground">2. What we offer</h2>
            <p>
              Karn HR Academy provides free study notes, video lectures, practice MCQs, blog
              articles, and book recommendations for HR & Management education (MBA, BBA, UGC NET/JRF,
              and working professionals). Content is provided for personal, non-commercial,
              educational use only.
            </p>
          </section>

          <section>
            <h2 className="mb-2 text-lg font-semibold text-foreground">3. Accounts</h2>
            <p>
              Some features (saving quiz results, rating quizzes, commenting) require an account.
              You're responsible for keeping your login credentials secure and for all activity
              under your account. You must provide accurate information when creating an account.
            </p>
          </section>

          <section>
            <h2 className="mb-2 text-lg font-semibold text-foreground">4. Acceptable use</h2>
            <p>
              You agree not to: redistribute, resell, or republish our notes, quizzes, or other
              content without permission; post abusive, defamatory, or unlawful comments; attempt to
              disrupt the Site, its database, or other users' access; or use automated tools to
              scrape or bulk-download content.
            </p>
          </section>

          <section>
            <h2 className="mb-2 text-lg font-semibold text-foreground">5. Content ownership</h2>
            <p>
              All notes, quiz questions, video lectures, and articles on the Site are the
              intellectual property of Karn HR Academy or its contributing educator(s), unless
              otherwise credited. Book recommendations link to third-party retailers; we are not
              responsible for those external sites.
            </p>
          </section>

          <section>
            <h2 className="mb-2 text-lg font-semibold text-foreground">6. User-submitted content</h2>
            <p>
              Blog comments and quiz ratings you submit may be displayed publicly (comments are
              reviewed before publishing). By submitting content, you confirm it's your own and
              grant us permission to display it on the Site. We may remove any submission at our
              discretion.
            </p>
          </section>

          <section>
            <h2 className="mb-2 text-lg font-semibold text-foreground">7. No warranty</h2>
            <p>
              Content is provided for educational reference and exam preparation support. While we
              take care to keep it accurate and up to date, we make no guarantee of completeness,
              accuracy, or exam outcomes, and the Site is provided "as is" without warranties of any
              kind.
            </p>
          </section>

          <section>
            <h2 className="mb-2 text-lg font-semibold text-foreground">8. Limitation of liability</h2>
            <p>
              To the fullest extent permitted by law, Karn HR Academy is not liable for any indirect,
              incidental, or consequential damages arising from your use of the Site.
            </p>
          </section>

          <section>
            <h2 className="mb-2 text-lg font-semibold text-foreground">9. Changes to these terms</h2>
            <p>
              We may update these Terms from time to time. Continued use of the Site after changes
              means you accept the updated Terms.
            </p>
          </section>

          <section>
            <h2 className="mb-2 text-lg font-semibold text-foreground">10. Contact us</h2>
            <p>
              Questions about these Terms? Email{" "}
              <a href="mailto:nupur@karnhracademy.com" className="text-accent-deep hover:underline">
                nupur@karnhracademy.com
              </a>.
            </p>
          </section>
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default TermsPage;
