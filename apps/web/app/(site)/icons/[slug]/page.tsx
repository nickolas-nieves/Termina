import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { IconDetail } from "@/components/IconDetail";
import { SiteFooter } from "@/components/SiteFooter";
import { findIcon, publishedIcons } from "@/lib/published";

export const dynamic = "force-static";
export const dynamicParams = false;

export function generateStaticParams() {
  return publishedIcons.map((i) => ({ slug: i.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const icon = findIcon(slug);
  if (!icon) return { title: "Not found" };
  return {
    title: icon.name,
    description: `${icon.name} — a 13×13 pixel icon from the Termina set, free to download as SVG under the MIT license.`,
    alternates: { canonical: `/icons/${icon.slug}` },
  };
}

export default async function IconPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const icon = findIcon(slug);
  if (!icon) notFound();
  return (
    <main>
      <IconDetail icon={icon} />
      <SiteFooter />
    </main>
  );
}
