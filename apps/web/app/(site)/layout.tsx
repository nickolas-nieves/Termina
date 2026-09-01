import { Masthead } from "@/components/Masthead";
import { publishedIcons } from "@/lib/published";

export default function SiteLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <Masthead icons={publishedIcons} />
      {children}
    </>
  );
}
