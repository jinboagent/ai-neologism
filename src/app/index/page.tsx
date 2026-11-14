import { IndexPage } from "@/components/pages/index-page";
import { getDictionary } from "@/lib/i18n";
import { localizedAlternates } from "@/lib/i18n/meta";

export const dynamic = "force-dynamic";

export function generateMetadata() {
  const t = getDictionary("en");
  return { title: t.metaIndexTitle, alternates: localizedAlternates("en", "/index") };
}

export default function Page() {
  return <IndexPage locale="en" />;
}
