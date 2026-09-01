import { destroySession } from "@/lib/session";
import { siteOrigin } from "@/lib/urls";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/** POST only: a GET would let any page log the admin out with an <img> tag. */
export async function POST(req: Request) {
  await destroySession();
  return Response.redirect(new URL("/admin/signin?signedout=1", siteOrigin(req)), 303);
}
