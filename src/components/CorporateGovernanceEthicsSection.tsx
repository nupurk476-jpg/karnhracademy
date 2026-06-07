import { Link } from "react-router-dom";
import {
  Scale, Landmark, UsersRound, ShieldCheck, HeartHandshake, TreePine, Gavel, AlertTriangle, Leaf,
} from "lucide-react";

const cgbeTopics = [
  { label: "Introduction to Corporate Governance", slug: "introduction-to-cg", icon: Landmark, desc: "Concept, principles & significance of corporate governance" },
  { label: "Board of Directors & Committees", slug: "board-of-directors", icon: UsersRound, desc: "Composition, roles, responsibilities & board effectiveness" },
  { label: "Shareholders & Stakeholders", slug: "shareholders-stakeholders", icon: ShieldCheck, desc: "Rights of shareholders & stakeholder theory in governance" },
  { label: "Governance Codes & Regulations", slug: "governance-codes", icon: Gavel, desc: "SEBI, Companies Act, Clause 49 & international codes" },
  { label: "Business Ethics & CSR", slug: "business-ethics-csr", icon: HeartHandshake, desc: "Moral principles, values & corporate social responsibility" },
  { label: "Ethical Decision Making", slug: "ethical-decision-making", icon: Scale, desc: "Frameworks, dilemmas & moral reasoning in business" },
  { label: "Corporate Social Responsibility", slug: "corporate-social-responsibility", icon: TreePine, desc: "CSR models, sustainability & triple bottom line approach" },
  { label: "Sustainability & ESG", slug: "sustainability-esg", icon: Leaf, desc: "Environmental, Social & Governance criteria & reporting" },
  { label: "Insider Trading & Fraud", slug: "insider-trading-fraud", icon: AlertTriangle, desc: "Market abuse, fraud prevention & whistleblower mechanisms" },
];

const CorporateGovernanceEthicsSection = () => {
  return (
    <section className="border-t border-border bg-muted/30 py-20">
      <div className="mx-auto max-w-6xl px-6">
        <div className="mb-12 text-center">
          <span className="mb-2 inline-block rounded-full bg-accent/10 px-4 py-1 text-xs font-semibold uppercase tracking-widest text-accent">
            Ethics & Compliance
          </span>
          <h2
            className="mt-3 text-3xl font-bold text-foreground md:text-4xl"
            style={{ fontFamily: "'Playfair Display', serif" }}
          >
            Corporate Governance & Business Ethics
          </h2>
          <p className="mx-auto mt-3 max-w-2xl text-muted-foreground">
            Understand governance frameworks, ethical standards & regulatory compliance — vital for MBA, BBA & UGC NET aspirants.
          </p>
        </div>

        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {cgbeTopics.map((topic) => (
            <Link
              key={topic.slug}
              to={`/cgbe/${topic.slug}`}
              className="group flex flex-col rounded-lg border border-border bg-card p-6 transition-all hover:border-accent hover:shadow-lg hover:shadow-accent/5"
            >
              <div className="mb-4 flex h-11 w-11 items-center justify-center rounded-lg bg-accent/10 text-accent transition-colors group-hover:bg-accent group-hover:text-accent-foreground">
                <topic.icon className="h-5 w-5" />
              </div>
              <h3 className="mb-1 text-base font-semibold text-foreground">{topic.label}</h3>
              <p className="text-sm leading-relaxed text-muted-foreground">{topic.desc}</p>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
};

export { cgbeTopics };
export default CorporateGovernanceEthicsSection;
