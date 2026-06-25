import Header from "@/components/Header";
import Hero from "@/components/Hero";
import Footer from "@/components/Footer";
import NewsletterSignup from "@/components/NewsletterSignup";
import SEO from "@/components/SEO";
import SectionHeader from "@/components/SectionHeader";
import SubjectCard from "@/components/SubjectCard";
import ResourceCard from "@/components/ResourceCard";
import TopicPill from "@/components/TopicPill";
import FeatureCard from "@/components/FeatureCard";
import {
  BookOpen,
  Users,
  BarChart3,
  Target,
  TrendingUp,
  GraduationCap,
  DollarSign,
  Scale,
  Video,
  HelpCircle,
  Download,
} from "lucide-react";

const subjects = [
  {
    icon: BookOpen,
    title: "Human Resource Management",
    description: "Covers core HR functions including recruitment, selection, onboarding, and employee relations.",
    slug: "/notes?subject=hrm",
    color: "bg-blue-50",
    iconColor: "text-blue-600",
    count: 48,
  },
  {
    icon: Users,
    title: "Organisational Behaviour",
    description: "Explores individual, group, and organisational dynamics that shape workplace performance.",
    slug: "/notes?subject=ob",
    color: "bg-violet-50",
    iconColor: "text-violet-600",
    count: 36,
  },
  {
    icon: BarChart3,
    title: "HR Analytics",
    description: "Data-driven approaches to workforce planning, talent management, and HR decision-making.",
    slug: "/notes?subject=hrm",
    color: "bg-emerald-50",
    iconColor: "text-emerald-600",
    count: 22,
  },
  {
    icon: Target,
    title: "Strategic HRM",
    description: "Aligning HR strategies with organisational goals for sustainable competitive advantage.",
    slug: "/notes?subject=sm",
    color: "bg-amber-50",
    iconColor: "text-amber-600",
    count: 30,
  },
  {
    icon: TrendingUp,
    title: "Performance Management",
    description: "Systems and tools for setting goals, appraising performance, and driving employee development.",
    slug: "/notes?subject=hrm",
    color: "bg-rose-50",
    iconColor: "text-rose-600",
    count: 18,
  },
  {
    icon: GraduationCap,
    title: "Training & Development",
    description: "Methods, models, and frameworks for building employee capability and organisational learning.",
    slug: "/notes?subject=hrm",
    color: "bg-cyan-50",
    iconColor: "text-cyan-600",
    count: 25,
  },
  {
    icon: DollarSign,
    title: "Compensation Management",
    description: "Pay structures, benefits, incentive systems, and equity principles in modern organisations.",
    slug: "/notes?subject=hrm",
    color: "bg-orange-50",
    iconColor: "text-orange-600",
    count: 15,
  },
  {
    icon: Scale,
    title: "Industrial Relations",
    description: "Employer-employee dynamics, labour laws, collective bargaining, and dispute resolution.",
    slug: "/notes?subject=hrm",
    color: "bg-teal-50",
    iconColor: "text-teal-600",
    count: 20,
  },
];

const latestResources = [
  {
    type: "note" as const,
    title: "Introduction to HRM",
    subject: "HRM",
    description:
      "A comprehensive overview of Human Resource Management — its scope, objectives, functions, and role in modern organisations.",
    to: "/notes",
    date: "June 2025",
    isNew: true,
  },
  {
    type: "video" as const,
    title: "Motivation Theories Explained",
    subject: "OB",
    description:
      "In-depth walkthrough of Maslow, Herzberg, McGregor, and Vroom's motivation theories with real-world examples.",
    to: "/lectures",
    date: "June 2025",
    isNew: false,
  },
  {
    type: "blog" as const,
    title: "What is Strategic HRM?",
    subject: "Strategic HRM",
    description:
      "Understanding Strategic Human Resource Management — how it differs from operational HRM and why it matters for business success.",
    to: "/blogs",
    date: "May 2025",
    isNew: false,
  },
];

const topics = [
  { label: "Recruitment", to: "/notes?topic=recruitment" },
  { label: "Selection", to: "/notes?topic=selection" },
  { label: "Motivation", to: "/notes?topic=motivation" },
  { label: "Leadership", to: "/notes?topic=leadership" },
  { label: "Job Analysis", to: "/notes?topic=job-analysis" },
  { label: "Performance Appraisal", to: "/notes?topic=performance-appraisal" },
  { label: "HR Planning", to: "/notes?topic=hr-planning" },
  { label: "HR Analytics", to: "/notes?topic=hr-analytics" },
  { label: "Compensation", to: "/notes?topic=compensation" },
  { label: "Training", to: "/notes?topic=training" },
  { label: "OD & Change", to: "/notes?topic=od-change" },
  { label: "Talent Management", to: "/notes?topic=talent-management" },
  { label: "Industrial Relations", to: "/notes?topic=industrial-relations" },
  { label: "Business Ethics", to: "/notes?topic=business-ethics" },
  { label: "Strategic Planning", to: "/notes?topic=strategic-planning" },
  { label: "Organisational Culture", to: "/notes?topic=org-culture" },
];

const features = [
  {
    icon: GraduationCap,
    title: "Structured Notes",
    description:
      "Organised by subject, topic, and difficulty — perfect for exam prep.",
    iconBg: "bg-blue-50",
  },
  {
    icon: Video,
    title: "Video Lectures",
    description:
      "Concept-clarity videos by subject experts for visual learners.",
    iconBg: "bg-violet-50",
  },
  {
    icon: HelpCircle,
    title: "Practice MCQs",
    description:
      "Topic-wise MCQs to test and reinforce your understanding.",
    iconBg: "bg-emerald-50",
  },
  {
    icon: Download,
    title: "Free Downloads",
    description:
      "PDFs, PPTs, and study materials available for free download.",
    iconBg: "bg-amber-50",
  },
  {
    icon: BookOpen,
    title: "Academic Quality",
    description:
      "Research-backed content aligned with MBA and UGC NET syllabi.",
    iconBg: "bg-rose-50",
  },
];

const Index = () => {
  return (
    <div className="min-h-screen bg-background">
      <SEO
        title="Karn HR Academy — Academic Resource Hub for HR & Management"
        description="Structured notes, video lectures, practice MCQs, and research resources for MBA, BBA & UGC NET aspirants in HR & Management."
        path="/"
      />
      <Header />
      <main>
        <Hero />

        {/* Featured Subjects */}
        <section id="subjects" className="py-16 md:py-20">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="mb-10">
              <SectionHeader
                eyebrow="Browse by Subject"
                title="Explore Our Subject Areas"
                subtitle="Comprehensive study materials organised by subject for MBA, BBA and UGC NET preparation."
                action={{ label: "View all subjects", to: "/notes" }}
              />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {subjects.map((subj) => (
                <SubjectCard key={subj.title} {...subj} />
              ))}
            </div>
          </div>
        </section>

        {/* Latest Resources */}
        <section className="py-16 md:py-20 bg-slate-50 border-y border-border">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="mb-10">
              <SectionHeader
                eyebrow="Recently Added"
                title="Latest Resources"
                subtitle="Fresh notes, videos, and articles added to the library."
                action={{ label: "Browse all resources", to: "/notes" }}
              />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
              {latestResources.map((resource) => (
                <ResourceCard key={resource.title} {...resource} />
              ))}
            </div>
          </div>
        </section>

        {/* Popular Topics */}
        <section className="py-16 md:py-20">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="mb-8">
              <SectionHeader
                eyebrow="Quick Access"
                title="Popular Topics"
                subtitle="Jump straight to the topics students search most."
              />
            </div>
            <div className="flex flex-wrap gap-2">
              {topics.map((topic) => (
                <TopicPill key={topic.label} label={topic.label} to={topic.to} />
              ))}
            </div>
          </div>
        </section>

        {/* Why Choose */}
        <section className="py-16 md:py-20 bg-slate-50 border-y border-border">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="mb-10">
              <SectionHeader
                eyebrow="Why Karn HR Academy"
                title="Everything You Need to Excel"
                subtitle="Built for serious learners — all resources are structured, peer-reviewed, and syllabi-aligned."
                align="center"
              />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
              {features.map((feature) => (
                <FeatureCard key={feature.title} {...feature} />
              ))}
            </div>
          </div>
        </section>

        {/* Newsletter */}
        <NewsletterSignup />
      </main>
      <Footer />
    </div>
  );
};

export default Index;
