'use client'

import { FormEvent, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase, supabaseConfigured } from '@/lib/supabase'

export default function Book() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [userId] = useState(() => {
    if (typeof window === 'undefined') return ''
    return new URLSearchParams(window.location.search).get('user_id') || ''
  })
  const [serviceId] = useState(() => {
    if (typeof window === 'undefined') return ''
    return new URLSearchParams(window.location.search).get('service_id') || ''
  })

  async function createBooking(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const formData = new FormData(event.currentTarget)
    const date = String(formData.get('date') || '')

    if (!userId || !serviceId) {
      alert('User or service not found. Please start from the intake page.')
      return
    }

    if (!supabaseConfigured || !supabase) {
      alert('Supabase is not configured. Please update your environment variables.')
      return
    }

    setLoading(true)
    try {
      const { data: booking, error } = await supabase
        .from('bookings')
        .insert([{ user_id: userId, service_id: serviceId, date, status: 'pending' }])
        .select()
        .single()

      if (error) throw error
      if (!booking?.id) throw new Error('Supabase returned no booking id')

      router.push(`/pay?booking_id=${encodeURIComponent(booking.id)}`)
    } catch (err) {
      console.error(err)
      alert('Something went wrong. Try again.')
    } finally {
      setLoading(false)
    }
  }

  if (!supabaseConfigured) {
    return (
      <main className="kx-shell">
        <section className="kx-card mx-auto mt-20 max-w-xl">
          <p className="kx-eyebrow">Configuration Required</p>
          <h1 className="mt-3 text-3xl">Supabase is not connected.</h1>
        </section>
      </main>
    )
  }

  return (
    <main className="kx-shell">
      <div className="kx-grid">
        <section className="kx-hero">
          <div>
            <p className="kx-eyebrow">Session Calendar</p>
            <h1 className="kx-title">Choose the day. Protect the momentum.</h1>
            <p className="kx-copy">
              Booking should feel calm and decisive. Pick a preferred date, then move straight
              to payment so the session is reserved with real commitment.
            </p>
          </div>
          <div className="kx-panel">
            <p className="kx-stat-label">Booking discipline</p>
            <p className="mt-2 text-2xl">No vague promises. A date, a payment, a next action.</p>
          </div>
        </section>

        <aside className="kx-card">
          <p className="kx-eyebrow">Reserve Session</p>
          <h2 className="mt-3 text-3xl leading-tight">Set your preferred session date.</h2>
          {!userId || !serviceId ? (
            <div className="kx-alert mt-7">
              Missing intake details. Return to the first page and select a service.
            </div>
          ) : (
            <form className="kx-form mt-7" onSubmit={createBooking}>
              <label className="kx-field">
                <span className="kx-label">Preferred Date</span>
                <input className="kx-input" type="date" name="date" required />
              </label>
              <button className="kx-button" type="submit" disabled={loading}>
                {loading ? 'Reserving...' : 'Continue to Payment'}
              </button>
            </form>
          )}
        </aside>
      </div>
    </main>
  )
}
