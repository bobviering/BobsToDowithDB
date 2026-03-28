'use client'

import { useEffect, useState } from 'react'
import type { Session } from '@supabase/supabase-js'
import { createClient } from '@/lib/supabase/client'
import LoginCard from '@/components/login-card'
import TaskDashboard from '@/components/task-dashboard'

export default function Home() {
  const supabase = createClient()
  const [session, setSession] = useState<Session | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let mounted = true

    async function loadSession() {
      const {
        data: { session },
      } = await supabase.auth.getSession()

      if (mounted) {
        setSession(session)
        setLoading(false)
      }
    }

    loadSession()

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session)
      setLoading(false)
    })

    return () => {
      mounted = false
      subscription.unsubscribe()
    }
  }, [supabase])

  if (loading) {
    return (
      <main className="min-h-screen bg-slate-50">
        <div className="mx-auto flex min-h-screen max-w-5xl items-center justify-center p-6">
          <div className="rounded-2xl bg-white px-6 py-5 shadow-sm ring-1 ring-slate-200">
            <p className="text-sm text-slate-600">Loading...</p>
          </div>
        </div>
      </main>
    )
  }

  if (!session) {
    return (
      <main className="min-h-screen bg-slate-50">
        <div className="mx-auto flex min-h-screen max-w-5xl items-center justify-center p-6">
          <div className="w-full max-w-md">
            <LoginCard />
          </div>
        </div>
      </main>
    )
  }

  return <TaskDashboard session={session} />
}
