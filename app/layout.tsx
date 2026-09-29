import type { Metadata } from "next"
import { Geist_Mono, Inter, Instrument_Serif } from "next/font/google"

import "./globals.css"
import { ThemeProvider } from "@/components/theme-provider"
import { TooltipProvider } from "@/components/ui/tooltip"
import { ModeProvider } from "@/lib/mode"
import { BackendStatusProvider } from "@/lib/api"
import { cn } from "@/lib/utils"

const inter = Inter({ subsets: ["latin"], variable: "--font-inter" })
const instrument = Instrument_Serif({ subsets: ["latin"], weight: "400", style: ["normal", "italic"], variable: "--font-instrument" })
const mono = Geist_Mono({ subsets: ["latin"], variable: "--font-geist-mono" })

export const metadata: Metadata = {
  title: { default: "RAG LAB — from zero to hero", template: "%s · RAG LAB" },
  description: "An interactive lab that takes you from “what is RAG?” to agentic RAG, evaluation, security and a real support system.",
}

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" suppressHydrationWarning className={cn(inter.variable, instrument.variable, mono.variable)}>
      <body>
        <ThemeProvider defaultTheme="dark">
          <ModeProvider>
            <BackendStatusProvider>
              <TooltipProvider delay={150}>{children}</TooltipProvider>
            </BackendStatusProvider>
          </ModeProvider>
        </ThemeProvider>
      </body>
    </html>
  )
}
