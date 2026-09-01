import { guard, ok } from "@/lib/guard";
import { listSubmissions, toView } from "@/lib/submissions";

/** The review queue. Never exposes the stored source hash. */

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(req: Request) {
  const g = await guard(req);
  if (!g.ok) return g.response;
  const all = await listSubmissions();
  return ok({
    submissions: all.map(toView),
    pending: all.filter((s) => s.status === "pending").length,
  });
}
