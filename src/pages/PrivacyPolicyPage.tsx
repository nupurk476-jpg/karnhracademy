import Header from "@/components/Header";
import Footer from "@/components/Footer";
import SEO from "@/components/SEO";

const PrivacyPolicyPage = () => {
  const lastUpdated = "5 July 2026";

  return (
    <div className="min-h-screen bg-background">
      <SEO
        title="Privacy Policy"
        description="How Karn HR Academy collects, uses, and protects your personal information."
        path="/privacy-policy"
      />
      <Header />
      <main id="main-content" className="mx-auto max-w-3xl px-6 py-16">
        <h1 className="mb-2 text-4xl font-bold text-foreground">Privacy Policy</h1>
        <p className="mb-10 text-sm text-muted-foreground">Last updated: {lastUpdated}</p>

        <div className="space-y-8 text-sm leading-relaxed text-muted-foreground">
          <section>
            <h2 className="mb-2 text-lg font-semibold text-foreground">1. What we collect</h2>
            <p>
              When you use Karn HR Academy, we may collect: your email address (if you sign up for
              an account, download a note, or subscribe to our newsletter); your display name and
              optional profile details (bio, phone, location) if you choose to add them to your
              profile; content you submit voluntarily, such as blog comments and quiz ratings; and
              basic usage data collected automatically by our hosting and analytics providers
              (e.g. pages visited, browser type).
            </p>
          </section>

          <section>
            <h2 className="mb-2 text-lg font-semibold text-foreground">2. How we use it</h2>
            <p>
              We use your information to: give you access to notes, quizzes, and lectures; send you
              new-content updates if you subscribe; track your quiz attempts and ratings so we can
              show your own history and leaderboard position; moderate and display blog comments;
              and respond to messages you send us. We do not sell your personal information to
              anyone.
            </p>
          </section>

          <section>
            <h2 className="mb-2 text-lg font-semibold text-foreground">3. Where it's stored</h2>
            <p>
              Account data, notes, quizzes, and comments are stored with Supabase, our database and
              authentication provider. The site itself is hosted on Vercel. Both providers implement
              industry-standard security practices; access to your account data is restricted by
              row-level security so that only you (and site administrators, where necessary for
              moderation) can see it.
            </p>
          </section>

          <section>
            <h2 className="mb-2 text-lg font-semibold text-foreground">4. Cookies & analytics</h2>
            <p>
              We use minimal, privacy-respecting analytics to understand how the site is used in
              aggregate (e.g. which pages are popular). We do not use advertising trackers or sell
              browsing data to third parties.
            </p>
          </section>

          <section>
            <h2 className="mb-2 text-lg font-semibold text-foreground">5. Your choices</h2>
            <p>
              You can update or delete your profile information at any time from your Profile page.
              You can unsubscribe from newsletter emails using the link in any email, or by
              contacting us directly. If you'd like your account and associated data fully deleted,
              email us and we will action it within a reasonable time.
            </p>
          </section>

          <section>
            <h2 className="mb-2 text-lg font-semibold text-foreground">6. Children's privacy</h2>
            <p>
              Karn HR Academy is intended for higher-education students and working professionals.
              It is not directed at children under 13, and we do not knowingly collect information
              from them.
            </p>
          </section>

          <section>
            <h2 className="mb-2 text-lg font-semibold text-foreground">7. Changes to this policy</h2>
            <p>
              We may update this policy as the platform evolves. Material changes will be reflected
              by updating the "Last updated" date above.
            </p>
          </section>

          <section>
            <h2 className="mb-2 text-lg font-semibold text-foreground">8. Contact us</h2>
            <p>
              Questions about this policy or your data? Email us at{" "}
              <a href="mailto:contact@karnhracademy.com" className="text-accent-deep hover:underline">
                contact@karnhracademy.com
              </a>.
            </p>
          </section>
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default PrivacyPolicyPage;
