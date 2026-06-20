'use client'

import { FormEvent, useEffect, useState, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { supabase, supabaseConfigured } from '@/lib/supabase'

function BookingForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const userId = searchParams.get('user_id') || ''
  const serviceId = searchParams.get('service_id') || ''
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (!userId || !serviceId) {
      router.push('/')
    }
  }, [userId, serviceId, router])

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

  if (!userId || !serviceId) {
    return (
      <div className="kx-alert mt-7">
        Redirecting to service selection...
      </div>
    )
  }

  return (
    <form className="kx-form mt-7" onSubmit={createBooking}>
      <label className="kx-field">
        <span className="kx-label">Preferred Date</span>
        <input className="kx-input" type="date" name="date" required />
      </label>
      <button className="kx-button" type="submit" disabled={loading}>
        {loading ? 'Reserving...' : 'Continue to Payment'}
      </button>
    </form>
  )
}

export default function Book() {
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
        </section>

        <aside className="kx-card">
          <p className="kx-eyebrow">Reserve Session</p>
          <h2 className="mt-3 text-3xl leading-tight">Set your preferred session date.</h2>
          <Suspense fallback={<div>Loading...</div>}>
            <BookingForm />
          </Suspense>
        </aside>
      </div>
    </main>
  )
}
