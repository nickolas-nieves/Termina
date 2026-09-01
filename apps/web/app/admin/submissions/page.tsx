import { redirect } from "next/navigation";
import { groupByCategory } from "@termina/glyph";
import { AdminTabs } from "@/components/admin/AdminTabs";
import { ReviewQueue } from "@/components/admin/ReviewQueue";
import { requireAdmin } from "@/lib/admin";
import { publishedIcons } from "@/lib/published";
import { listSubmissions, toView } from "@/lib/submissions";
import { mergedEntries } from "@/lib/working";

export const dynamic = "force-dynamic";

export default async function SubmissionsPage() {
  const session = await requireAdmin();
  if (!session) redirect("/admin/signin?next=%2Fadmin%2Fsubmissions");

  const [all, entries] = await Promise.all([listSubmissions(), mergedEntries()]);
  const pending = all.filter((s) => s.status === "pending").length;

  // Offer every category already in use, working set included, so accepting a
  // submission doesn't fork a near-duplicate category name.
  const categories = Array.from(groupByCategory(entries).keys()).filter((c) => c !== "Unfiled");

  return (
    <main>
      <div className="admin-shell" style={{ paddingBottom: 0 }}>
        <AdminTabs pending={pending} />
      </div>
      <ReviewQueue
        submissions={all.map(toView)}
        published={publishedIcons}
        categories={categories}
      />
    </main>
  );
}
