import {
  authorizeChatGptAction,
  parseActionLimit,
  readJsonBody,
  searchMemroosForChatGpt,
} from "@/lib/chatgpt-actions";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function POST(request: Request) {
  const unauthorized = authorizeChatGptAction(request);
  if (unauthorized) return unauthorized;

  const body = await readJsonBody(request);
  const query = typeof body.query === "string" ? body.query.trim() : "";
  const limit = parseActionLimit(body.limit);

  if (!query) {
    return Response.json({ ok: false, error: "query is required" }, { status: 400 });
  }

  const outcome = await searchMemroosForChatGpt(query, limit);
  return Response.json({
    ok: true,
    query,
    ...outcome,
    timestamp: new Date().toISOString(),
  });
}
