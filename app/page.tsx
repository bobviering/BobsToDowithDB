import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { LoginCard } from '@/components/login-card'

export default async function HomePage() {
  const supabase = createClient()
  const {
    data: { session }
  } = await supabase.auth.getSession()

  if (session) {
    redirect('/dashboard')
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-gradient-to-b from-slate-100 to-slate-200 p-6">
      <LoginCard />
    </main>
  )
}
