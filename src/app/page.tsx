import { HomePage } from "@/components/pages/home-page";
import { localizedAlternates } from "@/lib/i18n/meta";

export const dynamic = "force-dynamic";

// The English edition owns the root. Localized siblings live in /[locale]/.
export function generateMetadata() {
  return { alternates: localizedAlternates("en", "/") };
}

export default function Page() {
  return <HomePage locale="en" />;
}
