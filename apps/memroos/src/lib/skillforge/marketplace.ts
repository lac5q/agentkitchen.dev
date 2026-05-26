/**
 * SkillForge Marketplace — Phase 92
 * Publish, rate, and discover skills across the Memroos ecosystem.
 */

import type Database from "better-sqlite3";

export interface SkillListing {
  id: string;
  skillId: string;
  name: string;
  description: string;
  author: string;
  tags: string[];
  version: string;
  changelog: string;
  rating: number;
  reviewCount: number;
  downloadCount: number;
  category: string;
  publishedAt: Date;
  updatedAt: Date;
  deprecated: boolean;
  deprecationReason?: string;
}

export interface SkillReview {
  id: string;
  listingId: string;
  reviewer: string;
  rating: number;
  text: string;
  verified: boolean;
  createdAt: Date;
}

export interface PublishRequest {
  skillId: string;
  name: string;
  description: string;
  author: string;
  tags: string[];
  category: string;
  changelog: string;
}

export function publishSkill(
  db: Database.Database,
  req: PublishRequest
): { success: boolean; listingId?: string; error?: string } {
  try {
    const listingId = `market-${Date.now()}`;
    db.prepare(
      `INSERT INTO skill_marketplace (id, skill_id, name, description, author, tags, version, changelog, rating, review_count, download_count, category, published_at, updated_at, deprecated)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    ).run(
      listingId, req.skillId, req.name, req.description, req.author,
      JSON.stringify(req.tags), "1.0.0", req.changelog, 0, 0, 0,
      req.category, new Date().toISOString(), new Date().toISOString(), 0
    );
    return { success: true, listingId };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : String(err) };
  }
}

export function searchListings(
  db: Database.Database,
  options: {
    query?: string;
    category?: string;
    minRating?: number;
    sortBy?: "rating" | "downloads" | "newest";
    limit?: number;
    offset?: number;
  }
): { listings: SkillListing[]; total: number } {
  const { query, category, minRating, sortBy = "rating", limit = 20, offset = 0 } = options;
  const whereClauses: string[] = ["deprecated = 0"];
  const params: (string | number)[] = [];

  if (query) {
    whereClauses.push("(name LIKE ? OR description LIKE ?)");
    params.push(`%${query}%`, `%${query}%`);
  }
  if (category) {
    whereClauses.push("category = ?");
    params.push(category);
  }
  if (minRating !== undefined) {
    whereClauses.push("rating >= ?");
    params.push(minRating);
  }

  const where = whereClauses.join(" AND ");
  const countRow = db.prepare(`SELECT COUNT(*) as total FROM skill_marketplace WHERE ${where}`).get(...params) as { total: number };

  const sortMap = { rating: "rating DESC, review_count DESC", downloads: "download_count DESC", newest: "published_at DESC" };
  const orderBy = sortMap[sortBy] || sortMap.rating;

  const rows = db.prepare(
    `SELECT * FROM skill_marketplace WHERE ${where} ORDER BY ${orderBy} LIMIT ? OFFSET ?`
  ).all(...params, limit, offset) as Array<Record<string, unknown>>;

  const listings: SkillListing[] = rows.map((r) => ({
    id: r.id as string,
    skillId: r.skill_id as string,
    name: r.name as string,
    description: r.description as string,
    author: r.author as string,
    tags: JSON.parse(r.tags as string),
    version: r.version as string,
    changelog: r.changelog as string,
    rating: r.rating as number,
    reviewCount: r.review_count as number,
    downloadCount: r.download_count as number,
    category: r.category as string,
    publishedAt: new Date(r.published_at as string),
    updatedAt: new Date(r.updated_at as string),
    deprecated: Boolean(r.deprecated),
    deprecationReason: (r.deprecation_reason as string | null) ?? undefined,
  }));

  return { listings, total: countRow.total };
}

export function submitReview(
  db: Database.Database,
  listingId: string,
  review: Omit<SkillReview, "id" | "listingId" | "createdAt">
): { success: boolean; error?: string } {
  try {
    const reviewId = `review-${Date.now()}`;
    db.prepare(
      `INSERT INTO skill_reviews (id, listing_id, reviewer, rating, text, verified, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?)`
    ).run(reviewId, listingId, review.reviewer, review.rating, review.text, review.verified ? 1 : 0, new Date().toISOString());

    const avgRow = db.prepare(
      `SELECT AVG(rating) as avg_rating, COUNT(*) as count FROM skill_reviews WHERE listing_id = ?`
    ).get(listingId) as { avg_rating: number; count: number };

    db.prepare(
      `UPDATE skill_marketplace SET rating = ?, review_count = ?, updated_at = ? WHERE id = ?`
    ).run(avgRow.avg_rating, avgRow.count, new Date().toISOString(), listingId);

    return { success: true };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : String(err) };
  }
}

export function recordDownload(db: Database.Database, listingId: string): void {
  try {
    db.prepare(
      `UPDATE skill_marketplace SET download_count = download_count + 1, updated_at = ? WHERE id = ?`
    ).run(new Date().toISOString(), listingId);
  } catch { /* ignore */ }
}

export function deprecateSkill(db: Database.Database, listingId: string, reason: string): { success: boolean; error?: string } {
  try {
    db.prepare(
      `UPDATE skill_marketplace SET deprecated = 1, deprecation_reason = ?, updated_at = ? WHERE id = ?`
    ).run(reason, new Date().toISOString(), listingId);
    return { success: true };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : String(err) };
  }
}
