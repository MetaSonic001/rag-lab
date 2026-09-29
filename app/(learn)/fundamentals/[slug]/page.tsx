import { notFound } from "next/navigation"

import { FUNDAMENTALS } from "@/content/fundamentals"
import { ConceptView } from "@/components/kit/concept-view"

export function generateStaticParams() {
  return FUNDAMENTALS.map((c) => ({ slug: c.slug }))
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  return { title: FUNDAMENTALS.find((c) => c.slug === slug)?.title }
}

export default async function ConceptPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const concept = FUNDAMENTALS.find((c) => c.slug === slug)
  if (!concept) notFound()
  return <ConceptView c={concept} />
}
