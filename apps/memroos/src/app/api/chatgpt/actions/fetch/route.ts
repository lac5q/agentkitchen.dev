import {
  authorizeChatGptAction,
  decodeChatGptActionResult,
  readJsonBody,
} from "@/lib/chatgpt-actions";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function POST(request: Request) {
  const unauthorized = authorizeChatGptAction(request);
  if (unauthorized) return unauthorized;

  const body = await readJsonBody(request);
  const id = typeof body.id === "string" ? body.id : "";
  if (!id) {
    return Response.json({ ok: false, error: "id is required" }, { status: 400 });
  }

  try {
    const result = decodeChatGptActionResult(id);
    return Response.json({ ok: true, id, ...result, timestamp: new Date().toISOString() });
  } catch (error) {
    return Response.json(
      { ok: false, error: error instanceof Error ? error.message : "Invalid MemRoOS result id" },
      { status: 400 }
    );
  }
}
