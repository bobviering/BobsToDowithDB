'use client'

import { useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

const COOLDOWN_SECONDS = 30

export function LoginCard() {
  const supabase = useMemo(() => createClient(), [])
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')
  const [cooldownUntil, setCooldownUntil] = useState<number | null>(null)
  const [secondsLeft, setSecondsLeft] = useState(0)

  useEffect(() => {
    let mounted = true

    async function checkSession() {
      const {
        data: { session }
      } = await supabase.auth.getSession()

      if (mounted && session) {
        router.replace('/dashboard')
        router.refresh()
      }
    }

    checkSession()

    const rawCooldown = window.sessionStorage.getItem('todo-cloud-login-cooldown-until')
    if (rawCooldown) {
      const parsed = Number(rawCooldown)
      if (Number.isFinite(parsed) && parsed > Date.now()) {
        setCooldownUntil(parsed)
      } else {
        window.sessionStorage.removeItem('todo-cloud-login-cooldown-until')
      }
    }

    return () => {
      mounted = false
    }
  }, [router, supabase])

  useEffect(() => {
    if (!cooldownUntil) {
      setSecondsLeft(0)
      return
    }

    function updateCountdown() {
  if (cooldownUntil === null) {
    setSecondsLeft(0)
    return
  }

  const remainingMs = cooldownUntil - Date.now()

  if (remainingMs <= 0) {
    setCooldownUntil(null)
    setSecondsLeft(0)
    return
  }

  setSecondsLeft(Math.ceil(remainingMs / 1000))
}

      setSecondsLeft(Math.ceil(remainingMs / 1000))
    }

    updateCountdown()
    const timer = window.setInterval(updateCountdown, 1000)
    return () => window.clearInterval(timer)
  }, [cooldownUntil])

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()

    if (cooldownUntil && cooldownUntil > Date.now()) {
      setError(`Please wait ${secondsLeft || 1} more second${secondsLeft === 1 ? '' : 's'} before requesting another link.`)
      return
    }

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
      if (error.message.toLowerCase().includes('rate limit')) {
        setError('Too many email requests too quickly. Wait a bit, then try again once.')
      } else {
        setError(error.message)
      }
    } else {
      const nextCooldownUntil = Date.now() + COOLDOWN_SECONDS * 1000
      setCooldownUntil(nextCooldownUntil)
      window.sessionStorage.setItem('todo-cloud-login-cooldown-until', String(nextCooldownUntil))
      setMessage('Check your email for the magic link. Once you sign in, this browser should keep you signed in.')
      setEmail('')
    }

    setLoading(false)
  }

  const buttonDisabled = loading || secondsLeft > 0

  return (
    <div className="w-full max-w-md rounded-3xl border border-slate-200 bg-white p-8 shadow-soft">
      <div className="mb-6">
        <p className="text-sm font-semibold uppercase tracking-[0.2em] text-slate-500">Todo Cloud</p>
        <h1 className="mt-2 text-3xl font-bold text-slate-900">Sign in from anywhere</h1>
        <p className="mt-3 text-sm leading-6 text-slate-600">
          Enter your email && Supabase will send a magic link. After you sign in, we keep this browser signed in so you should not need frequent re-entry.
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
          disabled={buttonDisabled}
          className="w-full rounded-2xl bg-slate-900 px-4 py-3 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:bg-slate-400"
        >
          {loading ? 'Sending link…' : secondsLeft > 0 ? `Try again in ${secondsLeft}s` : 'Email me a magic link'}
        </button>
      </form>

      {message ? <p className="mt-4 rounded-2xl bg-emerald-50 px-4 py-3 text-sm text-emerald-700">{message}</p> : null}
      {error ? <p className="mt-4 rounded-2xl bg-rose-50 px-4 py-3 text-sm text-rose-700">{error}</p> : null}
    </div>
  )
}
