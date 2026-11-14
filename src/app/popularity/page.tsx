import { PopularityPage } from "@/components/pages/popularity-page";
import { getDictionary } from "@/lib/i18n";
import { localizedAlternates } from "@/lib/i18n/meta";

export const dynamic = "force-dynamic";

export function generateMetadata() {
  const t = getDictionary("en");
  return { title: t.metaPopularityTitle, alternates: localizedAlternates("en", "/popularity") };
}

export default async function Page({ searchParams }: { searchParams: Promise<{ lens?: string }> }) {
  const { lens } = await searchParams;
  return <PopularityPage locale="en" lens={lens} />;
}
