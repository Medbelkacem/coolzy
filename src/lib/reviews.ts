import { db } from "./db";

export type ReviewSummary = { avg: number; count: number; latest: { rating: number; comment: string; at: string }[] };

/** Approved reviews only — what the public menu may show. */
export async function getApprovedReviewSummary(productId: string): Promise<ReviewSummary> {
  const [agg, latest] = await Promise.all([
    db().review.aggregate({ where: { productId, status: "APPROVED" }, _avg: { rating: true }, _count: { _all: true } }),
    db().review.findMany({
      where: { productId, status: "APPROVED", comment: { not: "" } },
      orderBy: { createdAt: "desc" },
      take: 3,
      select: { rating: true, comment: true, createdAt: true },
    }),
  ]);
  return {
    avg: Math.round((agg._avg.rating ?? 0) * 10) / 10,
    count: agg._count._all,
    latest: latest.map((r) => ({ rating: r.rating, comment: r.comment, at: r.createdAt.toISOString() })),
  };
}

/** Strip control characters and collapse whitespace. Stored as plain text. */
export function sanitizeComment(raw: string): string {
  const CONTROL = new RegExp("[\\u0000-\\u0008\\u000B\\u000C\\u000E-\\u001F\\u007F]", "g");
  return raw.replace(CONTROL, "").replace(/[ \t]+/g, " ").replace(/\n{3,}/g, "\n\n").trim();
}

export const REVIEW_EDIT_WINDOW_MS = 24 * 60 * 60 * 1000;
