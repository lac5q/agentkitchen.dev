import type { Metadata } from "next";
import { getAllPosts } from "@/lib/blog";
import { PostCard } from "@/components/blog/post-card";
import { makeTitle, makeCanonical, BASE_URL } from "@/lib/metadata";
import { faqSchema, JsonLd } from "@/lib/schema";

export const metadata: Metadata = {
  title: makeTitle("Blog — AI Agent Memory & Orchestration"),
  description:
    "Guides, benchmarks, and deep dives on AI agent memory, orchestration, and agentic workflows. Written by the MemroOS team.",
  alternates: { canonical: makeCanonical("/blog") },
  openGraph: {
    title: "MemroOS Blog — AI Agent Memory & Orchestration",
    description:
      "Guides, benchmarks, and deep dives on agentic memory, orchestration, and AI workflows.",
    url: `${BASE_URL}/blog`,
  },
};

const faqs = [
  {
    question: "What is the MemroOS blog about?",
    answer:
      "The MemroOS blog covers AI agent memory architecture, orchestration patterns, benchmark analysis, and practical guides for building agents with persistent context.",
  },
];

export default function BlogPage() {
  const posts = getAllPosts();

  return (
    <>
      <JsonLd data={faqSchema(faqs)} />
      <main className="mx-auto max-w-3xl px-4 py-16">
        <nav className="mb-8 text-sm text-slate-500">
          <a href="/" className="hover:text-slate-900">MemroOS</a>
          {" / "}
          <span>Blog</span>
        </nav>

        <h1 className="text-4xl font-bold mb-4">Blog</h1>
        <p className="text-xl text-slate-600 mb-12">
          Guides, benchmarks, and deep dives on AI agent memory and orchestration.
        </p>

        {posts.length === 0 ? (
          <p className="text-slate-500">No posts yet. Check back soon.</p>
        ) : (
          <div className="space-y-8">
            {posts.map((post) => (
              <PostCard key={post.slug} post={post} />
            ))}
          </div>
        )}
      </main>
    </>
  );
}
