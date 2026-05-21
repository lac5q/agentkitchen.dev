import {
  authorizeChatGptAction,
  readJsonBody,
  saveMemroosFromChatGpt,
} from "@/lib/chatgpt-actions";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

function metadataFrom(value: unknown): Record<string, unknown> | undefined {
  return value !== null && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : undefined;
}

export async function POST(request: Request) {
  const unauthorized = authorizeChatGptAction(request);
  if (unauthorized) return unauthorized;

  const body = await readJsonBody(request);
  const text = typeof body.text === "string" ? body.text.trim() : "";
  const type = typeof body.type === "string" ? body.type : undefined;
  const source = typeof body.source === "string" ? body.source : undefined;

  if (!text) {
    return Response.json({ ok: false, error: "text is required" }, { status: 400 });
  }

  try {
    const result = await saveMemroosFromChatGpt({ text, type, source, metadata: metadataFrom(body.metadata) });
    return Response.json({ ok: true, ...result, timestamp: new Date().toISOString() });
  } catch (error) {
    return Response.json(
      { ok: false, error: error instanceof Error ? error.message : "Unable to save memory" },
      { status: 502 }
    );
  }
}
