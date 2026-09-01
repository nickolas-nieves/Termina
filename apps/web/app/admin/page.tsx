import { redirect } from "next/navigation";
import { AdminTabs } from "@/components/admin/AdminTabs";
import { SetManager } from "@/components/admin/SetManager";
import { requireAdmin } from "@/lib/admin";
import { pendingCount } from "@/lib/submissions";
import { mergedEntries } from "@/lib/working";

export const dynamic = "force-dynamic";

export default async function AdminHome() {
  const session = await requireAdmin();
  if (!session) redirect("/admin/signin?next=%2Fadmin");

  const [entries, pending] = await Promise.all([mergedEntries(), pendingCount()]);

  return (
    <main>
      <div className="admin-shell" style={{ paddingBottom: 0 }}>
        <AdminTabs pending={pending} />
      </div>
      <SetManager entries={entries} />
    </main>
  );
}
