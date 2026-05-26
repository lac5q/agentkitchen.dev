import { BASE_URL, OG_IMAGE_URL } from "./metadata";

// React 19 server components support string children in <script> tags directly.
// We escape < as < to prevent any edge-case injection in JSON string values.
function serializeJsonLd(data: object): string {
  return JSON.stringify(data).replace(/</g, "\\u003c");
}

export function organizationSchema() {
  return {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: "MemroOS",
    url: BASE_URL,
    logo: OG_IMAGE_URL,
    sameAs: ["https://github.com/lac5q/memroos"],
    description:
      "Shared memory and governed orchestration for agentic product, sales, and engineering workflows.",
  };
}

export function softwareApplicationSchema() {
  return {
    "@context": "https://schema.org",
    "@type": "SoftwareApplication",
    name: "MemroOS",
    applicationCategory: "BusinessApplication",
    operatingSystem: "Any",
    url: BASE_URL,
    description:
      "Agentic memory and orchestration platform. Retains what product, sales, and engineering agents learn, retrieves the right context at runtime, and provides governed orchestration.",
    offers: { "@type": "Offer", price: "0", priceCurrency: "USD" },
  };
}

export function articleSchema(opts: {
  title: string;
  description: string;
  url: string;
  publishedAt: string;
  updatedAt?: string;
  author?: string;
}) {
  return {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: opts.title,
    description: opts.description,
    url: opts.url,
    datePublished: opts.publishedAt,
    dateModified: opts.updatedAt ?? opts.publishedAt,
    author: { "@type": "Organization", name: opts.author ?? "MemroOS", url: BASE_URL },
    publisher: {
      "@type": "Organization",
      name: "MemroOS",
      url: BASE_URL,
      logo: { "@type": "ImageObject", url: OG_IMAGE_URL },
    },
    image: OG_IMAGE_URL,
    mainEntityOfPage: { "@type": "WebPage", "@id": opts.url },
  };
}

export function faqSchema(items: Array<{ question: string; answer: string }>) {
  return {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: items.map((item) => ({
      "@type": "Question",
      name: item.question,
      acceptedAnswer: { "@type": "Answer", text: item.answer },
    })),
  };
}

export function breadcrumbSchema(items: Array<{ name: string; url: string }>) {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: items.map((item, index) => ({
      "@type": "ListItem",
      position: index + 1,
      name: item.name,
      item: item.url,
    })),
  };
}

export function speakableSchema(cssSelectors: string[]) {
  return {
    "@context": "https://schema.org",
    "@type": "WebPage",
    speakable: {
      "@type": "SpeakableSpecification",
      cssSelector: cssSelectors,
    },
  };
}

// React 19 server components render string children of <script> as text content.
// This avoids the need for innerHTML assignment while still being server-rendered.
export function JsonLd({ data }: { data: object }) {
  return (
    <script type="application/ld+json">{serializeJsonLd(data)}</script>
  );
}
