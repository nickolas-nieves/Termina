import { Suspense } from "react";
import type { Metadata } from "next";
import { PublicEditor } from "@/components/editor/PublicEditor";
import { publishedIcons } from "@/lib/published";

export const metadata: Metadata = {
  title: "Editor",
  description:
    "Draw a 13×13 pixel icon, download it as SVG, or submit it to the Termina set. No account needed.",
};

export default function EditorPage() {
  return (
    // useSearchParams needs a suspense boundary for the static shell to
    // prerender; the editor is client-only past this point anyway.
    <Suspense fallback={<div className="studio" />}>
      <PublicEditor icons={publishedIcons} />
    </Suspense>
  );
}
