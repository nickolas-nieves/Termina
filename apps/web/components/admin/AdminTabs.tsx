"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

export function AdminTabs({ pending }: { pending: number }) {
  const pathname = usePathname();
  const tabs = [
    { href: "/admin", label: "The set" },
    { href: "/admin/submissions", label: "Submissions", badge: pending },
    { href: "/admin/editor", label: "Editor" },
  ];
  return (
    <nav className="admin-tabs" aria-label="Admin sections">
      {tabs.map((t) => (
        <Link key={t.href} href={t.href} aria-current={pathname === t.href ? "page" : undefined}>
          {t.label}
          {t.badge ? <span className="badge">{t.badge}</span> : null}
        </Link>
      ))}
    </nav>
  );
}
