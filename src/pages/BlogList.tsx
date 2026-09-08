import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { track, EVENTS } from "@/lib/analytics";
import { Link } from "react-router-dom";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import SEO from "@/components/SEO";
import {
  Search, ChevronRight, BookOpen, Clock, User, Calendar,
  TrendingUp, Flame, ArrowUpDown, Mail, Tag, LayoutList,
  Layers, GraduationCap, Briefcase, Brain, BarChart3, Heart,
  MessageSquare, Globe, Lightbulb,
} from "lucide-react";

// ── Category config ──────────────────────────────────────────────────────────
const CATEGORIES = [
  { label: "All",                     icon: Layers },
  { label: "HRM Basics",              icon: BookOpen },
  { label: "Organisational Behaviour",icon: Brain },
  { label: "Research Methodology",    icon: BarChart3 },
  { label: "Ethical HRM",             icon: Heart },
  { label: "Quiet Quitting",          icon: MessageSquare },
  { label: "General Studies",         icon: GraduationCap },
  { label: "Current Affairs",         icon: Globe },
];

const SORT_OPTIONS = [
  { label: "Newest",    value: "newest",    icon: Calendar },
  { label: "Trending",  value: "trending",  icon: Flame },
  { label: "Popular",   value: "popular",   icon: TrendingUp },
];

const TAGS = [
  "HRM", "Leadership", "Motivation", "Recruitment", "HR Analytics",
  "Performance", "Training", "OB", "Strategic HRM", "UGC NET/JRF",
  "MBA", "Research", "Compensation", "Industrial Relations",
];

// ── Helpers ──────────────────────────────────────────────────────────────────
function readingTime(content: string) {
  const words = (content || "").replace(/<[^>]+>/g, " ").split(/\s+/).filter(Boolean).length;
  return Math.max(1, Math.round(words / 200));
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
}

// ── Sub-components ────────────────────────────────────────────────────────────
const CategoryBadge = ({ label }: { label: string }) => (
  <span className="inline-block rounded-full bg-accent/10 px-3 py-0.5 text-xs font-semibold text-accent-deep">
    {label}
  </span>
);

const ArticleCard = ({ post }: { post: any }) => {
  const mins = readingTime(post.content);
  return (
    <Link
      to={`/blogs/${post.slug}`}
      className="group flex flex-col overflow-hidden rounded-xl border border-border bg-white shadow-sm hover:shadow-md transition-all duration-200"
    >
      {/* Cover image */}
      <div className="relative h-48 w-full overflow-hidden bg-slate-100">
        {post.cover_image ? (
          <img
            src={post.cover_image}
            alt={post.title}
            loading="lazy"
            decoding="async"
            className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
          />
        ) : (
          <div className="flex h-full items-center justify-center bg-gradient-to-br from-slate-100 to-slate-200">
            <BookOpen className="h-10 w-10 text-slate-300" />
          </div>
        )}
        <div className="absolute top-3 left-3">
          <CategoryBadge label={post.category} />
        </div>
      </div>

      {/* Body */}
      <div className="flex flex-1 flex-col p-5">
        <h2 className="mb-2 text-base font-bold leading-snug text-foreground group-hover:text-accent-deep transition-colors line-clamp-2">
          {post.title}
        </h2>
        <p className="mb-4 flex-1 text-sm leading-relaxed text-muted-foreground line-clamp-3">
          {post.excerpt || "Read this article to explore key insights on this topic."}
        </p>

        {/* Meta row */}
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground border-t border-border pt-3 mt-auto">
          <span className="flex items-center gap-1"><User className="h-3 w-3" />{post.author_name}</span>
          <span className="flex items-center gap-1"><Calendar className="h-3 w-3" />{formatDate(post.created_at)}</span>
          <span className="flex items-center gap-1"><Clock className="h-3 w-3" />{mins} min read</span>
        </div>

        <span className="mt-3 inline-flex items-center gap-1 text-xs font-semibold text-accent-deep group-hover:gap-2 transition-all">
          Read Article <ChevronRight className="h-3.5 w-3.5" />
        </span>
      </div>
    </Link>
  );
};

const FeaturedArticle = ({ post }: { post: any }) => {
  const mins = readingTime(post.content);
  return (
    <Link
      to={`/blogs/${post.slug}`}
      className="group grid lg:grid-cols-2 gap-0 overflow-hidden rounded-2xl border border-border bg-white shadow-sm hover:shadow-lg transition-all duration-200"
    >
      <div className="relative min-h-64 lg:min-h-80 overflow-hidden bg-slate-100">
        {post.cover_image ? (
          <img
            src={post.cover_image}
            alt={post.title}
            className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
          />
        ) : (
          <div className="flex h-full min-h-64 items-center justify-center bg-gradient-to-br from-primary/10 to-accent/10">
            <BookOpen className="h-16 w-16 text-accent-deep/30" />
          </div>
        )}
        <div className="absolute top-4 left-4">
          <span className="inline-block rounded-full bg-accent px-3 py-1 text-xs font-bold text-accent-foreground shadow">
            Featured
          </span>
        </div>
      </div>

      <div className="flex flex-col justify-center p-8 lg:p-10">
        <div className="mb-3">
          <CategoryBadge label={post.category} />
        </div>
        <h2 className="mb-3 text-2xl font-bold leading-snug text-foreground group-hover:text-accent-deep transition-colors">
          {post.title}
        </h2>
        <p className="mb-6 text-sm leading-relaxed text-muted-foreground line-clamp-4">
          {post.excerpt || "Explore this featured article for deep insights on this important HR and management topic."}
        </p>
        <div className="mb-6 flex flex-wrap gap-x-4 gap-y-2 text-xs text-muted-foreground">
          <span className="flex items-center gap-1.5"><User className="h-3.5 w-3.5" />{post.author_name}</span>
          <span className="flex items-center gap-1.5"><Calendar className="h-3.5 w-3.5" />{formatDate(post.created_at)}</span>
          <span className="flex items-center gap-1.5"><Clock className="h-3.5 w-3.5" />{mins} min read</span>
        </div>
        <span className="inline-flex w-fit items-center gap-2 rounded-lg bg-accent px-5 py-2.5 text-sm font-semibold text-accent-foreground hover:brightness-105 transition-all">
          Read Article <ChevronRight className="h-4 w-4" />
        </span>
      </div>
    </Link>
  );
};

// ── Sidebar ───────────────────────────────────────────────────────────────────
const Sidebar = ({
  allPosts,
  onCategory,
  onSubscribe,
}: {
  allPosts: any[];
  onCategory: (c: string) => void;
  onSubscribe: (email: string) => void;
}) => {
  const [subEmail, setSubEmail] = useState("");
  const popular = allPosts.slice(0, 5);
  const latest = [...allPosts].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()).slice(0, 5);

  return (
    <aside className="space-y-6">
      {/* Popular Articles */}
      <div className="rounded-xl border border-border bg-white p-5">
        <h3 className="mb-4 flex items-center gap-2 text-sm font-bold uppercase tracking-wider text-foreground">
          <Flame className="h-4 w-4 text-accent-deep" /> Popular Articles
        </h3>
        <ol className="space-y-3">
          {popular.map((p, i) => (
            <li key={p.id}>
              <Link to={`/blogs/${p.slug}`} className="group flex items-start gap-3">
                <span className="mt-0.5 flex h-5 w-5 flex-shrink-0 items-center justify-center rounded bg-accent/10 text-xs font-bold text-accent-deep">
                  {i + 1}
                </span>
                <span className="text-sm text-muted-foreground leading-snug group-hover:text-foreground transition-colors line-clamp-2">
                  {p.title}
                </span>
              </Link>
            </li>
          ))}
        </ol>
      </div>

      {/* Latest Posts */}
      <div className="rounded-xl border border-border bg-white p-5">
        <h3 className="mb-4 flex items-center gap-2 text-sm font-bold uppercase tracking-wider text-foreground">
          <Clock className="h-4 w-4 text-accent-deep" /> Latest Posts
        </h3>
        <div className="space-y-3">
          {latest.map((p) => (
            <Link key={p.id} to={`/blogs/${p.slug}`} className="group flex gap-3">
              <div className="h-12 w-14 flex-shrink-0 overflow-hidden rounded-md bg-slate-100">
                {p.cover_image
                  ? <img src={p.cover_image} alt={p.title} loading="lazy" decoding="async" className="h-full w-full object-cover" />
                  : <div className="flex h-full items-center justify-center"><BookOpen className="h-4 w-4 text-slate-300" /></div>
                }
              </div>
              <div>
                <p className="text-sm font-medium text-foreground leading-snug group-hover:text-accent-deep transition-colors line-clamp-2">{p.title}</p>
                <p className="mt-0.5 text-xs text-muted-foreground">{formatDate(p.created_at)}</p>
              </div>
            </Link>
          ))}
        </div>
      </div>

      {/* Categories */}
      <div className="rounded-xl border border-border bg-white p-5">
        <h3 className="mb-4 flex items-center gap-2 text-sm font-bold uppercase tracking-wider text-foreground">
          <LayoutList className="h-4 w-4 text-accent-deep" /> Categories
        </h3>
        <div className="space-y-1">
          {CATEGORIES.filter(c => c.label !== "All").map((cat) => {
            const Icon = cat.icon;
            const count = allPosts.filter(p => p.category === cat.label).length;
            return (
              <button
                key={cat.label}
                onClick={() => onCategory(cat.label)}
                className="flex w-full items-center justify-between rounded-md px-2 py-1.5 text-sm text-muted-foreground hover:bg-slate-50 hover:text-foreground transition-colors"
              >
                <span className="flex items-center gap-2"><Icon className="h-3.5 w-3.5 text-accent-deep" />{cat.label}</span>
                <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs font-medium">{count}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Tags */}
      <div className="rounded-xl border border-border bg-white p-5">
        <h3 className="mb-4 flex items-center gap-2 text-sm font-bold uppercase tracking-wider text-foreground">
          <Tag className="h-4 w-4 text-accent-deep" /> Tags
        </h3>
        <div className="flex flex-wrap gap-2">
          {TAGS.map(tag => (
            <span key={tag} className="cursor-pointer rounded-full border border-border bg-slate-50 px-3 py-1 text-xs font-medium text-muted-foreground hover:border-accent hover:text-accent-deep transition-colors">
              {tag}
            </span>
          ))}
        </div>
      </div>

      {/* Newsletter */}
      <div className="rounded-xl border border-accent/20 bg-gradient-to-br from-primary/5 to-accent/5 p-5">
        <div className="mb-1 flex items-center gap-2">
          <Mail className="h-4 w-4 text-accent-deep" />
          <h3 className="text-sm font-bold text-foreground">Stay Updated</h3>
        </div>
        <p className="mb-4 text-xs leading-relaxed text-muted-foreground">
          Get new articles, notes, and study resources delivered to your inbox.
        </p>
        <input
          type="email"
          placeholder="your@email.com"
          value={subEmail}
          onChange={e => setSubEmail(e.target.value)}
          className="mb-2 w-full rounded-md border border-border bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-accent/30"
        />
        <button
          onClick={() => { onSubscribe(subEmail); setSubEmail(""); }}
          className="w-full rounded-md bg-accent px-4 py-2 text-sm font-semibold text-accent-foreground hover:brightness-110 transition-all"
        >
          Subscribe
        </button>
      </div>
    </aside>
  );
};

// ── Main page ─────────────────────────────────────────────────────────────────
const BlogList = () => {
  const [posts, setPosts] = useState<any[]>([]);
  const [category, setCategory] = useState("All");
  const [search, setSearch] = useState("");
  const [sort, setSort] = useState("newest");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    supabase
      .from("blog_posts")
      .select("*")
      .eq("published", true)
      .order("created_at", { ascending: false })
      .then(({ data }) => {
        data && setPosts(data);
        setLoading(false);
      });
  }, []);

  const handleSubscribe = async (email: string) => {
    if (!email.trim()) return;
    await supabase.from("email_subscribers").upsert({ email: email.trim() }, { onConflict: "email" });
    track(EVENTS.NEWSLETTER_SUBSCRIBE, { where: "blog" });
  };

  const filtered = posts
    .filter(p => category === "All" || p.category === category)
    .filter(p => !search || [p.title, p.excerpt, p.category].filter(Boolean).some((v: string) => v.toLowerCase().includes(search.toLowerCase())))
    .sort((a, b) => {
      if (sort === "newest") return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
      return 0;
    });

  const featured = filtered[0] ?? null;
  const rest = filtered.slice(1);

  return (
    <div className="min-h-screen bg-slate-50">
      <SEO
        title="Blog — HR & Management Insights"
        description="In-depth articles on Human Resource Management, Organisational Behaviour, Strategic HRM, and academic research for MBA, BBA, and UGC NET/JRF aspirants."
        path="/blogs"
      />
      <Header />

      {/* ── Hero ────────────────────────────────────────────────────────── */}
      <section className="bg-white border-b border-border">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-14">
          {/* Breadcrumb */}
          <nav className="mb-5 flex items-center gap-1.5 text-xs text-muted-foreground">
            <Link to="/" className="hover:text-accent-deep transition-colors">Home</Link>
            <ChevronRight className="h-3 w-3" />
            <span className="text-foreground font-medium">Blog</span>
          </nav>

          <div className="max-w-2xl">
            <p className="mb-2 text-xs font-semibold uppercase tracking-widest text-accent-deep">
              Academic Insights
            </p>
            <h1 className="mb-4 text-4xl font-bold leading-tight text-foreground">
              HR & Management<br />Knowledge Hub
            </h1>
            <p className="mb-8 text-base leading-relaxed text-muted-foreground">
              Research-backed articles on Human Resource Management, Organisational Behaviour, Strategic HRM, and more — curated for MBA students, HR professionals, and UGC NET/JRF aspirants.
            </p>

            {/* Value points */}
            <div className="mb-8 flex flex-wrap gap-x-6 gap-y-2 text-sm text-muted-foreground">
              {[
                { icon: BookOpen, text: "Expert-written content" },
                { icon: GraduationCap, text: "MBA & NET aligned" },
                { icon: BarChart3, text: "Research-backed" },
              ].map(({ icon: Icon, text }) => (
                <span key={text} className="flex items-center gap-1.5">
                  <Icon className="h-4 w-4 text-accent-deep" /> {text}
                </span>
              ))}
            </div>

            {/* Search bar */}
            <div className="relative max-w-xl">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <input
                type="text"
                placeholder="Search articles, topics, authors…"
                value={search}
                onChange={e => setSearch(e.target.value)}
                className="w-full rounded-xl border border-border bg-slate-50 pl-11 pr-4 py-3 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-accent/30 focus:border-accent shadow-sm"
              />
            </div>
          </div>
        </div>
      </section>

      {/* ── Category chips ───────────────────────────────────────────────── */}
      <div className="sticky top-16 z-30 bg-white border-b border-border shadow-sm">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex items-center gap-2 overflow-x-auto py-3 scrollbar-none">
            {CATEGORIES.map((cat) => {
              const Icon = cat.icon;
              const active = category === cat.label;
              return (
                <button
                  key={cat.label}
                  onClick={() => setCategory(cat.label)}
                  className={`flex flex-shrink-0 items-center gap-1.5 rounded-full px-4 py-1.5 text-sm font-medium transition-all ${
                    active
                      ? "bg-accent text-accent-foreground shadow-sm"
                      : "bg-slate-100 text-muted-foreground hover:bg-slate-200 hover:text-foreground"
                  }`}
                >
                  <Icon className="h-3.5 w-3.5" />
                  {cat.label}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* ── Main content ─────────────────────────────────────────────────── */}
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-10">
        <div className="flex gap-8 xl:gap-10">

          {/* Left: articles */}
          <div className="min-w-0 flex-1">

            {/* Sort + count bar */}
            <div className="mb-6 flex items-center justify-between gap-4">
              <p className="text-sm text-muted-foreground">
                {loading ? "Loading…" : `${filtered.length} article${filtered.length !== 1 ? "s" : ""}`}
                {category !== "All" && <span> in <strong className="text-foreground">{category}</strong></span>}
              </p>
              <div className="flex items-center gap-1 rounded-lg border border-border bg-white p-1">
                {SORT_OPTIONS.map((opt) => {
                  const Icon = opt.icon;
                  return (
                    <button
                      key={opt.value}
                      onClick={() => setSort(opt.value)}
                      className={`flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${
                        sort === opt.value
                          ? "bg-accent text-accent-foreground"
                          : "text-muted-foreground hover:text-foreground"
                      }`}
                    >
                      <Icon className="h-3 w-3" />
                      {opt.label}
                    </button>
                  );
                })}
              </div>
            </div>

            {loading ? (
              /* Skeleton */
              <div className="space-y-6">
                <div className="h-64 w-full animate-pulse rounded-2xl bg-slate-200" />
                <div className="grid gap-6 sm:grid-cols-2">
                  {[1,2,3,4].map(i => <div key={i} className="h-72 animate-pulse rounded-xl bg-slate-200" />)}
                </div>
              </div>
            ) : filtered.length === 0 ? (
              <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-border bg-white py-20 text-center">
                <BookOpen className="mb-3 h-10 w-10 text-slate-300" />
                <p className="font-medium text-muted-foreground">No articles found</p>
                <p className="mt-1 text-sm text-muted-foreground">Try a different search term or category.</p>
                <button onClick={() => { setSearch(""); setCategory("All"); }} className="mt-4 text-sm font-medium text-accent-deep hover:underline">
                  Clear filters
                </button>
              </div>
            ) : (
              <>
                {/* Featured article */}
                {featured && (
                  <div className="mb-8">
                    <FeaturedArticle post={featured} />
                  </div>
                )}

                {/* Grid */}
                {rest.length > 0 && (
                  <div className="grid gap-6 sm:grid-cols-2">
                    {rest.map(post => <ArticleCard key={post.id} post={post} />)}
                  </div>
                )}
              </>
            )}
          </div>

          {/* Right: sidebar (desktop only) */}
          <div className="hidden xl:block w-72 flex-shrink-0">
            <Sidebar allPosts={posts} onCategory={setCategory} onSubscribe={handleSubscribe} />
          </div>
        </div>
      </div>

      <Footer />
    </div>
  );
};

export default BlogList;
