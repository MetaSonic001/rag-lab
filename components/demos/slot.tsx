"use client"

import { DEMOS } from "@/components/demos/registry"

export function DemoSlot({ name }: { name: string }) {
  const Demo = DEMOS[name]
  return Demo ? <Demo /> : null
}
