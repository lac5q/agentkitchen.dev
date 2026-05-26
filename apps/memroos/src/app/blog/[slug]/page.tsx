import { notFound } from "next/navigation";
import type { Metadata } from "next";
import ReactMarkdown from "react-markdown";
import { getAllPostSlugs, getPostBySlug } from "@/lib/blog";
import { articleSchema, breadcrumbSchema, JsonLd } from "@/lib/schema";
import { makeCanonical, BASE_URL } from "@/lib/metadata";

interface Props {
  params: Promise<{ slug: string }>;
}

export async function generateStaticParams() {
  return getAllPostSlugs().map((slug) => ({ slug }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const post = getPostBySlug(slug);
  if (!post) return {};
  const { frontmatter } = post;
  return {
    title: `${frontmatter.title} | MemroOS`,
    description: frontmatter.description,
    keywords: frontmatter.keywords,
    alternates: { canonical: makeCanonical(`/blog/${slug}`) },
    openGraph: {
      title: frontmatter.title,
      description: frontmatter.description,
      url: `${BASE_URL}/blog/${slug}`,
      type: "article",
      publishedTime: frontmatter.publishedAt,
      modifiedTime: frontmatter.updatedAt ?? frontmatter.publishedAt,
    },
  };
}

export default async function BlogPostPage({ params }: Props) {
  const { slug } = await params;
  const post = getPostBySlug(slug);
  if (!post) notFound();

  const { frontmatter, content } = post;

  const date = new Date(frontmatter.publishedAt).toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  const breadcrumbs = [
    { name: "MemroOS", url: BASE_URL },
    { name: "Blog", url: `${BASE_URL}/blog` },
    { name: frontmatter.title, url: `${BASE_URL}/blog/${slug}` },
  ];

  return (
    <>
      <JsonLd
        data={articleSchema({
          title: frontmatter.title,
          description: frontmatter.description,
          url: `${BASE_URL}/blog/${slug}`,
          publishedAt: frontmatter.publishedAt,
          updatedAt: frontmatter.updatedAt,
          author: frontmatter.author,
        })}
      />
      <JsonLd data={breadcrumbSchema(breadcrumbs)} />
      <main className="mx-auto max-w-3xl px-4 py-16">
        <nav className="mb-8 text-sm text-slate-500">
          <a href="/" className="hover:text-slate-900">MemroOS</a>
          {" / "}
          <a href="/blog" className="hover:text-slate-900">Blog</a>
          {" / "}
          <span>{frontmatter.title}</span>
        </nav>

        <header className="mb-10">
          <h1 className="text-4xl font-bold mb-4">{frontmatter.title}</h1>
          <p className="text-xl text-slate-600 mb-4">{frontmatter.description}</p>
          <time className="text-sm text-slate-400">{date}</time>
          {frontmatter.tags?.length > 0 && (
            <div className="flex flex-wrap gap-2 mt-3">
              {frontmatter.tags.map((tag) => (
                <span key={tag} className="text-xs bg-slate-100 text-slate-600 px-2 py-0.5 rounded">
                  {tag}
                </span>
              ))}
            </div>
          )}
        </header>

        <article className="prose prose-slate max-w-none prose-headings:font-bold prose-a:text-amber-600 prose-a:no-underline hover:prose-a:underline">
          <ReactMarkdown>{content}</ReactMarkdown>
        </article>

        <div className="mt-16 rounded-xl bg-amber-50 border border-amber-200 p-8 text-center">
          <h2 className="text-2xl font-bold mb-3">Try MemroOS</h2>
          <p className="text-slate-600 mb-6">
            Self-hosted agentic memory and orchestration. Ready in 5 minutes.
          </p>
          <a
            href="https://github.com/lac5q/memroos"
            className="inline-flex items-center gap-2 rounded-lg bg-amber-600 text-white px-6 py-3 font-semibold hover:bg-amber-700 transition-colors"
          >
            Get Started on GitHub →
          </a>
        </div>
      </main>
    </>
  );
}
