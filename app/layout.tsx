import type React from "react"
import type { Metadata } from "next"
import { Inter } from "next/font/google"
import "./globals.css"
import { ThemeProvider } from "@/components/providers/theme-provider"
import { SupabaseAuthProvider } from "@/components/providers/supabase-auth-provider"
import { NotificationProvider } from "@/components/providers/notification-provider"

const inter = Inter({ subsets: ["latin"] })

export const metadata: Metadata = {
  title: "BIAIA - Pregnancy Support Platform",
  description: "A comprehensive support platform for pregnant individuals",
  generator: "v0.dev",
  icons: {
    icon: [{ url: "/favicon.png", type: "image/png" }],
  },
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={inter.className}>
        <ThemeProvider attribute="class" defaultTheme="light" enableSystem={false} disableTransitionOnChange>
          <SupabaseAuthProvider>
            <NotificationProvider>{children}</NotificationProvider>
          </SupabaseAuthProvider>
        </ThemeProvider>
      </body>
    </html>
  )
}
