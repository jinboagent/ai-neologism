import { CriteriaPage } from "@/components/pages/criteria-page";
import { getDictionary } from "@/lib/i18n";
import { localizedAlternates } from "@/lib/i18n/meta";

export function generateMetadata() {
  const t = getDictionary("en");
  return {
    title: t.metaCriteriaTitle,
    description: t.metaCriteriaDesc,
    alternates: localizedAlternates("en", "/criteria"),
  };
}

export default function Page() {
  return <CriteriaPage locale="en" />;
}
