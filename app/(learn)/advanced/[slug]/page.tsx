import { notFound } from "next/navigation"

import { TECHNIQUES } from "@/content/advanced"
import { TechniqueView } from "@/components/advanced/technique-view"

export function generateStaticParams() {
  return TECHNIQUES.map((t) => ({ slug: t.slug }))
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  return { title: TECHNIQUES.find((t) => t.slug === slug)?.title }
}

export default async function TechniquePage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const t = TECHNIQUES.find((x) => x.slug === slug)
  if (!t) notFound()
  return <TechniqueView t={t} />
}
