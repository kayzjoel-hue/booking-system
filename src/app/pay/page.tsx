'use client'

import { useEffect, useState } from 'react'
import { loadStripe } from '@stripe/stripe-js'
import { Elements, PaymentElement, useStripe, useElements } from '@stripe/react-stripe-js'
import { useRouter } from 'next/navigation'
import { supabase, supabaseConfigured } from '@/lib/supabase'

const stripePublishableKey = process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY
const stripePromise = stripePublishableKey ? loadStripe(stripePublishableKey) : null

function CheckoutForm({ amount, bookingId }: { amount: number; bookingId: string }) {
  const stripe = useStripe()
  const elements = useElements()
  const router = useRouter()
  const [loading, setLoading] = useState(false)

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault()
    if (!stripe || !elements) return

    setLoading(true)
    try {
      const { error } = await stripe.confirmPayment({
        elements,
        confirmParams: {
          return_url: `${window.location.origin}/dashboard`,
        },
        redirect: 'if_required',
      })

      if (error) {
        alert(error.message)
        return
      }

      const { data: payment } = await supabase!
        .from('payments')
        .select('stripe_payment_id')
        .eq('booking_id', bookingId)
        .single()

      if (!payment?.stripe_payment_id) {
        alert('Payment was submitted, but verification could not find the payment record.')
        return
      }

      const response = await fetch('/api/verify-payment', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ stripe_payment_id: payment.stripe_payment_id }),
      })
      const result = await response.json()
      if (result.success) {
        router.push('/dashboard')
      } else {
        alert('Payment verification failed')
      }
    } catch (err) {
      console.error(err)
      alert('Something went wrong. Try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <form className="kx-form" onSubmit={handleSubmit}>
      <PaymentElement />
      <button className="kx-button" disabled={!stripe || loading}>
        {loading ? 'Processing...' : `Pay ${amount} AED`}
      </button>
    </form>
  )
}

export default function Pay() {
  const [bookingId] = useState(() => {
    if (typeof window === 'undefined') return ''
    return new URLSearchParams(window.location.search).get('booking_id') || ''
  })
  const [clientSecret, setClientSecret] = useState('')
  const [amount, setAmount] = useState(0)
  const [configError, setConfigError] = useState(() => {
    if (!stripePromise) return 'Stripe is not configured. Update NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY in .env.local.'
    if (!supabaseConfigured) return 'Supabase is not configured. Update NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY in .env.local.'
    if (typeof window !== 'undefined' && !new URLSearchParams(window.location.search).get('booking_id')) {
      return 'No booking found. Return to the intake page and book again.'
    }
    return ''
  })

  useEffect(() => {
    async function setupPayment(id: string) {
      if (!supabaseConfigured || !supabase) return

      const { data: booking } = await supabase
        .from('bookings')
        .select('*, services(*)')
        .eq('id', id)
        .single() || { data: null }

      if (!booking) {
        setConfigError('Booking not found. Return to the intake page and book again.')
        return
      }

      const service = Array.isArray(booking.services) ? booking.services[0] : booking.services
      const price = service?.price
      if (typeof price !== 'number') {
        setConfigError('Booking price could not be resolved.')
        return
      }

      setAmount(price)

      const response = await fetch('/api/payments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ booking_id: id }),
      })
      const { client_secret, error } = await response.json()
      if (!response.ok || !client_secret) {
        throw new Error(error || 'Unable to prepare payment.')
      }
      setClientSecret(client_secret)
    }

    if (!bookingId || !stripePromise || configError) return

    setupPayment(bookingId).catch((error) => {
      console.error(error)
      setConfigError(error instanceof Error ? error.message : 'Unable to prepare payment.')
    })
  }, [bookingId, configError])

  const options = {
    clientSecret,
    appearance: { theme: 'stripe' as const },
  }

  return (
    <main className="kx-shell">
      <div className="kx-grid">
        <section className="kx-hero">
          <div>
            <p className="kx-eyebrow">Secure Payment</p>
            <h1 className="kx-title">Commit the fee. Claim the session.</h1>
            <p className="kx-copy">
              The payment step keeps the booking serious, clean, and trackable. No handshake fog.
              Just a clear session moving into the calendar.
            </p>
          </div>
          <div className="kx-panel">
            <p className="kx-stat-label">Amount Due</p>
            <p className="mt-2 text-4xl">{amount || '--'} AED</p>
          </div>
        </section>

        <aside className="kx-card">
          <p className="kx-eyebrow">Checkout</p>
          <h2 className="mt-3 text-3xl leading-tight">Finish the booking.</h2>
          <div className="mt-7">
            {configError ? (
              <div className="kx-alert">{configError}</div>
            ) : clientSecret && stripePromise ? (
              <Elements options={options} stripe={stripePromise}>
                <CheckoutForm amount={amount} bookingId={bookingId} />
              </Elements>
            ) : (
              <p className="text-[var(--muted)]">Preparing payment...</p>
            )}
          </div>
        </aside>
      </div>
    </main>
  )
}
