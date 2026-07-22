import { Helmet } from "react-helmet-async";

const SITE_URL = "https://karnhracademy.com";
const SITE_NAME = "Karn HR Academy";
const DEFAULT_IMAGE = `${SITE_URL}/og-image.png`;

interface SEOProps {
  title: string;
  description: string;
  path: string;
  type?: "website" | "article";
  image?: string;
  jsonLd?: Record<string, any> | Record<string, any>[];
  /** Set on utility pages (auth, profile, search results, 404, admin) that
      should never appear in search engines. */
  noindex?: boolean;
}

const SEO = ({ title, description, path, type = "website", image = DEFAULT_IMAGE, jsonLd, noindex = false }: SEOProps) => {
  const url = `${SITE_URL}${path}`;
  // Truncate the page's own title, not the combined string — otherwise a
  // long page title can eat into (or fully drop) the "— Karn HR Academy"
  // suffix, which should always survive.
  const MAX_LEN = 60;
  let trimmedTitle: string;
  if (title.includes(SITE_NAME)) {
    trimmedTitle = title.length > MAX_LEN ? title.slice(0, MAX_LEN - 1) + "…" : title;
  } else {
    const suffix = ` — ${SITE_NAME}`;
    const budget = MAX_LEN - suffix.length;
    const trimmedBase = title.length > budget ? title.slice(0, budget - 1) + "…" : title;
    trimmedTitle = `${trimmedBase}${suffix}`;
  }
  const trimmedDesc = description.length > 160 ? description.slice(0, 157) + "…" : description;
  const jsonLdArray = jsonLd ? (Array.isArray(jsonLd) ? jsonLd : [jsonLd]) : [];

  return (
    <Helmet>
      <title>{trimmedTitle}</title>
      <meta name="description" content={trimmedDesc} />
      <meta name="robots" content={noindex ? "noindex, nofollow" : "index, follow"} />
      <link rel="canonical" href={url} />
      <meta property="og:title" content={trimmedTitle} />
      <meta property="og:description" content={trimmedDesc} />
      <meta property="og:url" content={url} />
      <meta property="og:type" content={type} />
      <meta property="og:site_name" content={SITE_NAME} />
      <meta property="og:image" content={image} />
      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:title" content={trimmedTitle} />
      <meta name="twitter:description" content={trimmedDesc} />
      <meta name="twitter:image" content={image} />
      {jsonLdArray.map((data, i) => (
        <script key={i} type="application/ld+json">{JSON.stringify(data)}</script>
      ))}
    </Helmet>
  );
};

export default SEO;