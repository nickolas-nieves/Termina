import { Landing } from "@/components/Landing";
import { Drawer } from "@/components/Drawer";
import { SiteFooter } from "@/components/SiteFooter";
import { publishedIcons } from "@/lib/published";

/* Fully static: the set is read from the repo at build time, so this page has
   no runtime data dependency and serves from the edge. */
export const dynamic = "force-static";

export default function HomePage() {
  return (
    <main>
      <Landing icons={publishedIcons} />
      <Drawer icons={publishedIcons} />
      <SiteFooter />
    </main>
  );
}
