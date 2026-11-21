import { HomePage } from "@/components/pages/home-page";
import { localizedAlternates } from "@/lib/i18n/meta";

// ISR: the homepage's five aggregate queries each scan the whole published
// partition — caching the rendered page at the edge (5 min) is what keeps the
// Turso read bill flat under crawler traffic. Publishes bust it via
// revalidatePath("/", "layout") from the admin/community review routes.
export const revalidate = 300;

// The English edition owns the root. Localized siblings live in /[locale]/.
export function generateMetadata() {
  return { alternates: localizedAlternates("en", "/") };
}

export default function Page() {
  return <HomePage locale="en" />;
}
