import { cookies } from "next/headers";
import { buildWordMetadata, WordPage } from "@/components/pages/word-page";
import { KEY_COOKIE } from "@/lib/keys";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const jar = await cookies();
  return buildWordMetadata(slug, "en", jar.get(KEY_COOKIE)?.value);
}

export default async function Page({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const jar = await cookies();
  return <WordPage slug={slug} locale="en" cookieKey={jar.get(KEY_COOKIE)?.value} />;
}
