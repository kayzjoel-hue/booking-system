'use client'

import { useEffect, useState } from 'react'
import { loadStripe } from '@stripe/stripe-js'
import { Elements, PaymentElement, useStripe, useElements } from '@stripe/react-stripe-js'
import { supabase, supabaseConfigured } from '@/lib/supabase'
import { useRouter } from 'next/navigation'

const stripePromise = loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY!)

function CheckoutForm({ clientSecret, amount }: { clientSecret: string; amount: number }) {
  const stripe = useStripe()
  const elements = useElements()
  const router = useRouter()
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault()
    if (!stripe || !elements) return

    setLoading(true)
    try {
      const { error } = await stripe.confirmPayment({
        elements,
        confirmParams: {
          return_url: `${window.location.origin}/dashboard`,
        },
      })

      if (error) {
        alert(error.message)
      } else {
        // Verify payment
        const booking_id = localStorage.getItem('booking_id')
        const { data: payment } = await supabase!
          .from('payments')
          .select('stripe_payment_id')
          .eq('booking_id', booking_id)
          .single()

        if (payment) {
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
        }
      }
    } catch (err) {
      console.error(err)
      alert('Something went wrong. Try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit}>
      <PaymentElement />
      <button disabled={!stripe || loading} className="w-full bg-blue-500 text-white p-3 rounded mt-4 text-lg">
        {loading ? 'Processing...' : `Pay ${amount} AED`}
      </button>
    </form>
  )
}

export default function Pay() {
  const [clientSecret, setClientSecret] = useState('')
  const [amount, setAmount] = useState(0)
  const [configError, setConfigError] = useState('')

  useEffect(() => {
    async function setupPayment() {
      if (!supabaseConfigured) {
        setConfigError('Supabase is not configured. Update NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY in .env.local.')
        return
      }

      const booking_id = localStorage.getItem('booking_id')
      if (!booking_id) {
        alert('No booking found')
        return
      }

      // Get service price
      const { data: booking } = await supabase!
        .from('bookings')
        .select('*, services(*)')
        .eq('id', booking_id)
        .single() || { data: null }

      if (!booking) return

      const price = booking.services.price
      setAmount(price)

      // Create payment intent
      const response = await fetch('/api/payments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ booking_id, amount: price }),
      })
      const { client_secret } = await response.json()
      setClientSecret(client_secret)
    }
    setupPayment()
  }, [])

  const options = {
    clientSecret,
    appearance: { theme: 'stripe' as const },
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100">
      <div className="bg-white p-8 rounded shadow-md w-full max-w-md">
        <h1 className="text-2xl font-bold mb-4">Complete Payment</h1>
        {configError ? (
          <p className="text-red-600">{configError}</p>
        ) : clientSecret ? (
          <Elements options={options} stripe={stripePromise}>
            <CheckoutForm clientSecret={clientSecret} amount={amount} />
          </Elements>
        ) : (
          <p className="text-gray-700">Preparing payment...</p>
        )}
      </div>
    </div>
  )
}