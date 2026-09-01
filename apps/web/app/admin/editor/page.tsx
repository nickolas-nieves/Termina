import { Suspense } from "react";
import { redirect } from "next/navigation";
import { AdminEditor } from "@/components/admin/AdminEditor";
import { AdminTabs } from "@/components/admin/AdminTabs";
import { requireAdmin } from "@/lib/admin";
import { pendingCount } from "@/lib/submissions";
import { mergedEntries } from "@/lib/working";

export const dynamic = "force-dynamic";

export default async function AdminEditorPage() {
  const session = await requireAdmin();
  if (!session) redirect("/admin/signin?next=%2Fadmin%2Feditor");

  const [entries, pending] = await Promise.all([mergedEntries(), pendingCount()]);

  return (
    <main className="admin-editor-page">
      <div className="admin-shell" style={{ paddingBottom: 0 }}>
        <AdminTabs pending={pending} />
      </div>
      <Suspense fallback={<div className="studio" />}>
        <AdminEditor entries={entries} />
      </Suspense>
    </main>
  );
}
