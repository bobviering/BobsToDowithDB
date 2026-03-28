import './globals.css'
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Todo Cloud',
  description: 'Personal to-do list with Supabase login and cloud sync'
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  )
}
