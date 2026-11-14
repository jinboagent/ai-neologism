import { AboutPage } from "@/components/pages/about-page";
import { getDictionary } from "@/lib/i18n";
import { localizedAlternates } from "@/lib/i18n/meta";

export function generateMetadata() {
  const t = getDictionary("en");
  return { title: t.metaAboutTitle, alternates: localizedAlternates("en", "/about") };
}

export default function Page() {
  return <AboutPage locale="en" />;
}
