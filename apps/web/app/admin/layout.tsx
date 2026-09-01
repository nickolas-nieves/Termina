import type { Metadata } from "next";
import { AdminMasthead } from "@/components/admin/AdminMasthead";
import { requireAdmin } from "@/lib/admin";

export const metadata: Metadata = {
  title: "Admin",
  // The console is not content; keep it out of every index.
  robots: { index: false, follow: false, nocache: true },
};

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const session = await requireAdmin();
  return (
    <>
      <AdminMasthead login={session?.login ?? null} />
      {children}
    </>
  );
}
