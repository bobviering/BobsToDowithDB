'use client'

import { useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

const COOLDOWN_KEY = 'todo-cloud-login-cooldown-until'
const DEFAULT_COOLDOWN_SECONDS = 30
const RATE_LIMIT_COOLDOWN_SECONDS = 60

export function LoginCard() {
  const router = useRouter()
  const supabase = useMemo(() => createClient(), [])
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')
  const [secondsRemaining, setSecondsRemaining] = useState(0)
  const [checkingSession, setCheckingSession] = useState(true)

  useEffect(() => {
    let active = true

    async function checkSession() {
      const {
        data: { session }
      } = await supabase.auth.getSession()

      if (!active) return

      if (session) {
        router.replace('/dashboard')
        return
      }

      setCheckingSession(false)
    }

    checkSession()

    return () => {
      active = false
    }
  }, [router, supabase])

  useEffect(() => {
    function syncCooldown() {
      const storedUntil = Number(window.localStorage.getItem(COOLDOWN_KEY) || '0')
      if (!storedUntil || Number.isNaN(storedUntil)) {
        setSecondsRemaining(0)
        return
      }

      const remaining = Math.max(0, Math.ceil((storedUntil - Date.now()) / 1000))
      setSecondsRemaining(remaining)

      if (remaining === 0) {
        window.localStorage.removeItem(COOLDOWN_KEY)
      }
    }

    syncCooldown()
    const timer = window.setInterval(syncCooldown, 1000)

    return () => window.clearInterval(timer)
  }, [])

  function startCooldown(seconds: number) {
    const until = Date.now() + seconds * 1000
    window.localStorage.setItem(COOLDOWN_KEY, String(until))
    setSecondsRemaining(seconds)
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (loading || secondsRemaining > 0) return

    setLoading(true)
    setMessage('')
    setError('')

    const redirectTo = `${window.location.origin}/auth/callback`
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: {
        emailRedirectTo: redirectTo
      }
    })

    if (error) {
      const lower = error.message.toLowerCase()
      if (lower.includes('rate limit')) {
        startCooldown(RATE_LIMIT_COOLDOWN_SECONDS)
        setError('Too many email requests too quickly. Give it a minute, then try again.')
      } else {
        setError(error.message)
      }
    } else {
      startCooldown(DEFAULT_COOLDOWN_SECONDS)
      setMessage('Check your email for the magic link. This button will unlock again in a few seconds.')
      setEmail('')
    }

    setLoading(false)
  }

  const buttonLabel = loading
    ? 'Sending link…'
    : secondsRemaining > 0
      ? `Try again in ${secondsRemaining}s`
      : 'Email me a magic link'

  return (
    <div className="w-full max-w-md rounded-3xl border border-slate-200 bg-white p-8 shadow-soft">
      <div className="mb-6">
        <p className="text-sm font-semibold uppercase tracking-[0.2em] text-slate-500">Todo Cloud</p>
        <h1 className="mt-2 text-3xl font-bold text-slate-900">Sign in from anywhere</h1>
        <p className="mt-3 text-sm leading-6 text-slate-600">
          Enter your email and Supabase will send a magic link. No password mess.
        </p>
      </div>

      <form className="space-y-4" onSubmit={handleSubmit}>
        <label className="block">
          <span className="mb-2 block text-sm font-medium text-slate-700">Email address</span>
          <input
            type="email"
            required
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            placeholder="you@example.com"
            className="w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 outline-none transition focus:border-slate-500"
          />
        </label>

        <button
          type="submit"
          disabled={loading || secondsRemaining > 0 || checkingSession}
          className="w-full rounded-2xl bg-slate-900 px-4 py-3 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:bg-slate-400"
        >
          {checkingSession ? 'Checking session…' : buttonLabel}
        </button>
      </form>

      {message ? <p className="mt-4 rounded-2xl bg-emerald-50 px-4 py-3 text-sm text-emerald-700">{message}</p> : null}
      {error ? <p className="mt-4 rounded-2xl bg-rose-50 px-4 py-3 text-sm text-rose-700">{error}</p> : null}

      <p className="mt-4 text-xs leading-5 text-slate-500">
        Once a link is sent, the button pauses briefly so you do not trip Supabase&apos;s email rate limit while testing.
      </p>
    </div>
  )
}
